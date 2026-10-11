import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { TicketData, EmailDeliveryRecord, EmailSettings } from "@/types/ticket";
import { renderNextGenTicketEmailHtml } from "@/components/tickets/NextGenTicketEmail";
import { formatQRPayload, generateQRCodeBuffer } from "./qr";
import { getEventSettings } from "./event-settings";
import { recordEmailDelivery } from "./db";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase";

const SETTINGS_FILE = path.join(process.cwd(), "data", "email_settings.json");

const DEFAULT_SETTINGS: EmailSettings = {
  provider: "mock",
  fromName: "ملتقى الجيل القادم - Next Gen",
  fromEmail: process.env.RESEND_FROM_EMAIL || "info@primexagency.com",
  replyTo: "support@primexagency.com",
  enableRateLimiting: true,
  delayBetweenEmailsMs: 500,
};

let inMemoryEmailSettings: EmailSettings | null = null;
let lastSettingsFetchTime = 0;
const SETTINGS_CACHE_TTL = 2000;

/**
 * Loads configured email settings from Supabase database, disk, or environment variables
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  const now = Date.now();
  if (inMemoryEmailSettings && now - lastSettingsFetchTime < SETTINGS_CACHE_TTL) {
    return inMemoryEmailSettings;
  }

  // 1. Primary Source: Supabase public.email_settings
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase
          .from("email_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();

        if (!error && data) {
          const dbSettings: EmailSettings = {
            provider: (data.provider || "mock") as any,
            fromName: data.from_name || DEFAULT_SETTINGS.fromName,
            fromEmail: data.from_email || DEFAULT_SETTINGS.fromEmail,
            replyTo: data.reply_to || DEFAULT_SETTINGS.replyTo,
            smtpHost: data.smtp_host || undefined,
            smtpPort: data.smtp_port ? Number(data.smtp_port) : 465,
            smtpSecure: data.smtp_secure !== false,
            smtpUser: data.smtp_user || undefined,
            smtpPassword: data.smtp_password || undefined,
            resendApiKey: data.resend_api_key || undefined,
            resendFromEmail: data.resend_from_email || undefined,
            enableRateLimiting: data.enable_rate_limiting !== false,
            delayBetweenEmailsMs: data.delay_between_emails_ms ?? 500,
          };
          inMemoryEmailSettings = dbSettings;
          lastSettingsFetchTime = now;
          return dbSettings;
        }
      }
    } catch (err) {
      console.warn("Could not query Supabase email_settings, checking fallback:", err);
    }
  }

  // 2. Secondary Source: Local JSON disk
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const saved = JSON.parse(content) as EmailSettings;
      inMemoryEmailSettings = { ...DEFAULT_SETTINGS, ...saved };
      lastSettingsFetchTime = now;
      return inMemoryEmailSettings;
    }
  } catch (err) {
    // Read-only or file missing
  }

  // 3. Environment variables fallback
  if (process.env.RESEND_API_KEY) {
    return {
      ...DEFAULT_SETTINGS,
      provider: "resend",
      resendApiKey: process.env.RESEND_API_KEY,
      resendFromEmail: process.env.RESEND_FROM_EMAIL || "Next Gen Forum <onboarding@resend.dev>",
    };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      ...DEFAULT_SETTINGS,
      provider: "smtp",
      smtpHost: process.env.SMTP_HOST,
      smtpPort: Number(process.env.SMTP_PORT) || 465,
      smtpSecure: process.env.SMTP_SECURE !== "false",
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      fromName: process.env.SMTP_FROM_NAME || "ملتقى الجيل القادم - Next Gen",
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }

  return DEFAULT_SETTINGS;
}

/**
 * Checks whether an active email provider (Resend or SMTP) is configured
 */
export async function isEmailConfigured(): Promise<boolean> {
  const settings = await getEmailSettings();
  if (settings.provider === "resend" && (settings.resendApiKey || process.env.RESEND_API_KEY)) {
    return true;
  }
  if (settings.provider === "smtp" && settings.smtpHost && settings.smtpUser) {
    return true;
  }
  return false;
}

/**
 * Saves email settings to Supabase database (and disk/in-memory fallback)
 */
