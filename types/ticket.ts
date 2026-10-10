export type TicketStatus = "valid" | "used" | "revoked";

export type TicketCategory = "General" | "VIP" | "Speaker" | "Organizer" | "Media";

export interface TicketData {
  id: string; // e.g. "ng-2026-001"
  ticketNumber: string; // e.g. "NG-7K4P9X2M" or "A125"
  secureCredential: string; // Cryptographic secure token encoded in QR (not private info)
  attendeeId?: string; // Relation to attendee record
  
  // Attendee Info
  attendeeName: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  category?: TicketCategory;
  
  // Event Details (matching approved Figma information)
  eventName: string; // "ملتقى الجيل القادم | NEXT GEN"
  eventTagline?: string; // "#جيل_جديد_عالم_جديد"
  eventDate: string; // "13 أكتوبر 2026"
  eventTime?: string; // "05:00 مساءً"
  venueName: string; // "المسرح المدرسي كفر الشيخ ، القوات المسلحه"
  venueAddress?: string;
  mapUrl?: string; // Google Maps link
  
  // Instructions & Policy (Replacing Lorem Ipsum)
  entryInstructions?: string[];
  organizerName?: string; // "Primex Agency & Millala Inc."
  contactEmail?: string;
  contactPhone?: string;
  
  // Greeting & Description customization
  greetingTitle?: string;
  greetingSubtitle?: string;
  greetingDescription?: string;

  // Social Links customization
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  showFacebook?: boolean;
  showTwitter?: boolean;
  showInstagram?: boolean;
  copyrightText?: string;

  // Check-in state
  status: TicketStatus;
  issuedAt: string;
  checkedInAt?: string;
  checkInStation?: string;
  checkInNotes?: string;
}

export interface EventTicketSettings {
  eventName: string;
  eventTagline?: string;
  eventDate: string;
  eventTime?: string;
  venueName: string;
  venueAddress?: string;
  mapUrl?: string;
  greetingTitle?: string;
  greetingSubtitle?: string;
  greetingDescription?: string;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  showFacebook?: boolean;
  showTwitter?: boolean;
  showInstagram?: boolean;
  organizerName?: string;
  copyrightText?: string;
}

export type ApprovalStatus = "accepted" | "pending" | "rejected";

export interface AttendeeRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  registrationId?: string;
  category?: TicketCategory;
  registeredAt?: string;
  ticketId?: string;
  ticketNumber?: string;
  hasTicket: boolean;
  status: "registered" | "ticket_issued" | "checked_in";
  approvalStatus?: ApprovalStatus; // "accepted" (مقبول) | "pending" (قيد المراجعة) | "rejected" (مرفوض)
  job?: string; // الوظيفة
  city?: string; // العنوان / المحافظة
  whatsapp?: string; // رقم الواتساب
  faculty?: string; // اسم الجهه / الكلية
  referralSource?: string; // عرفت الايفنت منين
  timestamp?: string; // طابع زمني
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ImportColumnMapping {
  nameColumn: string;
  emailColumn: string;
  phoneColumn?: string;
  registrationIdColumn?: string;
  categoryColumn?: string;
  jobColumn?: string;
  cityColumn?: string;
  whatsappColumn?: string;
  facultyColumn?: string;
  referralColumn?: string;
  approvalStatusColumn?: string;
}

export interface ImportValidationRecord {
  rowNumber: number;
  name: string;
  email: string;
  phone?: string;
  registrationId?: string;
  category?: TicketCategory;
  job?: string;
  city?: string;
  whatsapp?: string;
  faculty?: string;
  referralSource?: string;
  timestamp?: string;
  approvalStatus?: ApprovalStatus;
  customFields?: Record<string, any>;
}

export interface ImportValidationResult {
  totalRows: number;
  validCount: number;
  duplicateInFileCount: number;
  existingInDbCount: number;
  invalidCount: number;
  validRecords: ImportValidationRecord[];
  duplicateInFileRecords: Array<{ rowNumber: number; email: string; name: string }>;
  existingInDbRecords: Array<{ rowNumber: number; email: string; name: string; existingId: string }>;
  invalidRecords: Array<{ rowNumber: number; rowData: any; errors: string[] }>;
}

export interface BulkIssuanceResult {
  totalEligible: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  tickets: TicketData[];
  failedRecords: Array<{ attendeeId: string; name: string; error: string }>;
}

export type EmailDeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "bounced";

export interface EmailSettings {
  provider: "smtp" | "resend" | "mock";
  // Custom SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  // Resend
  resendApiKey?: string;
  resendFromEmail?: string;
  // Anti-spam flags
  enableRateLimiting?: boolean;
  delayBetweenEmailsMs?: number;
}

export interface EmailDeliveryRecord {
  id: string;
  attendeeId: string;
  ticketId: string;
  email: string;
  attendeeName: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  retryCount: number;
}

export interface EmailCampaignSummary {
  totalQueued: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  logs: EmailDeliveryRecord[];
}

export interface DashboardStats {
  totalRegistered: number;
  issuedTickets: number;
  pendingTickets: number;
  sentEmails: number;
  deliveredEmails: number;
  failedEmails: number;
  checkedInCount: number;
  notCheckedInCount: number;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  status: TicketStatus | "not_found";
  ticket?: TicketData;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
}
