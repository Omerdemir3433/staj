"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";

type PetitionStatus =
  | "EMAIL_PENDING"
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "FORWARDED"
  | "ANSWERED"
  | "CLOSED"
  | "REJECTED";

type PetitionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface PetitionResponse {
  id: number;
  content: string;
  visibility: "INTERNAL" | "APPLICANT";
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface StatusHistoryItem {
  fromStatus: PetitionStatus | null;
  toStatus: PetitionStatus;
  createdAt: string;
}

interface PetitionDetail {
  id: number;
  trackingCode: string;
  applicantFirstName: string;
  applicantLastName: string;
  applicantEmail?: string;
  applicantPhone?: string | null;
  category: { id: number; code: string; name: string };
  status: PetitionStatus;
  priority: PetitionPriority;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt?: string | null;
  targetUnit: { id: number; code: string; name: string };
  assignedStaff: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  responses: PetitionResponse[];
  statusHistory: StatusHistoryItem[];
}

interface PetitionDetailResponse {
  success: boolean;
  petition?: PetitionDetail;
  error?: string;
}

interface MeResponse {
  success: boolean;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  error?: string;
}

const STATUS_LABELS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "E-posta Bekleniyor",
  RECEIVED: "Başvuru Alındı",
  ASSIGNED: "Personele Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

const PRIORITY_LABELS: Record<PetitionPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AkademikBasvuruDetayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const petitionId = params.id;

  const [petition, setPetition] =
    useState<PetitionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  function showToast(
    message: string,
    type: "success" | "error" | "info" = "info"
  ) {
    setToast({ message, type });
  }

  const loadPetition = useCallback(async () => {
    if (!petitionId) return;

    try {
      setLoading(true);
      setError("");

      const authRes = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const authData: MeResponse = await authRes.json();

      if (
        !authRes.ok ||
        !authData.success ||
        !authData.user
      ) {
        router.replace("/ogrenci-akademisyen-giris");
        return;
      }

      const response = await fetch(
        `/api/user/petitions/${petitionId}`,
        { credentials: "include", cache: "no-store" }
      );

      const data: PetitionDetailResponse =
        await response.json();

      if (!data.success || !data.petition) {
        setError(
          data.error || "Başvuru yüklenemedi."
        );
        return;
      }

      setPetition(data.petition);
    } catch {
      setError(
        "Başvuru yüklenirken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }, [petitionId, router]);

  useEffect(() => {
    void loadPetition();
  }, [loadPetition]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Başvuru bilgileri yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (error && !petition) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!petition) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Başvuru bulunamadı.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/akademik")
            }
            className="mb-3 text-sm font-semibold text-blue-700 hover:underline"
          >
            &larr; Panele Dön
          </button>

          <p className="text-sm font-semibold text-blue-700">
            Başvuru Detayı
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            {petition.subject}
          </h1>

          <p className="mt-2 font-mono text-sm text-slate-500">
            {petition.trackingCode}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-950 uppercase tracking-wide">
                Başvuru Belgesi
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Takip Kodu
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {petition.trackingCode}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Kategori
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {petition.category.name}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Hedef Birim
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {petition.targetUnit.name}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Oluşturulma
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(petition.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Son Güncelleme
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(petition.updatedAt)}
                  </p>
                </div>
                {petition.assignedStaff && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Atanan Personel
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {petition.assignedStaff.firstName}{" "}
                      {petition.assignedStaff.lastName}
                    </p>
                  </div>
                )}
              </div>

              <div className="py-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Konu
                </p>
                <p className="text-base font-bold text-slate-950">
                  {petition.subject}
                </p>
              </div>

              <div className="py-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Başvuru İçeriği
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {petition.content}
                </p>
              </div>
            </div>
          </section>

          {petition.statusHistory &&
            petition.statusHistory.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950 uppercase tracking-wide">
                  Başvuru Hareketleri
                </h2>

                <div className="mt-6 space-y-5">
                  {petition.statusHistory.map(
                    (item, index) => (
                      <div
                        key={`${item.toStatus}-${item.createdAt}-${index}`}
                        className="relative flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-3 w-3 rounded-full bg-red-700" />

                          {index <
                          petition.statusHistory.length -
                            1 ? (
                            <span className="mt-2 h-full min-h-10 w-px bg-slate-200" />
                          ) : null}
                        </div>

                        <div className="pb-4">
                          <p className="font-semibold text-slate-950">
                            {
                              STATUS_LABELS[
                                item.toStatus
                              ]
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(
                              item.createdAt
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

          {petition.responses &&
            petition.responses.length > 0 && (
              <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
                <h2 className="text-xl font-semibold text-green-950">
                  Müdürlükten Yanıtlar
                </h2>

                <div className="mt-4 space-y-4">
                  {petition.responses.map((resp) => (
                    <div
                      key={resp.id}
                      className="rounded-xl border border-green-200 bg-white p-4"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {resp.content}
                      </p>

                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          {resp.author.firstName}{" "}
                          {resp.author.lastName}
                        </span>
                        <span>
                          {formatShortDate(
                            resp.createdAt
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Güncel Durum
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Durum
                </p>

                <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  {
                    STATUS_LABELS[
                      petition.status
                    ]
                  }
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Öncelik
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {
                    PRIORITY_LABELS[
                      petition.priority
                    ]
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Atanan Personel
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {petition.assignedStaff
                    ? `${petition.assignedStaff.firstName} ${petition.assignedStaff.lastName}`
                    : "Henüz atanmadı"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kategori
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {petition.category.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hedef Birim
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {petition.targetUnit.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Oluşturulma
                </p>

                <p className="mt-2 text-sm text-slate-700">
                  {formatDate(petition.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Son Güncelleme
                </p>

                <p className="mt-2 text-sm text-slate-700">
                  {formatDate(petition.updatedAt)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              İletişim
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Başvurunuzla ilgili sorularınız için
              ilgili birimle iletişime geçebilirsiniz.
            </p>
          </section>
        </aside>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
