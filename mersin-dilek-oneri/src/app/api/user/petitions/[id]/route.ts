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

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
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

  try {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: {
        id: true,
        trackingCode: true,
        applicantFirstName: true,
        applicantLastName: true,
        applicantEmail: true,
        applicantPhone: true,
        emailVerifiedAt: true,
        category: {
          select: { id: true, code: true, name: true },
        },
        subject: true,
        content: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        targetUnit: {
          select: { id: true, code: true, name: true },
        },
        assignedStaff: {
          select: { id: true, firstName: true, lastName: true },
        },
        notes: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        responses: {
          select: {
            id: true,
            content: true,
            visibility: true,
            isFinal: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
          where: { visibility: "APPLICANT" },
        },
        supportRequests: {
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
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          select: {
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!petition) {
      return NextResponse.json(
        { success: false, error: "Başvuru bulunamadı." },
        { status: 404, headers: createNoStoreHeaders() }
      );
    }

    const isOwner =
      petition.applicantEmail === session.user.email;

    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu başvuruyu görüntüleme yetkiniz bulunmuyor.",
        },
        { status: 403, headers: createNoStoreHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, petition },
      { status: 200, headers: createNoStoreHeaders() }
    );
  } catch (error) {
    console.error(
      "Başvuru ayrıntısı alınamadı:",
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata"
    );
    return NextResponse.json(
      {
        success: false,
        error:
          "Başvuru ayrıntıları alınırken sunucu hatası oluştu.",
      },
      { status: 500, headers: createNoStoreHeaders() }
    );
  }
}
