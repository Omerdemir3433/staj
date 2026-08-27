"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          fontSize: 48,
          marginBottom: 16,
        }}
      >
        ⚠️
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        Bir Hata Oluştu
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
        Beklenmeyen bir sorun meydana geldi. Lütfen tekrar deneyin.
      </p>

      <button
        type="button"
        onClick={() => reset()}
        className="btn btn-primary"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
