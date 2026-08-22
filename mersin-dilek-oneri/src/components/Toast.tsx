"use client";

import { useEffect } from "react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "#ecfdf5", border: "#86efac", text: "#166534", icon: "✅" },
  error: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "❌" },
  info: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", icon: "ℹ️" },
};

export default function Toast({ message, type = "info", onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const style = TOAST_STYLES[type];

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 80,
        right: 20,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px",
        borderRadius: 10,
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        maxWidth: 420,
        animation: "toastSlideIn 0.25s ease",
      }}
    >
      <span>{style.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: style.text,
          cursor: "pointer",
          fontSize: 16,
          padding: 0,
          opacity: 0.6,
          lineHeight: 1,
        }}
        aria-label="Kapat"
      >
        ×
      </button>
    </div>
  );
}
