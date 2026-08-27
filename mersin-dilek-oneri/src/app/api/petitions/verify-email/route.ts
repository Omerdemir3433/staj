import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  hashEmailVerificationToken,
  isEmailVerificationTokenExpired,
} from "@/services/email-verification-token";
import {
  VerificationConflictError,
  completePetitionEmailVerification,
} from "@/services/petition-email-verification";

interface VerifyEmailRequestBody {
  token?: unknown;
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

export async function POST(request: NextRequest) {
  const requestInformation =
    getRequestInformation(request);

  try {
    const body =
      (await request.json()) as VerifyEmailRequestBody;

    if (
      typeof body.token !== "string" ||
      !body.token.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulama bağlantısı eksik veya geçersiz.",
        },
        { status: 400 }
      );
    }

    const tokenHash = hashEmailVerificationToken(
      body.token
    );

    const tokenRecord =
      await prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          expiresAt: true,
          usedAt: true,
          petition: {
            select: {
              trackingCode: true,
              status: true,
              emailVerifiedAt: true,
            },
          },
        },
      });

    if (!tokenRecord) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulama bağlantısı geçersiz.",
        },
        { status: 400 }
      );
    }

    if (
      tokenRecord.petition.emailVerifiedAt &&
      tokenRecord.petition.status !== "EMAIL_PENDING"
    ) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message:
          "E-posta adresiniz daha önce doğrulanmış.",
        petition: {
          trackingCode:
            tokenRecord.petition.trackingCode,
          status: tokenRecord.petition.status,
        },
      });
    }

    if (tokenRecord.usedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu doğrulama bağlantısı daha önce kullanılmış.",
        },
        { status: 409 }
      );
    }

    if (
      isEmailVerificationTokenExpired(
        tokenRecord.expiresAt
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E-posta doğrulama bağlantısının süresi dolmuş.",
        },
        { status: 410 }
      );
    }

    if (
      tokenRecord.petition.status !== "EMAIL_PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Başvuru e-posta doğrulaması için uygun durumda değil.",
        },
        { status: 409 }
      );
    }

    const verifiedPetition =
      await completePetitionEmailVerification(
        tokenRecord.id,
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
    if (error instanceof VerificationConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    console.error(
      "E-posta doğrulama hatası:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "E-posta doğrulaması sırasında sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