export async function saveEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
  const current = await getEmailSettings();
  const updated: EmailSettings = {
    ...current,
    ...settings,
  };
  inMemoryEmailSettings = updated;
  lastSettingsFetchTime = Date.now();

  // 1. Persist directly to Supabase PostgreSQL table: email_settings
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from("email_settings").upsert({
          id: "default",
          provider: updated.provider,
          from_name: updated.fromName || null,
          from_email: updated.fromEmail || null,
          reply_to: updated.replyTo || null,
          smtp_host: updated.smtpHost || null,
          smtp_port: updated.smtpPort ? Number(updated.smtpPort) : 465,
          smtp_secure: updated.smtpSecure !== false,
          smtp_user: updated.smtpUser || null,
          smtp_password: updated.smtpPassword || null,
          resend_api_key: updated.resendApiKey || null,
          resend_from_email: updated.resendFromEmail || null,
          enable_rate_limiting: updated.enableRateLimiting !== false,
          delay_between_emails_ms: updated.delayBetweenEmailsMs ? Number(updated.delayBetweenEmailsMs) : 500,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to save email settings in Supabase:", err);
    }
  }

  // 2. Local disk fallback
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    // Read-only filesystem on Vercel
  }

  return updated;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mockMode?: boolean;
  provider?: string;
}

/**
 * Generates an anti-spam plain-text fallback for email clients that do not render HTML.
 * Spam filters (Gmail, Microsoft 365, Yahoo) give higher inbox delivery scores to multipart/alternative emails.
 */
function generatePlainTextTicket(ticket: TicketData): string {
  return `
ملتقى الجيل القادم 2026 | NEXT GEN FORUM
==================================================
يا مرحب بيك: ${ticket.attendeeName}
أنت ضمن القائمة! تذكرتك جاهزة ومؤكدة.

تفاصيل الفعالية:
- التاريخ: ${ticket.eventDate} ${ticket.eventTime ? `• ${ticket.eventTime}` : ""}
- المكان: ${ticket.venueName}
- الفئة: ${ticket.category || "عامة"}
- رقم التذكرة: ${ticket.ticketNumber}
- رمز الدخول: ${ticket.secureCredential}

تعليمات الحضور:
- يرجى إبراز رمز التذكرة عند البوابة للتحقق الإلكتروني السريع.
- التذكرة صالحة لشخص واحد فقط ومحمية بتشفير ذري.

رابط التذكرة الرقمية:
${ticket.mapUrl ? `الخريطة: ${ticket.mapUrl}` : ""}

© 2026 Millala Inc. & Primex Agency
==================================================
`;
}

/**
 * Sends a single ticket email using the configured provider (Custom SMTP or Resend)
 * with anti-spam deliverability headers and multipart plain-text fallback.
 */
