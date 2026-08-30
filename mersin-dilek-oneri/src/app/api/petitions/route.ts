import { NextRequest, NextResponse } from "next/server";

import { getApplicantRoleTag } from "@/lib/applicant-tag";
import { getSessionFromRequest } from "@/lib/auth";
import { generateTrackingCode } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { verifyCaptcha } from "@/services/captcha-verification";
import { deliverEmail } from "@/services/email-delivery";
import {
  createEmailVerificationCode,
  createEmailVerificationToken,
} from "@/services/email-verification-token";
import { verifyIdentity } from "@/services/identity-verification";

import type {
  ApiErrorResponse,
  CreatePetitionRequest,
  CreatePetitionSuccessResponse,
} from "@/types/petition";

const MAX_FIRST_NAME_LENGTH = 100;
const MAX_LAST_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;
const MAX_CATEGORY_CODE_LENGTH = 50;
const MAX_TARGET_UNIT_CODE_LENGTH = 50;
const MAX_SUBJECT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10_000;
const MAX_PRIVACY_NOTICE_VERSION_LENGTH = 30;

const MIN_BIRTH_YEAR = 1900;

interface RequestInformation {
  ipAddress?: string;
  userAgent?: string;
}

function getRequestInformation(
  request: NextRequest
): RequestInformation {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    ipAddress:
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent:
      request.headers.get("user-agent") || undefined,
  };
}

function isValidEmail(email: string): boolean {
  return (
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isValidPhone(phone: string): boolean {
  if (phone.length > MAX_PHONE_LENGTH) {
    return false;
  }

  return /^[0-9+\s()-]+$/.test(phone);
}

function isValidTcKimlik(tcKimlik: string): boolean {
  return /^\d{11}$/.test(tcKimlik);
}

function isValidBirthYear(birthYear: number): boolean {
  const currentYear = new Date().getFullYear();

  return (
    Number.isInteger(birthYear) &&
    birthYear >= MIN_BIRTH_YEAR &&
    birthYear <= currentYear
  );
}

function isCreatePetitionRequest(
  body: unknown
): body is CreatePetitionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Partial<CreatePetitionRequest>;

  return (
    typeof value.identity === "object" &&
    value.identity !== null &&
    typeof value.identity.firstName === "string" &&
    typeof value.identity.lastName === "string" &&
    typeof value.identity.tcKimlik === "string" &&
    typeof value.identity.birthYear === "number" &&
    typeof value.email === "string" &&
    (value.phone === undefined ||
      typeof value.phone === "string") &&
    typeof value.category === "string" &&
    typeof value.targetUnitCode === "string" &&
    typeof value.subject === "string" &&
    typeof value.content === "string" &&
    typeof value.captchaToken === "string" &&
    typeof value.privacyNoticeVersion === "string" &&
    typeof value.privacyNoticeAcknowledged === "boolean"
  );
}

function createValidationError(
  error: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status: 400,
    }
  );
}

async function createUniqueTrackingCode(): Promise<string> {
  let trackingCode = generateTrackingCode();

  while (
    await prisma.petition.findUnique({
      where: {
        trackingCode,
      },
      select: {
        id: true,
      },
    })
  ) {
    trackingCode = generateTrackingCode();
  }

  return trackingCode;
}

const MAX_PAGE_SIZE = 50;

