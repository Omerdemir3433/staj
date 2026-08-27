import "server-only";

import { prisma } from "@/lib/prisma";
import { deliverEmail } from "@/services/email-delivery";

export class VerificationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationConflictError";
  }
}

export interface VerificationRequestInformation {
  ipAddress?: string;
  userAgent?: string;
}

export interface CompletedVerification {
  trackingCode: string;
  status: string;
  applicantEmail: string;
}

/**
 * Doğrulama tokenını eş zamanlı kullanıma karşı güvenli
 * biçimde tüketir ve başvuruyu kuruma iletildi olarak işaretler.
 *
 * Hem bağlantı (verify-email) hem kod (verify-code) akışı
 * bu servisi kullanır.
 */
export async function completePetitionEmailVerification(
  tokenId: number,
  requestInformation: VerificationRequestInformation
): Promise<CompletedVerification> {
  const now = new Date();

  const verifiedPetition =
    await prisma.$transaction(
      async (transaction) => {
        const claimedToken =
          await transaction.emailVerificationToken.updateMany(
            {
              where: {
                id: tokenId,
                usedAt: null,
                expiresAt: {
                  gt: now,
                },
              },
              data: {
                usedAt: now,
              },
            }
          );

        if (claimedToken.count !== 1) {
          throw new VerificationConflictError(
            "Doğrulama bilgisi kullanılmış veya süresi dolmuş."
          );
        }

        const tokenRecord =
          await transaction.emailVerificationToken.findUniqueOrThrow({
            where: { id: tokenId },
            select: { petitionId: true },
          });

        const updatedPetition =
          await transaction.petition.update({
            where: {
              id: tokenRecord.petitionId,
              status: "EMAIL_PENDING",
            },
            data: {
              emailVerifiedAt: now,
              status: "RECEIVED",
            },
            select: {
              id: true,
              trackingCode: true,
              status: true,
              applicantEmail: true,
              applicantFirstName: true,
              applicantLastName: true,
            },
          });

        await transaction.petitionStatusHistory.create(
          {
            data: {
              petitionId: updatedPetition.id,
              fromStatus: "EMAIL_PENDING",
              toStatus: "RECEIVED",
              note:
                "Başvuru sahibinin e-posta adresi doğrulandı ve başvuru kuruma iletildi.",
            },
          }
        );

        await transaction.auditLog.create({
          data: {
            actorType: "APPLICANT",
            action: "VERIFY",
            entityType: "PETITION",
            entityId: String(updatedPetition.id),
            oldValues: {
              status: "EMAIL_PENDING",
              emailVerified: false,
            },
            newValues: {
              status: "RECEIVED",
              emailVerified: true,
            },
            metadata: {
              verificationType: "EMAIL",
            },
            ipAddress:
              requestInformation.ipAddress,
            userAgent:
              requestInformation.userAgent,
            success: true,
          },
        });

        /*
         * Doğrulama sonrası bildirim kuyruğa eklenir
         * (yedek/audit amaçlı).
         */
        await transaction.notificationOutbox.create(
          {
            data: {
              petitionId: updatedPetition.id,
              type: "PETITION_RECEIVED",
              recipientEmail:
                updatedPetition.applicantEmail,
              subject:
                "Mersin Üniversitesi Başvurunuz Alındı",
              payload: {
                applicantName:
                  `${updatedPetition.applicantFirstName} ` +
                  updatedPetition.applicantLastName,
                trackingCode:
                  updatedPetition.trackingCode,
                status: "RECEIVED",
              },
              status: "PENDING",
              deduplicationKey:
                `petition-received:${updatedPetition.id}`,
            },
          }
        );

        return updatedPetition;
      }
    );

  const applicantName =
    `${verifiedPetition.applicantFirstName} ${verifiedPetition.applicantLastName}`;

  const emailResult = await deliverEmail({
    to: verifiedPetition.applicantEmail,
    subject:
      "Mersin Üniversitesi Başvurunuz Alındı",
    text: [
      `Sayın ${applicantName},`,
      "",
      "E-posta doğrulamanız tamamlandı ve başvurunuz kuruma iletildi.",
      "",
      `Başvuru takip kodunuz: ${verifiedPetition.trackingCode}`,
      "",
      "Takip kodunuzu güvenli bir yerde saklayın.",
      "Başvurunuzun güncel durumunu aşağıdaki adresten takip edebilirsiniz:",
      "",
      `${process.env.APP_URL || "http://localhost:3000"}/basvuru-takip`,
    ].join("\n"),
  });

  if (!emailResult.success) {
    console.error(
      "Bilgilendirme e-postası gönderilemedi:",
      emailResult.error
    );
  }

  await prisma.auditLog.create({
    data: {
      actorType: "SYSTEM",
      action: "NOTIFY",
      entityType: "PETITION",
      entityId: String(verifiedPetition.id),
      metadata: {
        notificationType: "PETITION_RECEIVED",
        provider: emailResult.provider,
        sentDirectly: true,
      },
      success: emailResult.success,
      errorMessage: emailResult.success
        ? undefined
        : emailResult.error ||
          "E-posta gönderilemedi.",
    },
  });

  return {
    trackingCode:
      verifiedPetition.trackingCode,
    status: verifiedPetition.status,
    applicantEmail:
      verifiedPetition.applicantEmail,
  };
}