export async function sendTicketEmail(
  ticket: TicketData,
  options?: {
    recipientEmailOverride?: string;
    hostUrl?: string;
  }
): Promise<SendEmailResult> {
  const recipient = options?.recipientEmailOverride || ticket.attendeeEmail;
  if (!recipient) {
    return {
      success: false,
      error: "لا يوجد عنوان بريد إلكتروني مسجل للتذكرة",
    };
  }

  const settings = await getEmailSettings();
  const hostUrl = options?.hostUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Generate QR buffer for inline CID attachment
  const qrPayload = formatQRPayload(ticket.secureCredential, hostUrl);
  const qrBuffer = await generateQRCodeBuffer(qrPayload, { width: 300 });

  // Check for local 3D hero artwork
  const heroPath = path.join(process.cwd(), "public", "images", "ticket_hero_art1.png");
  const hasHeroPath = fs.existsSync(heroPath);

  const eventSettings = await getEventSettings();
  const html = await renderNextGenTicketEmailHtml(ticket, {
    hostUrl,
    qrImgSrc: "cid:ticket_qr_barcode",
    heroImgSrc: hasHeroPath ? "cid:ticket_hero_art" : `${hostUrl}/images/ticket_hero_art1.png`,
    eventSettings,
  });
  const text = generatePlainTextTicket(ticket);
  const subject = `تذكرتك الرسمية: ملتقى الجيل القادم 2026 - ${ticket.attendeeName} [${ticket.ticketNumber}]`;

  // 1. CUSTOM SMTP SENDER (Gmail App Password, Outlook, Custom Domain)
  if (settings.provider === "smtp" && settings.smtpHost && settings.smtpUser && settings.smtpPassword) {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort || 465,
        secure: settings.smtpSecure !== false, // default true for 465 SSL
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword,
        },
        tls: {
          rejectUnauthorized: false, // Prevents self-signed cert failures
        },
      });

      const fromAddress = `"${settings.fromName || "ملتقى الجيل القادم"}" <${settings.fromEmail || settings.smtpUser}>`;

      // Build inline attachments so barcode and hero art display 100% reliably in Gmail/Outlook
      // Note: In Nodemailer, specifying 'cid' automatically sets Content-Disposition: inline
      const mailAttachments: any[] = [
        {
          filename: `ticket-qr.png`,
          content: qrBuffer,
          cid: "ticket_qr_barcode",
          contentType: "image/png",
        },
      ];

      if (hasHeroPath) {
        mailAttachments.push({
          filename: "ticket-hero.png",
          path: heroPath,
          cid: "ticket_hero_art",
          contentType: "image/png",
        });
      }

      // Clean transactional headers (avoiding spoof-flagged headers on personal Gmail SMTP)
      const isPersonalGmail = (settings.fromEmail || settings.smtpUser || "").includes("@gmail.com");
      const mailHeaders: Record<string, string> = {
        "X-Entity-Ref-ID": `ticket-${ticket.id}`,
      };

      if (!isPersonalGmail && settings.replyTo) {
        mailHeaders["List-Unsubscribe"] = `<mailto:${settings.replyTo}?subject=unsubscribe>`;
      }

      const senderAddress = settings.fromEmail || settings.smtpUser;
      const effectiveReplyTo = isPersonalGmail
        ? senderAddress
        : (settings.replyTo || senderAddress);

      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        replyTo: effectiveReplyTo,
        subject,
        text,
        html,
        attachments: mailAttachments,
        headers: mailHeaders,
      });

      const log: EmailDeliveryRecord = {
        id: `elog-${Date.now()}-${ticket.id}`,
        attendeeId: ticket.attendeeId || ticket.id,
        ticketId: ticket.id,
        email: recipient,
        attendeeName: ticket.attendeeName,
        status: "delivered",
        providerMessageId: info.messageId,
        sentAt: new Date().toISOString(),
        retryCount: 0,
      };
      await recordEmailDelivery(log);

      return {
        success: true,
        messageId: info.messageId,
        provider: "smtp",
      };
    } catch (err: any) {
      console.error("SMTP sending error:", err);
      const log: EmailDeliveryRecord = {
        id: `elog-${Date.now()}-${ticket.id}`,
        attendeeId: ticket.attendeeId || ticket.id,
        ticketId: ticket.id,
        email: recipient,
        attendeeName: ticket.attendeeName,
        status: "failed",
        errorMessage: err.message,
        retryCount: 1,
      };
      await recordEmailDelivery(log);

      return {
        success: false,
        error: `خطأ SMTP: ${err.message}`,
        provider: "smtp",
      };
    }
  }

  // 2. RESEND PROVIDER
  if (settings.provider === "resend" && settings.resendApiKey && settings.resendApiKey.startsWith("re_")) {
    try {
      const resend = new Resend(settings.resendApiKey);
      const fromAddress = settings.resendFromEmail || "Next Gen Forum <onboarding@resend.dev>";

      const resendAttachments: any[] = [
        {
          filename: "ticket-qr.png",
          content: qrBuffer,
        },
      ];
      if (hasHeroPath) {
        resendAttachments.push({
          filename: "ticket-hero.png",
          content: fs.readFileSync(heroPath),
        });
      }

      const response = await resend.emails.send({
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text,
        attachments: resendAttachments,
        replyTo: settings.replyTo || undefined,
        headers: {
          "List-Unsubscribe": `<mailto:${settings.replyTo || "info@primexagency.com"}?subject=unsubscribe>`,
        },
      });

      if (response.error) {
        const log: EmailDeliveryRecord = {
          id: `elog-${Date.now()}-${ticket.id}`,
          attendeeId: ticket.attendeeId || ticket.id,
          ticketId: ticket.id,
          email: recipient,
          attendeeName: ticket.attendeeName,
          status: "failed",
          errorMessage: response.error.message,
          retryCount: 1,
        };
        await recordEmailDelivery(log);

        return {
          success: false,
          error: response.error.message,
          provider: "resend",
        };
      }

      const messageId = response.data?.id;
      const log: EmailDeliveryRecord = {
        id: `elog-${Date.now()}-${ticket.id}`,
        attendeeId: ticket.attendeeId || ticket.id,
        ticketId: ticket.id,
        email: recipient,
        attendeeName: ticket.attendeeName,
        status: "delivered",
        providerMessageId: messageId,
        sentAt: new Date().toISOString(),
        retryCount: 0,
      };
      await recordEmailDelivery(log);

      return {
        success: true,
        messageId,
        provider: "resend",
      };
    } catch (err: any) {
      const log: EmailDeliveryRecord = {
        id: `elog-${Date.now()}-${ticket.id}`,
        attendeeId: ticket.attendeeId || ticket.id,
        ticketId: ticket.id,
        email: recipient,
        attendeeName: ticket.attendeeName,
        status: "failed",
        errorMessage: err.message,
        retryCount: 1,
      };
      await recordEmailDelivery(log);

      return {
        success: false,
        error: `خطأ Resend: ${err.message}`,
        provider: "resend",
      };
    }
  }

  // 3. MOCK DEV MODE FALLBACK (When neither SMTP nor Resend are entered)
  const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const log: EmailDeliveryRecord = {
    id: `elog-${Date.now()}-${ticket.id}`,
    attendeeId: ticket.attendeeId || ticket.id,
    ticketId: ticket.id,
    email: recipient,
    attendeeName: ticket.attendeeName,
    status: "sent",
    providerMessageId: mockId,
    sentAt: new Date().toISOString(),
    retryCount: 0,
  };
  await recordEmailDelivery(log);

  return {
    success: true,
    messageId: mockId,
    mockMode: true,
    provider: "mock",
  };
}

