"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "var(--primary)",
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        404
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        Sayfa Bulunamadı
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--text-muted)",
          maxWidth: 420,
          marginBottom: 28,
          lineHeight: 1.6,
        }}
      >
        Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn-primary">
          Ana Sayfaya Dön
        </Link>
        <Link href="/basvuru-takip" className="btn btn-outline">
          Başvuru Takip
        </Link>
      </div>
    </div>
  );
}
