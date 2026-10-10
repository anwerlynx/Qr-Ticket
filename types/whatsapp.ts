export type WhatsAppDeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export interface WhatsAppDeliveryLog {
  id: string;
  attendeeId?: string;
  ticketId?: string;
  recipientPhone: string;
  recipientName: string;
  status: WhatsAppDeliveryStatus;
  templateName?: string;
  wamId?: string;
  errorMessage?: string;
  retryCount: number;
  mediaUrl?: string;
  payload?: any;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface WhatsAppConfigStatus {
  isConfigured: boolean;
  mode: "test" | "live";
  phoneNumberId?: string;
  hasAccessToken: boolean;
  businessAccountId?: string;
  testRecipientPhone?: string;
  webhookVerifyTokenConfigured: boolean;
  metaHealth?: {
    connected: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
    errorMessage?: string;
  };
}

export interface WhatsAppSendParams {
  recipientPhone: string;
  recipientName: string;
  attendeeId?: string;
  ticketId?: string;
  templateName?: string;
  languageCode?: string;
  pdfUrl?: string;
  qrCodeUrl?: string;
  eventDate?: string;
  venueName?: string;
}