/**
 * Yetkili kurum personeli veya oturum açmış iç kullanıcılar
 * için başvuru listesini getirir.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: "Yetkisiz erişim.",
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") || String(MAX_PAGE_SIZE), 10);
  const take = Math.min(Math.max(limitParam, 1), MAX_PAGE_SIZE);

  try {
    if (session.type === "INTERNAL") {
      const internalUser = session.user;

      const petitions = await prisma.petition.findMany({
        where: {
          OR: [
            { internalUserId: internalUser.id },
            { applicantEmail: internalUser.email },
          ],
        },
        select: {
          id: true,
          trackingCode: true,
          applicantFirstName: true,
          applicantLastName: true,
          applicantRoleTag: true,
          category: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          status: true,
          priority: true,
          subject: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          targetUnit: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take,
      });

      return NextResponse.json({
        success: true,
        petitions,
      });
    }

    const staffUser = session.user;
    const isAdminStaff = staffUser.role === "ADMIN";
    const staffUnitId = staffUser.unitId ?? -1;

    const petitions = await prisma.petition.findMany({
      where: isAdminStaff
        ? {
            emailVerifiedAt: {
              not: null,
            },
            status: {
              not: "EMAIL_PENDING",
            },
          }
        : {
            OR: [
              { targetUnitId: staffUnitId },
              {
                supportRequests: {
                  some: {
                    status: "ACCEPTED",
                    supportUnitId: staffUnitId,
                  },
                },
              },
            ],
            emailVerifiedAt: {
              not: null,
            },
            status: {
              not: "EMAIL_PENDING",
            },
          },
      select: {
        id: true,
        trackingCode: true,
        applicantFirstName: true,
        applicantLastName: true,
        applicantRoleTag: true,
        category: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        status: true,
        priority: true,
        subject: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        targetUnit: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        ...(isAdminStaff
          ? {}
          : {
              supportRequests: {
                where: {
                  status: "ACCEPTED",
                  supportUnitId: staffUnitId,
                },
                select: { id: true },
              },
            }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });

    const serializedPetitions = petitions.map((petition) => {
      if (isAdminStaff || !("supportRequests" in petition)) {
        return petition;
      }
      const { supportRequests, ...rest } = petition;
      return {
        ...rest,
        isSupportAssignment: supportRequests.length > 0,
      };
    });

    return NextResponse.json({
      success: true,
      petitions: serializedPetitions,
    });
  } catch (error) {
    console.error(
      "Başvuru listesi alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Başvurular alınırken sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}

/**
 * Kullanıcı hesabı oluşturmadan yeni başvuru başlatır.
 */
