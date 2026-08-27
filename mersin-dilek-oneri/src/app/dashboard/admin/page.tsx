"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { LoadingPage, formatDate } from "@/components/dashboard/shared";
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_CLASS } from "@/lib/dashboard-constants";

import type { StaffUser, Petition } from "@/types/dashboard";

interface Unit {
  id: number;
  code: string;
  name: string;
  email: string;
  description: string | null;
  isActive: boolean;
}

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  unit: { id: number; code: string; name: string } | null;
  isActive: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const meRes = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!meRes.ok) {
        router.replace("/giris");
        return;
      }

      const meData = await meRes.json();

      if (!meData.success || !meData.user) {
        router.replace("/giris");
        return;
      }

      if (meData.user.role !== "ADMIN") {
        router.replace("/giris");
        return;
      }

      setUser(meData.user);

      const [unitsRes, staffRes, petitionsRes] = await Promise.all([
        fetch("/api/admin/units", { method: "GET", credentials: "include", cache: "no-store" }),
        fetch("/api/admin/staff", { method: "GET", credentials: "include", cache: "no-store" }),
        fetch("/api/petitions", { method: "GET", credentials: "include", cache: "no-store" }),
      ]);

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json();
        if (unitsData.success && unitsData.units) setUnits(unitsData.units);
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        if (staffData.success && staffData.staff) setStaff(staffData.staff);
      }
      if (petitionsRes.ok) {
        const petitionsData = await petitionsRes.json();
        if (petitionsData.success && petitionsData.petitions) setPetitions(petitionsData.petitions);
      }
    } catch {
      setError("Veriler yüklenirken sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingPage text="Yönetici paneli yükleniyor..." />;
  if (!user) return null;

  const activeUnits = units.filter((u) => u.isActive);
  const activeStaff = staff.filter((s) => s.isActive);
  const pendingPetitions = petitions.filter(
    (p) => p.status === "RECEIVED" || p.status === "ASSIGNED"
  );
  const recentPetitions = [...petitions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <h1 className="page-title">Yönetici Paneli</h1>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-value">{activeUnits.length}</div>
            <div className="stat-label">Toplam Birim</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{activeStaff.length}</div>
            <div className="stat-label">Toplam Personel</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-value">{petitions.length}</div>
            <div className="stat-label">Toplam Başvuru</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{pendingPetitions.length}</div>
            <div className="stat-label">Bekleyen Başvuru</div>
          </div>
        </div>

        <div className="quick-actions" style={{ marginBottom: 24 }}>
          <Link href="/dashboard/admin/categories" className="quick-action-btn">
            <span className="qa-icon">📂</span>
            <span className="qa-label">Kategori Yönetimi</span>
          </Link>
          <Link href="/dashboard/admin/units" className="quick-action-btn">
            <span className="qa-icon">🏢</span>
            <span className="qa-label">Birim Yönetimi</span>
          </Link>
          <Link href="/dashboard/admin/personel" className="quick-action-btn">
            <span className="qa-icon">👤</span>
            <span className="qa-label">Personel Yönetimi</span>
          </Link>
          <Link href="/dashboard/personel" className="quick-action-btn">
            <span className="qa-icon">📋</span>
            <span className="qa-label">Tüm Başvurular</span>
          </Link>
          <Link href="/dashboard/admin/destek" className="quick-action-btn">
            <span className="qa-icon">🛠️</span>
            <span className="qa-label">Destek Paneli</span>
          </Link>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Birimler</span>
            <Link href="/dashboard/admin/units" className="btn btn-outline btn-sm">
              Tümünü Gör
            </Link>
          </div>
          <div className="card-body">
            {activeUnits.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
                Henüz birim bulunmuyor.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {activeUnits.map((unit) => {
                  const unitStaffCount = activeStaff.filter((s) => s.unit?.id === unit.id).length;
                  const unitPetitionCount = petitions.filter((p) => p.targetUnit.id === unit.id).length;

                  return (
                    <Link
                      key={unit.id}
                      href={`/dashboard/admin/units/${unit.id}/personel`}
                      className="landing-card"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="landing-card-title" style={{ marginBottom: 8 }}>
                        {unit.name}
                      </div>
                      <div className="landing-card-desc" style={{ display: "flex", gap: 16, fontSize: 13 }}>
                        <span><strong>{unitStaffCount}</strong> personel</span>
                        <span><strong>{unitPetitionCount}</strong> başvuru</span>
                      </div>
                      <span className="landing-card-link">Yönet →</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Son Başvurular</span>
            <Link href="/dashboard/personel" className="btn btn-outline btn-sm">
              Tümünü Gör
            </Link>
          </div>
          <div className="card-body">
            {recentPetitions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
                Henüz başvuru bulunmuyor.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentPetitions.map((petition) => (
                  <article
                    key={petition.id}
                    className="petition-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/dashboard/personel/basvurular/${petition.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/dashboard/personel/basvurular/${petition.id}`);
                      }
                    }}
                  >
                    <div className="petition-item-left">
                      <p className="petition-tracking">{petition.trackingCode}</p>
                      <h2 className="petition-subject">{petition.subject}</h2>
                      <div className="petition-meta">
                        <span className="cat-badge">{petition.category.name}</span>
                        <span>
                          {petition.applicantFirstName} {petition.applicantLastName}
                        </span>
                        <span>{petition.targetUnit.name}</span>
                      </div>
                      <p className="petition-date">{formatDate(petition.createdAt)}</p>
                    </div>
                    <div className="petition-item-right">
                      <span className={`status-badge ${STATUS_CLASS[petition.status]}`}>
                        {STATUS_LABELS[petition.status]}
                      </span>
                      <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 12 }}>
                        {PRIORITY_LABELS[petition.priority]}
                      </p>
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
