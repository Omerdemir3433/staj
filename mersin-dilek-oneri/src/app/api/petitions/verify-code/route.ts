import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  hashEmailVerificationToken,
  isEmailVerificationTokenExpired,
  isValidEmailVerificationCode,
} from "@/services/email-verification-token";
import {
  VerificationConflictError,
  completePetitionEmailVerification,
} from "@/services/petition-email-verification";

interface VerifyCodeRequestBody {
  email?: unknown;
  code?: unknown;
}

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
    email.length <= 255 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

const MAX_CODE_ATTEMPTS = 5;

export async function POST(
  request: NextRequest
) {
  const requestInformation =
    getRequestInformation(request);

  try {
    const body =
      (await request.json()) as VerifyCodeRequestBody;

    if (
      typeof body.email !== "string" ||
      typeof body.code !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta adresi ve doğrulama kodu zorunludur.",
        },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const code = body.code.trim();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçerli bir e-posta adresi girin.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmailVerificationCode(code)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Doğrulama kodu 6 haneli olmalıdır.",
        },
        { status: 400 }
      );
    }

    if (requestInformation.ipAddress) {
      const { limited } = checkRateLimit(
        `verify-code:${requestInformation.ipAddress}`
      );

      if (limited) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Çok fazla deneme yaptınız. Lütfen bir dakika sonra tekrar deneyin.",
          },
          { status: 429 }
        );
      }
    }

    const pendingPetition =
      await prisma.petition.findFirst({
        where: {
          applicantEmail: email,
          status: "EMAIL_PENDING",
          emailVerifiedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          emailVerifiedAt: true,
          verificationTokens: {
            where: {
              usedAt: null,
              expiresAt: {
                gt: new Date(),
              },
            },
            select: {
              id: true,
              tokenHash: true,
              attempts: true,
              expiresAt: true,
            },
          },
        },
      });

    /*
     * Bilgi sızmasını engellemek için kayıt olmaması
     * ile kodun hatalı olması aynı yanıtla döndürülür.
     */
    if (!pendingPetition) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Doğrulama kodu geçersiz veya süresi dolmuş.",
        },
        { status: 400 }
      );
    }

    if (
      pendingPetition.emailVerifiedAt &&
      pendingPetition.status !== "EMAIL_PENDING"
    ) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message:
          "E-posta adresiniz daha önce doğrulanmış.",
        petition: {
          trackingCode: "",
          status: pendingPetition.status,
        },
      });
    }

    const now = new Date();
    const codeHash =
      hashEmailVerificationToken(code);

    const matchedToken =
      pendingPetition.verificationTokens.find(
        (token) =>
          token.tokenHash === codeHash &&
          !isEmailVerificationTokenExpired(
            token.expiresAt,
            now
          )
      );

    if (!matchedToken) {
      /*
       * Kaba kuvvet koruması: başarısız her denemede
       * sayaç artırılır; eşik aşılırsa bekleyen doğrulamalar
       * iptal edilir.
       */
      const activeTokens =
        await prisma.emailVerificationToken.updateManyAndReturn(
          {
            where: {
              petitionId: pendingPetition.id,
              usedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              attempts: {
                increment: 1,
              },
            },
            select: {
              id: true,
              attempts: true,
            },
          }
        );

      const exhausted =
        activeTokens.filter(
          (token) =>
            token.attempts >= MAX_CODE_ATTEMPTS
        );

      if (exhausted.length > 0) {
        await prisma.emailVerificationToken.updateMany(
          {
            where: {
              id: {
                in: exhausted.map((token) => token.id),
              },
            },
            data: {
              usedAt: now,
            },
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            exhausted.length > 0
              ? `Çok fazla hatalı deneme yapıldı. Doğrulama kodunuz iptal edildi; lütfen yeni bir başvuru oluşturun.`
              : `Doğrulama kodu hatalı. Kalan deneme hakkınız: ${Math.max(
                  0,
                  MAX_CODE_ATTEMPTS -
                    (activeTokens[0]?.attempts ??
                      1)
                )}`,
        },
        { status: 400 }
      );
    }

    if (
      matchedToken.attempts >= MAX_CODE_ATTEMPTS
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Çok fazla hatalı deneme yapıldı. Doğrulama kodunuz iptal edildi; lütfen yeni bir başvuru oluşturun.",
        },
        { status: 429 }
      );
    }

    const verifiedPetition =
      await completePetitionEmailVerification(
        matchedToken.id,
        requestInformation
      );

    return NextResponse.json({
      success: true,
      alreadyVerified: false,
      message:
        "E-posta adresiniz doğrulandı. Başvurunuz başarıyla kuruma iletildi.",
      petition: {
        trackingCode:
          verifiedPetition.trackingCode,
        status: verifiedPetition.status,
      },
    });
  } catch (error) {
    if (
      error instanceof VerificationConflictError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    console.error(
      "Doğrulama kodu kontrol hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Doğrulama sırasında sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
