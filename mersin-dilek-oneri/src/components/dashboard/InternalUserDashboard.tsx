"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StatCard, LoadingPage, EmptyState, formatShortDate } from "./shared";
import { STATUS_LABELS, STATUS_CLASS } from "@/lib/dashboard-constants";

import type { InternalUser, InternalPetition } from "@/types/dashboard";

interface Props {
  title: string;
  detailBasePath: string;
  redirectPath: string;
}

export default function InternalUserDashboard({
  title,
  detailBasePath,
  redirectPath,
}: Props) {
  const router = useRouter();
  const [user, setUser] = useState<InternalUser | null>(null);
  const [petitions, setPetitions] = useState<InternalPetition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          router.push(redirectPath);
          return;
        }
        const data = await response.json();
        setUser(data.user);

        const petResponse = await fetch("/api/user/my-petitions", {
          credentials: "include",
          cache: "no-store",
        });
        if (petResponse.ok) {
          const petData = await petResponse.json();
          setPetitions(petData.petitions || []);
        }
      } catch {
        router.push(redirectPath);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, redirectPath]);

  const stats = useMemo(
    () => ({
      total: petitions.length,
      processing: petitions.filter((p) =>
        ["RECEIVED", "ASSIGNED", "IN_REVIEW", "FORWARDED"].includes(p.status)
      ).length,
      completed: petitions.filter((p) =>
        ["ANSWERED", "CLOSED"].includes(p.status)
      ).length,
    }),
    [petitions]
  );

  if (loading) {
    return <LoadingPage text="Panel yükleniyor..." />;
  }

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">{title}</h1>

        <div className="quick-actions">
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => router.push("/dashboard/basvuru-olustur")}
          >
            <span className="qa-icon">➕</span>
            <span className="qa-label">Yeni Başvuru</span>
          </button>
        </div>

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <StatCard icon="📄" value={stats.total} label="Toplam Başvuru" />
          <StatCard icon="🔄" value={stats.processing} label="İşlemde" />
          <StatCard icon="✅" value={stats.completed} label="Tamamlanan" />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              📄 Başvurularınız ({petitions.length})
            </span>
          </div>

          <div className="card-body">
            {petitions.length === 0 ? (
              <EmptyState text='Yeni bir başvuru oluşturmak için "Yeni Başvuru" butonunu kullanın.' />
            ) : (
              <div className="petition-list">
                {petitions.map((petition) => (
                  <article
                    key={petition.id}
                    className="petition-item"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/basvuru-takip?kod=${encodeURIComponent(petition.trackingCode)}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/basvuru-takip?kod=${encodeURIComponent(petition.trackingCode)}`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="petition-item-left">
                      <div className="petition-tracking">
                        {petition.trackingCode}
                      </div>
                      <div className="petition-subject">
                        {petition.subject}
                      </div>
                      <div className="petition-date">
                        {formatShortDate(petition.createdAt)}
                      </div>
                    </div>

                    <div className="petition-item-right">
                      <span
                        className={`status-badge ${
                          STATUS_CLASS[
                            petition.status as keyof typeof STATUS_CLASS
                          ] ?? "status-closed"
                        }`}
                      >
                        {STATUS_LABELS[
                          petition.status as keyof typeof STATUS_LABELS
                        ] ?? petition.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
