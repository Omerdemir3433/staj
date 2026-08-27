import type { PetitionStatus, PetitionPriority } from "@/types/dashboard";

export const STATUS_LABELS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "E-posta Bekleniyor",
  RECEIVED: "Alındı",
  ASSIGNED: "Atandı",
  IN_REVIEW: "İnceleniyor",
  FORWARDED: "Yönlendirildi",
  ANSWERED: "Cevaplandı",
  CLOSED: "Kapatıldı",
  REJECTED: "Reddedildi",
};

export const PRIORITY_LABELS: Record<PetitionPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const STATUS_CLASS: Record<PetitionStatus, string> = {
  EMAIL_PENDING: "status-email-pending",
  RECEIVED: "status-received",
  ASSIGNED: "status-assigned",
  IN_REVIEW: "status-in-review",
  FORWARDED: "status-forwarded",
  ANSWERED: "status-answered",
  CLOSED: "status-closed",
  REJECTED: "status-rejected",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Sistem Yöneticisi",
  UNIT_MANAGER: "Birim Yöneticisi",
  UNIT_STAFF: "Birim Personeli",
};
