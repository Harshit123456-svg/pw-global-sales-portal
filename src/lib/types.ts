export interface StudentDetails {
  name: string;
  fatherName: string;
  grade: string;
  studentEmail: string; // The access will be given on this and cannot be changed later
  parentEmail: string;
  parentPhone: string;
  originCountry?: string; // Country of origin / nationality
  countryOfResidence?: string; // Mandatory in parent form
  city?: string; // Mandatory in parent form
  currentSchool?: string;
  mockTestScore?: string;
  targetScore?: string;
  targetExamMonth?: string;
  targetSchool?: string;
  photoUrl?: string; // Base64 or uploaded URL
}

export interface ProgramDetails {
  academicYear: string; // e.g. 2025-2026
  programSelection: '1-1' | 'Group';
  groupHours?: string; // '16 - English', '16 - Maths', 'Complete Course', etc.
  courseStartDate: string; // YYYY-MM-DD
  courseEndDate: string; // YYYY-MM-DD
  productEnrolled: string; // Full Batch Name from dropdown / uniform list
}

export interface SalesDetails {
  salesRepresentative: string; // Counsellor / Sale Representative Name
  counsellorEmail: string;
  counsellorPhone?: string;
  sourceOfLead: string; // e.g. Website, Instagram/Meta, Referral, etc. (HIDDEN from parent link)
  saleDate: string; // YYYY-MM-DD in IST
}

export interface PaymentDetails {
  coursePrice: number;
  soldPrice: number;
  discount: number; // Auto calculated
  discountPercent: number; // Auto calculated
  currency: string; // INR (₹), USD ($), AED, SAR, etc.
  fullAmountPaid: 'yes' | 'no';
  amountPaid: number;
  dueAmount: number;
  dueDate?: string; // Cannot be greater than 1 month from enrollment/sale date
  enrollmentDate: string; // YYYY-MM-DD in IST
  paymentMode?: string;
  transactionRef?: string;
}

export interface TermsAgreement {
  termsAccepted: boolean;
  parentLegalSignature: string; // Full legal name typed by parent
  signedAt?: string; // ISO timestamp
  signedAtIST?: string; // Formatted in IST
}

export interface AuditTrail {
  counsellorIp?: string;
  counsellorUserAgent?: string;
  counsellorCreatedAtIST?: string;
  parentSubmitIp?: string;
  parentSubmitUserAgent?: string;
  parentDeviceType?: string; // Mobile / Desktop / Tablet
  authenticityStatus: 'GENUINE_PARENT' | 'SAME_DEVICE_AS_COUNSELLOR' | 'COUNSELLOR_DIRECT' | 'PENDING_PARENT';
  authenticityBadge: string;
  auditNotes?: string;
}

export interface BookingRecord {
  id: string; // e.g. PWG-2026-XXXX
  token: string; // shareable token for parent link
  createdAt: string;
  createdAtIST?: string;
  updatedAt: string;
  updatedAtIST?: string;
  status: 'completed' | 'pending_parent_fill';
  fillMode: 'counsellor_direct' | 'parent_link';
  batchName: string; // Unified with productEnrolled
  sales: SalesDetails;
  program: ProgramDetails;
  payment: PaymentDetails;
  student: StudentDetails;
  terms: TermsAgreement;
  audit: AuditTrail;
  emailsSent: {
    student: boolean;
    parent: boolean;
    counsellor: boolean;
    support: boolean;
    timestamp?: string;
    timestampIST?: string;
    error?: string;
  };
  googleSheetSync?: {
    synced: boolean;
    timestamp?: string;
    timestampIST?: string;
    error?: string;
  };
  supportEmailRecipient: string;
}

export interface AppSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  supportEmail: string;
  googleSheetWebhookUrl: string;
  googleSheetId?: string;
}
