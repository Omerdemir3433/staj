"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StatCard, LoadingPage, formatDate } from "./shared";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_CLASS,
  ROLE_LABELS,
} from "@/lib/dashboard-constants";

import type {
  StaffUser,
  Petition,
  StaffMember,
  MeResponse,
  PetitionsResponse,
  StaffResponse,
  PetitionStatus,
} from "@/types/dashboard";

interface Props {
  title: string;
  detailBasePath: string;
  requiredRole?: string;
  showStaffList?: boolean;
  showAdminActions?: boolean;
  showClaimButton?: boolean;
}

export default function StaffDashboard({
  title,
  detailBasePath,
  requiredRole,
  showStaffList = false,
  showAdminActions = false,
  showClaimButton = false,
}: Props) {
  const router = useRouter();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [petitionsLoading, setPetitionsLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<PetitionStatus | "ALL">(
    "ALL"
  );
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState("");

  const fetchPetitions = useCallback(async () => {
    setPetitionsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/petitions", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json()) as PetitionsResponse;

      if (response.status === 401 || response.status === 403) {
        router.replace("/giris");
        return;
      }

      if (!response.ok || !data.success || !data.petitions) {
        setError(data.error || "Başvurular alınamadı.");
        return;
      }

      setPetitions(data.petitions);
    } catch {
      setError("Başvurular yüklenirken sunucuya ulaşılamadı.");
    } finally {
      setPetitionsLoading(false);
    }
  }, [router]);

  const fetchStaff = useCallback(
    async (unitId: number) => {
      setStaffLoading(true);

      try {
        const response = await fetch(`/api/staff?unitId=${unitId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as StaffResponse;

        if (response.status === 401 || response.status === 403) {
          router.replace("/giris");
          return;
        }

        if (response.ok && data.success && data.staff) {
          setStaffList(data.staff);
        }
      } catch {
        // Staff loading failure is non-critical
      } finally {
        setStaffLoading(false);
      }
    },
    [router]
  );

  const handleClaim = useCallback(
    async (petitionId: number) => {
      setClaimingId(petitionId);
      setClaimError("");

      try {
        const response = await fetch(
          `/api/petitions/${petitionId}/claim`,
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as {
          success: boolean;
          error?: string;
        };

        if (response.status === 401 || response.status === 403) {
          router.replace("/giris");
          return;
        }

        if (!response.ok || !data.success) {
          setClaimError(
            data.error || "Görev üstlenilirken bir hata oluştu."
          );
          return;
        }

        await fetchPetitions();
      } catch {
        setClaimError("Görev üstlenilirken sunucuya ulaşılamadı.");
      } finally {
        setClaimingId(null);
      }
    },
    [fetchPetitions, router]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as MeResponse;

        if (!response.ok || !data.success || !data.user) {
          router.replace("/giris");
          return;
        }

        if (requiredRole && data.user.role !== requiredRole) {
          router.replace("/giris");
          return;
        }

        if (isMounted) {
          setUser(data.user);
        }

        await Promise.all([
          fetchPetitions(),
          showStaffList && data.user.unit
            ? fetchStaff(data.user.unit.id)
            : Promise.resolve(),
        ]);
      } catch {
        if (isMounted) {
          setError("Oturum bilgileri alınamadı. Lütfen tekrar giriş yapın.");
        }
      } finally {
        if (isMounted) {
          setSessionLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [fetchPetitions, fetchStaff, router, requiredRole, showStaffList]);

  const filteredPetitions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase("tr-TR");

    return petitions.filter((petition) => {
      const matchesStatus =
        statusFilter === "ALL" || petition.status === statusFilter;

      const searchableText = [
        petition.trackingCode,
        petition.applicantFirstName,
        petition.applicantLastName,
        petition.subject,
        petition.category.name,
        petition.targetUnit?.name,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [petitions, searchText, statusFilter]);

  const stats = useMemo(
    () => ({
      total: petitions.length,
      received: petitions.filter((p) => p.status === "RECEIVED").length,
      processing: petitions.filter((p) =>
        ["ASSIGNED", "IN_REVIEW", "FORWARDED"].includes(p.status)
      ).length,
      completed: petitions.filter((p) =>
        ["ANSWERED", "CLOSED"].includes(p.status)
      ).length,
      ...(showClaimButton
        ? {
            unassigned: petitions.filter(
              (p) =>
                p.assignedStaff === null &&
                p.status !== "CLOSED" &&
                p.status !== "REJECTED"
            ).length,
            myAssigned: petitions.filter(
              (p) =>
                p.assignedStaff !== null && p.assignedStaff.id === user?.id
            ).length,
          }
        : {}),
    }),
    [petitions, user, showClaimButton]
  );

  if (sessionLoading) {
    return <LoadingPage text="Panel yükleniyor..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">{title}</h1>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        {claimError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
            ⚠️ {claimError}
          </div>
        )}

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <StatCard icon="📥" value={stats.total} label="Toplam Başvuru" />
          {showClaimButton ? (
            <>
              <StatCard icon="📋" value={stats.unassigned ?? 0} label="Atanmamış" />
              <StatCard icon="👤" value={stats.myAssigned ?? 0} label="Benim Atandıklarım" />
            </>
          ) : (
            <>
              <StatCard icon="🆕" value={stats.received} label="Yeni Başvuru" />
              <StatCard icon="🔄" value={stats.processing} label="İşlemde" />
            </>
          )}
          <StatCard icon="✅" value={stats.completed} label="Tamamlanan" />
        </div>

        {showAdminActions && (
          <div className="quick-actions">
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => router.push("/dashboard/basvuru-olustur")}
            >
              <span className="qa-icon">➕</span>
              <span className="qa-label">Yeni Başvuru</span>
            </button>
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => router.push("/dashboard/birim-muduru/personel")}
            >
              <span className="qa-icon">👥</span>
              <span className="qa-label">Personel Yönetimi</span>
            </button>
          </div>
        )}

        {showStaffList && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">👥 Birim Personeli</span>
            </div>
            <div className="card-body">
              {staffLoading ? (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3, margin: "0 auto 12px" }} />
                  <p style={{ color: "var(--text-muted)" }}>Personel listesi yükleniyor...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 16px", color: "var(--text-muted)" }}>
                  Biriminizde personel bulunmuyor.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {staffList.map((staff) => (
                    <div
                      key={staff.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius)",
                        background: "var(--surface)",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: staff.role === "UNIT_MANAGER" ? "var(--warning-bg)" : "rgba(0, 48, 135, 0.08)",
                            color: staff.role === "UNIT_MANAGER" ? "var(--warning)" : "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                            {staff.email}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 12,
                          background: staff.role === "UNIT_MANAGER" ? "var(--warning-bg)" : "rgba(0, 48, 135, 0.08)",
                          color: staff.role === "UNIT_MANAGER" ? "var(--warning)" : "var(--primary)",
                        }}
                      >
                        {ROLE_LABELS[staff.role]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span className="card-title">📄 Başvurular</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={fetchPetitions}
              disabled={petitionsLoading}
            >
              {petitionsLoading ? "Yükleniyor..." : "Yenile"}
            </button>
          </div>

          <div className="card-body">
            <div className="dashboard-search-grid">
              <input
                type="search"
                className="form-control"
                placeholder="Takip kodu, ad soyad, konu veya birim ara..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <select
                className="form-control"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as PetitionStatus | "ALL")
                }
              >
                <option value="ALL">Tüm durumlar</option>
                {Object.entries(STATUS_LABELS)
                  .filter(([status]) => status !== "EMAIL_PENDING")
                  .map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>

            {petitionsLoading ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div className="spinner spinner-dark" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 14px" }} />
                <p style={{ color: "var(--text-muted)" }}>Başvurular yükleniyor...</p>
              </div>
            ) : filteredPetitions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Başvuru bulunamadı</h3>
                <p>Seçilen ölçütlere uygun bir başvuru bulunmuyor.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredPetitions.map((petition) => (
                  <PetitionCard
                    key={petition.id}
                    petition={petition}
                    isClaiming={claimingId === petition.id}
                    showClaimButton={showClaimButton}
                    onOpen={() => router.push(`${detailBasePath}/${petition.id}`)}
                    onClaim={() => handleClaim(petition.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PetitionCard({
  petition,
  isClaiming,
  showClaimButton,
  onOpen,
  onClaim,
}: {
  petition: Petition;
  isClaiming: boolean;
  showClaimButton: boolean;
  onOpen: () => void;
  onClaim: () => void;
}) {
  const isUnassigned =
    showClaimButton &&
    petition.assignedStaff === null &&
    petition.status !== "CLOSED" &&
    petition.status !== "REJECTED";

  return (
    <article
      className="petition-item"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      style={isUnassigned ? { borderLeft: "3px solid var(--warning, #d97706)" } : undefined}
    >
      <div className="petition-item-left">
        <p className="petition-tracking">{petition.trackingCode}</p>
        <h2 className="petition-subject">{petition.subject}</h2>
        <div className="petition-meta">
          <span className={`status-badge ${STATUS_CLASS[petition.status]}`}>
            {STATUS_LABELS[petition.status]}
          </span>
          <span className="cat-badge">{petition.category.name}</span>
          {petition.isSupportAssignment && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 12,
                background: "var(--warning-bg, #fef3c7)",
                color: "#92400e",
              }}
            >
              🤝 Destek Birimi
            </span>
          )}
          <span>
            {petition.applicantFirstName} {petition.applicantLastName}
          </span>
          <span>Öncelik: {PRIORITY_LABELS[petition.priority]}</span>
          {petition.assignedStaff && (
            <span>
              Atanan: {petition.assignedStaff.firstName}{" "}
              {petition.assignedStaff.lastName}
            </span>
          )}
        </div>
        <p className="petition-date">{formatDate(petition.createdAt)}</p>
      </div>
      <div
        className="petition-item-right"
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}
      >
        {isUnassigned && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isClaiming}
            onClick={(event) => {
              event.stopPropagation();
              onClaim();
            }}
            style={{ whiteSpace: "nowrap" }}
          >
            {isClaiming ? "Üstleniliyor..." : "🏷️ Görevi Üstlen"}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onOpen}>
          Detayı Aç →
        </button>
      </div>
    </article>
  );
}