export async function POST(request: NextRequest) {
  const requestInformation =
    getRequestInformation(request);

  try {
    const body: unknown = await request.json();

    if (!isCreatePetitionRequest(body)) {
      return createValidationError(
        "Başvuru bilgileri eksik veya geçersiz."
      );
    }

    const firstName = body.identity.firstName.trim();
    const lastName = body.identity.lastName.trim();
    const tcKimlik = body.identity.tcKimlik.trim();
    const birthYear = body.identity.birthYear;
    const email = body.email.trim().toLowerCase();
    const phone = body.phone?.trim() || undefined;
    const category = body.category
      .trim()
      .toUpperCase();
    const targetUnitCode = body.targetUnitCode
      .trim()
      .toUpperCase();
    const subject = body.subject.trim();
    const content = body.content.trim();
    const captchaToken = body.captchaToken.trim();
    const privacyNoticeVersion =
      body.privacyNoticeVersion.trim();

    if (!firstName) {
      return createValidationError(
        "Ad alanı boş bırakılamaz."
      );
    }

    if (firstName.length > MAX_FIRST_NAME_LENGTH) {
      return createValidationError(
        `Ad en fazla ${MAX_FIRST_NAME_LENGTH} karakter olabilir.`
      );
    }

    if (!lastName) {
      return createValidationError(
        "Soyad alanı boş bırakılamaz."
      );
    }

    if (lastName.length > MAX_LAST_NAME_LENGTH) {
      return createValidationError(
        `Soyad en fazla ${MAX_LAST_NAME_LENGTH} karakter olabilir.`
      );
    }

    if (!isValidTcKimlik(tcKimlik)) {
      return createValidationError(
        "T.C. kimlik numarası 11 rakamdan oluşmalıdır."
      );
    }

    if (!isValidBirthYear(birthYear)) {
      return createValidationError(
        `Doğum yılı ${MIN_BIRTH_YEAR} ile ${new Date().getFullYear()} arasında geçerli bir tam sayı olmalıdır.`
      );
    }

    if (!isValidEmail(email)) {
      return createValidationError(
        "Geçerli bir e-posta adresi girin."
      );
    }

    if (phone && !isValidPhone(phone)) {
      return createValidationError(
        `Telefon numarası geçersiz veya ${MAX_PHONE_LENGTH} karakterden uzun.`
      );
    }

    if (
      !category ||
      category.length > MAX_CATEGORY_CODE_LENGTH
    ) {
      return createValidationError(
        "Seçilen başvuru kategorisi geçersiz."
      );
    }

    if (
      !targetUnitCode ||
      targetUnitCode.length >
        MAX_TARGET_UNIT_CODE_LENGTH
    ) {
      return createValidationError(
        "Seçilen hedef birim kodu geçersiz."
      );
    }

    if (!subject) {
      return createValidationError(
        "Başvuru konusu boş bırakılamaz."
      );
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return createValidationError(
        `Başvuru konusu en fazla ${MAX_SUBJECT_LENGTH} karakter olabilir.`
      );
    }

    if (!content) {
      return createValidationError(
        "Başvuru içeriği boş bırakılamaz."
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return createValidationError(
        `Başvuru içeriği en fazla ${MAX_CONTENT_LENGTH} karakter olabilir.`
      );
    }

    if (!captchaToken) {
      return createValidationError(
        "Güvenlik doğrulaması tamamlanmalıdır."
      );
    }

    if (
      !privacyNoticeVersion ||
      privacyNoticeVersion.length >
        MAX_PRIVACY_NOTICE_VERSION_LENGTH
    ) {
      return createValidationError(
        "Aydınlatma metni sürüm bilgisi geçersiz."
      );
    }

    if (!body.privacyNoticeAcknowledged) {
      return createValidationError(
        "Kişisel verilerin işlenmesine ilişkin aydınlatma metni onaylanmalıdır."
      );
    }

    const selectedCategory =
      await prisma.category.findFirst({
        where: {
          code: category,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    if (!selectedCategory) {
      return createValidationError(
        "Seçilen başvuru kategorisi bulunamadı veya aktif değil."
      );
    }

    const targetUnit = await prisma.unit.findFirst({
      where: {
        code: targetUnitCode,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!targetUnit) {
      return createValidationError(
        "Seçilen hedef birim bulunamadı veya aktif değil."
      );
    }

    const captchaResult = await verifyCaptcha({
      token: captchaToken,
      remoteIp: requestInformation.ipAddress,
      expectedAction: "create_petition",
    });

    if (!captchaResult.success) {
      return createValidationError(
        captchaResult.message ||
          "Güvenlik doğrulaması başarısız."
      );
    }

    const identityResult = await verifyIdentity({
      firstName,
      lastName,
      tcKimlik,
      birthYear,
    });

    if (!identityResult.verified) {
      return createValidationError(
        identityResult.message ||
          "Kimlik bilgileri doğrulanamadı."
      );
    }

    const trackingCode =
      await createUniqueTrackingCode();

    const verificationToken =
      createEmailVerificationToken();

    const verificationCode =
      createEmailVerificationCode();

    const petition = await prisma.$transaction(
      async (transaction) => {
        const createdPetition =
          await transaction.petition.create({
            data: {
              trackingCode,
              applicantFirstName: firstName,
              applicantLastName: lastName,
              applicantEmail: email,
              applicantPhone: phone,
              identityVerifiedAt: new Date(),
              identityVerificationReference:
                identityResult.referenceId,
              botCheckVerifiedAt: new Date(),
              privacyNoticeVersion,
              privacyNoticeAcknowledgedAt:
                new Date(),
              categoryId: selectedCategory.id,
              targetUnitId: targetUnit.id,
              subject,
              content,
              status: "EMAIL_PENDING",
              priority: "NORMAL",
              applicantRoleTag: getApplicantRoleTag("CITIZEN"),
            },
            select: {
              id: true,
              trackingCode: true,
            },
          });

        await transaction.emailVerificationToken.create({
          data: {
            petitionId: createdPetition.id,
            tokenHash: verificationToken.tokenHash,
            expiresAt: verificationToken.expiresAt,
          },
        });

        await transaction.emailVerificationToken.create({
          data: {
            petitionId: createdPetition.id,
            tokenHash: verificationCode.codeHash,
            expiresAt: verificationCode.expiresAt,
          },
        });

        await transaction.petitionStatusHistory.create({
          data: {
            petitionId: createdPetition.id,
            fromStatus: null,
            toStatus: "EMAIL_PENDING",
            note:
              "Başvuru oluşturuldu ve e-posta doğrulaması bekleniyor.",
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: "APPLICANT",
            action: "CREATE",
            entityType: "PETITION",
            entityId: String(createdPetition.id),
            newValues: {
              trackingCode:
                createdPetition.trackingCode,
              categoryId: selectedCategory.id,
              categoryCode: selectedCategory.code,
              targetUnitId: targetUnit.id,
              status: "EMAIL_PENDING",
            },
            ipAddress:
              requestInformation.ipAddress,
            userAgent:
              requestInformation.userAgent,
            success: true,
          },
        });

        return createdPetition;
      }
    );

    const applicationUrl =
      process.env.APP_URL ||
      "http://localhost:3000";

    const verificationUrl =
      `${applicationUrl}/eposta-dogrula?token=` +
      encodeURIComponent(
        verificationToken.rawToken
      );

    const emailResult = await deliverEmail({
      to: email,
      subject:
        "Mersin Üniversitesi Başvuru E-posta Doğrulaması",
      text: [
        `Sayın ${firstName} ${lastName},`,
        "",
        "Başvurunuzu tamamlamak için doğrulama kodunuz:",
        "",
        `    ${verificationCode.rawCode}`,
        "",
        `Kodu başvuru sayfasında girerek e-posta adresinizi doğrulayabilir veya aşağıdaki bağlantıyı açabilirsiniz:`,
        verificationUrl,
        "",
        "Doğrulama kodu ve bağlantı 30 dakika süreyle geçerlidir.",
      ].join("\n"),
    });

    if (!emailResult.success) {
      /*
       * E-posta doğrulaması olmadan hiçbir başvuru
       * sistemde tutulmaz. Gönderim başarısızsa
       * oluşturulan taslak başvuru geri alınır.
       */
      await prisma.petition.delete({
        where: {
          id: petition.id,
          status: "EMAIL_PENDING",
        },
      });

      await prisma.auditLog.create({
        data: {
          actorType: "SYSTEM",
          action: "NOTIFY",
          entityType: "PETITION",
          entityId: String(petition.id),
          metadata: {
            notificationType:
              "EMAIL_VERIFICATION",
            rolledBack: true,
            reason: "EMAIL_DELIVERY_FAILED",
          },
          success: false,
          errorMessage:
            emailResult.error ||
            "E-posta gönderimi gerçekleştirilemediği için başvuru geri alındı.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Doğrulama e-postası gönderilemedi. Başvurunuz kaydedilmedi; lütfen e-posta adresinizi kontrol ederek yeniden deneyin.",
        },
        { status: 503 }
      );
    }

    await prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        action: "NOTIFY",
        entityType: "PETITION",
        entityId: String(petition.id),
        metadata: {
          notificationType:
            "EMAIL_VERIFICATION",
          provider: emailResult.provider,
        },
        success: true,
      },
    });

    const response: CreatePetitionSuccessResponse = {
      success: true,
      message:
        "Başvurunuz oluşturuldu. Devam etmek için e-posta adresinize gönderilen doğrulama kodunu girin.",
      verificationRequired: true,
      ...(process.env.NODE_ENV !== "production" ||
      emailResult.provider === "log"
        ? {
            developmentVerificationUrl:
              verificationUrl,
            developmentCode:
              verificationCode.rawCode,
          }
        : {}),
    };

    return NextResponse.json(response, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "Başvuru oluşturma hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    const response: ApiErrorResponse = {
      success: false,
      error:
        "Başvuru oluşturulurken sunucu hatası oluştu.",
    };

    return NextResponse.json(response, {
      status: 500,
    });
  }
}