/**
 * Tests connection with the current SMTP/Resend settings by sending
 * a REAL sample ticket with the full new Figma design and high-contrast Barcode QR
 */
export async function testEmailConnection(testRecipient: string): Promise<SendEmailResult> {
  const settings = await getEmailSettings();

  const testTicket: TicketData = {
    id: "test-ng-ticket-" + Date.now().toString(36),
    ticketNumber: "NG-TEST2026",
    secureCredential: "ngsec_test_" + Date.now().toString(16),
    attendeeName: "مشارك تجريبي (اختبار الاتصال)",
    attendeeEmail: testRecipient,
    category: "VIP",
    eventName: "ملتقى الجيل القادم | NEXT GEN",
    eventTagline: "#جيل_جديد_عالم_جديد",
    eventDate: "13 أكتوبر 2026",
    eventTime: "05:00 مساءً",
    venueName: "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
    venueAddress: "كفر الشيخ، جمهورية مصر العربية",
    mapUrl: "https://maps.google.com/?q=31.1107,30.9388",
    entryInstructions: [
      "يرجى إبراز هذا الرمز (QR Code) عند بوابة الدخول للتحقق.",
      "التذكرة مخصصة لشخص واحد فقط وغير قابلة لإعادة الاستخدام.",
    ],
    organizerName: "Primex Agency & Millala Inc.",
    contactEmail: "info@primexagency.com",
    contactPhone: "+20 100 000 0000",
    status: "valid",
    issuedAt: new Date().toISOString(),
  };

  // If mock mode, return success with mock indicator
  if (settings.provider === "mock") {
    return {
      success: true,
      mockMode: true,
      messageId: "mock_test_ticket_ok",
      provider: "mock",
    };
  }

  // Use sendTicketEmail to send the actual test ticket with barcode and 3D visual
  return await sendTicketEmail(testTicket, { recipientEmailOverride: testRecipient });
}
