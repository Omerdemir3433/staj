import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function createNoStoreHeaders(): HeadersInit {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };
}

function parsePetitionId(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) return null;
  const petitionId = Number(normalizedValue);
  if (!Number.isSafeInteger(petitionId) || petitionId <= 0)
    return null;
  return petitionId;
}

async function verifyOwnership(
  petitionId: number,
  userEmail: string
): Promise<boolean> {
  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { applicantEmail: true },
  });
  if (!petition) return false;
  return petition.applicantEmail === userEmail;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const session = await getSessionFromRequest(request);

  if (!session || session.type !== "INTERNAL") {
    return NextResponse.json(
      { success: false, error: "Yetkisiz erişim." },
      { status: 401, headers: createNoStoreHeaders() }
    );
  }

  const { id } = await context.params;
  const petitionId = parsePetitionId(id);

  if (!petitionId) {
    return NextResponse.json(
      { success: false, error: "Geçersiz başvuru kimliği." },
      { status: 400, headers: createNoStoreHeaders() }
    );
  }

  if (
    !(await verifyOwnership(petitionId, session.user.email))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu başvuruya erişim yetkiniz yok.",
      },
      { status: 403, headers: createNoStoreHeaders() }
    );
  }

  try {
    const supportRequests =
      await prisma.supportRequest.findMany({
        where: { petitionId },
        select: {
          id: true,
          message: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          supportUnit: {
            select: { id: true, code: true, name: true },
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

    return NextResponse.json(
      { success: true, supportRequests },
      { status: 200, headers: createNoStoreHeaders() }
    );
  } catch (error) {
    console.error(
      "Destek talepleri alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );
    return NextResponse.json(
      {
        success: false,
        error:
          "Destek talepleri alınırken sunucu hatası oluştu.",
      },
      { status: 500, headers: createNoStoreHeaders() }
    );
  }
}
