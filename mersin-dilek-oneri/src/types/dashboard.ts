export type StaffRole = "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";

export type PetitionStatus =
  | "EMAIL_PENDING"
  | "RECEIVED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "FORWARDED"
  | "ANSWERED"
  | "CLOSED"
  | "REJECTED";

export type PetitionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface PetitionCategory {
  id: number;
  code: string;
  name: string;
}

export interface StaffUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  unit: {
    id: number;
    code: string;
    name: string;
  } | null;
}

export interface Petition {
  id: number;
  trackingCode: string;
  applicantFirstName: string;
  applicantLastName: string;
  category: PetitionCategory;
  status: PetitionStatus;
  priority: PetitionPriority;
  subject: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targetUnit: {
    id: number;
    code: string;
    name: string;
  };
  assignedStaff: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  /** Oturum sahibinin birimi bu başvuruya destek birimi olarak atandıysa true. */
  isSupportAssignment?: boolean;
}

export interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
}

export interface MeResponse {
  success: boolean;
  user: StaffUser | null;
  error?: string;
}

export interface PetitionsResponse {
  success: boolean;
  petitions?: Petition[];
  error?: string;
}

export interface StaffResponse {
  success: boolean;
  unit: { id: number; code: string; name: string };
  staff: StaffMember[];
  error?: string;
}

export interface InternalUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface InternalPetition {
  id: number;
  trackingCode: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}
