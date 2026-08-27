"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import NewPetitionForm from "@/components/NewPetitionForm";

interface PetitionSuccessData {
  message: string;
  email: string;
  developmentVerificationUrl?: string;
  developmentCode?: string;
}

type CodeVerificationStatus =
  | "waiting"
  | "verifying"
  | "success"
  | "error";

export default function GuestPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successData, setSuccessData] =
    useState<PetitionSuccessData | null>(null);

  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] =
    useState<CodeVerificationStatus>("waiting");
  const [codeError, setCodeError] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const data = (await response.json()) as {
            success: boolean;
            user?: { id: number; role: string } | null;
          };

          if (data.success && data.user) {
            router.replace("/dashboard/basvuru-olustur");
            return;
          }
        }
      } catch {
        // oturum kontrolü başarısızsa misafir akışı gösterilir
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <div
        className="login-page"
        style={{
          alignItems: "flex-start",
          paddingTop: 120,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 640,
            margin: "0 auto",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            className="spinner"
            style={{
              width: 40,
              height: 40,
              margin: "0 auto 16px",
            }}
          />
          <p>Yönlendiriliyor...</p>
        </div>
      </div>
    );
  }

  function handleSuccess(payload: PetitionSuccessData) {
    setShowForm(false);
    setSuccessData(payload);
    setCode("");
    setCodeError("");
    setCodeStatus("waiting");
    setTrackingCode("");
  }

  function handleNewPetition() {
    setSuccessData(null);
    setShowForm(true);
  }

  async function handleVerifyCode() {
    if (!successData || !code.trim()) {
      return;
    }

    setCodeStatus("verifying");
    setCodeError("");

    try {
      const response = await fetch(
        "/api/petitions/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: successData.email,
            code: code.trim(),
          }),
        }
      );

      const data = (await response.json()) as {
        success: boolean;
        alreadyVerified?: boolean;
        message?: string;
        error?: string;
        petition?: {
          trackingCode: string;
          status: string;
        };
      };

      if (!response.ok || !data.success) {
        setCodeError(
          data.error ||
            "Doğrulama tamamlanamadı. Lütfen tekrar deneyin."
        );
        setCodeStatus("error");
        return;
      }

      setTrackingCode(
        data.petition?.trackingCode ?? ""
      );
      setCodeStatus("success");
    } catch {
      setCodeError(
        "Sunucuya ulaşılamadı. Lütfen tekrar deneyin."
      );
      setCodeStatus("error");
    }
  }

  function maskEmail(email: string): string {
    const [localPart, domain] = email.split("@");

    if (!localPart || !domain) {
      return email;
    }

    const visiblePart = localPart.slice(0, 2);

    return `${visiblePart}***@${domain}`;
  }

  return (
    <div
      className="login-page"
      style={{
        alignItems: "flex-start",
        paddingTop: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#fff",
            marginBottom: 32,
          }}
        >
          <img
            src="/uni_logo.gif"
            alt="Mersin Üniversitesi"
            style={{
              width: 72,
              height: 72,
              objectFit: "contain",
              margin: "0 auto 12px",
              display: "block",
            }}
          />

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Mersin Üniversitesi
          </h1>

          <p
            style={{
              opacity: 0.85,
              fontSize: 15,
            }}
          >
            Dilek, Öneri ve Başvuru Sistemi
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            {successData ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    marginBottom: 16,
                  }}
                >
                  {codeStatus === "success" ? "✅" : "✉️"}
                </div>

                {codeStatus === "success" ? (
                  <>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      E-posta Doğrulandı
                    </h2>

                    <p
                      style={{
                        color:
                          "var(--text-secondary)",
                        marginBottom: 20,
                        lineHeight: 1.7,
                      }}
                    >
                      Başvurunuz başarıyla kuruma
                      iletildi.
                    </p>

                    <div
                      style={{
                        background:
                          "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius:
                          "var(--radius-lg)",
                        padding: 18,
                        marginBottom: 24,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 8px",
                          color: "var(--text-muted)",
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform:
                            "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Başvuru Takip Kodunuz
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontFamily: "monospace",
                          fontSize: 22,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {trackingCode}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <a
                        href={`/basvuru-takip?kod=${encodeURIComponent(trackingCode)}`}
                        className="btn btn-primary"
                        style={{
                          textDecoration: "none",
                          display: "inline-flex",
                        }}
                      >
                        Başvurumu Takip Et
                      </a>

                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={
                          handleNewPetition
                        }
                      >
                        Yeni Başvuru Oluştur
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      E-posta Doğrulaması Gerekli
                    </h2>

                    <p
                      style={{
                        color:
                          "var(--text-secondary)",
                        marginBottom: 20,
                        lineHeight: 1.7,
                      }}
                    >
                      {successData.message}
                    </p>

                    <p
                      style={{
                        color:
                          "var(--text-secondary)",
                        marginBottom: 24,
                        lineHeight: 1.7,
                      }}
                    >
                      <strong>
                        {maskEmail(successData.email)}
                      </strong>{" "}
                      adresine gönderilen{" "}
                      <strong>6 haneli doğrulama kodunu</strong>{" "}
                      girin.
                    </p>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleVerifyCode();
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="______"
                        maxLength={6}
                        value={code}
                        onChange={(event) =>
                          setCode(
                            event.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                        disabled={
                          codeStatus === "verifying"
                        }
                        style={{
                          textAlign: "center",
                          fontFamily: "monospace",
                          fontSize: 28,
                          letterSpacing: "0.35em",
                          width: 220,
                          padding: "10px 8px",
                        }}
                      />

                      {codeError && (
                        <div
                          className="alert alert-error"
                          role="alert"
                          style={{
                            width: "100%",
                            marginBottom: 0,
                            textAlign: "left",
                          }}
                        >
                          ⚠️ {codeError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={
                          codeStatus ===
                            "verifying" ||
                          code.length !== 6
                        }
                      >
                        {codeStatus ===
                        "verifying"
                          ? "Doğrulanıyor..."
                          : "Doğrula"}
                      </button>
                    </form>

                    {successData.developmentCode && (
                      <p
                        style={{
                          marginTop: 16,
                          color:
                            "var(--text-muted)",
                          fontSize: 13,
                        }}
                      >
                        Geliştirme modu kodu:{" "}
                        <strong>
                          {
                            successData.developmentCode
                          }
                        </strong>
                      </p>
                    )}

                    {successData.developmentVerificationUrl && (
                      <a
                        href={
                          successData.developmentVerificationUrl
                        }
                        className="btn btn-outline"
                        style={{
                          display:
                            "inline-flex",
                          marginTop: 12,
                          textDecoration:
                            "none",
                        }}
                      >
                        Bağlantıyla Doğrula (Test)
                      </a>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: 24,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Mersin Üniversitesi&apos;ne kayıt
                  olmadan dilek, öneri, şikâyet,
                  talep veya bilgi edinme başvurusu
                  oluşturabilirsiniz.
                </p>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowForm(true)}
                >
                  📝 Başvuru Oluştur
                </button>

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop:
                      "1px solid var(--border)",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    Başvurunuzun tamamlanması için
                    e-posta adresinize gönderilen
                    doğrulama kodunu girmeniz
                    gerekir. Doğrulamadan sonra
                    başvurunuzu takip kodu ile
                    görüntüleyebilirsiniz.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <NewPetitionForm
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
