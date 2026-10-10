import fs from "fs";
import path from "path";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase";
import {
  WhatsAppConfigStatus,
  WhatsAppDeliveryLog,
  WhatsAppSendParams,
} from "@/types/whatsapp";

const DATA_DIR = path.join(process.cwd(), "data");
const WA_LOGS_FILE = path.join(DATA_DIR, "whatsapp_logs.json");

function ensureLogsFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(WA_LOGS_FILE)) {
      fs.writeFileSync(WA_LOGS_FILE, JSON.stringify([], null, 2), "utf8");
    }
  } catch {}
}

function readLogsFromDisk(): WhatsAppDeliveryLog[] {
  ensureLogsFile();
  try {
    if (fs.existsSync(WA_LOGS_FILE)) {
      const raw = fs.readFileSync(WA_LOGS_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function writeLogsToDisk(logs: WhatsAppDeliveryLog[]) {
  try {
    ensureLogsFile();
    fs.writeFileSync(WA_LOGS_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch {}
}

export function getWhatsAppEnv() {
  return {
    mode: (process.env.WHATSAPP_MODE || "test") as "test" | "live",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || "",
    testRecipientPhone: process.env.WHATSAPP_TEST_RECIPIENT_PHONE?.trim() || "",
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "nextgen_wa_verify_2026",
  };
}

/**
 * Check Meta WhatsApp Cloud API credentials and connectivity
 */
export async function getWhatsAppStatus(): Promise<WhatsAppConfigStatus> {
  const env = getWhatsAppEnv();
  const isConfigured = Boolean(env.phoneNumberId && env.accessToken);

  const status: WhatsAppConfigStatus = {
    isConfigured,
    mode: env.mode,
    phoneNumberId: env.phoneNumberId || undefined,
    hasAccessToken: Boolean(env.accessToken),
    businessAccountId: env.businessAccountId || undefined,
    testRecipientPhone: env.testRecipientPhone || undefined,
    webhookVerifyTokenConfigured: Boolean(env.webhookVerifyToken),
  };

  if (!isConfigured) {
    return status;
  }

  // Ping Meta Graph API to verify live token and phone number ID
  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${env.phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${env.accessToken}`,
        },
      }
    );

    const metaData = await metaRes.json();

    if (metaRes.ok && metaData.id) {
      status.metaHealth = {
        connected: true,
        displayPhoneNumber: metaData.display_phone_number,
        verifiedName: metaData.verified_name,
        qualityRating: metaData.quality_rating,
      };
    } else {
      status.metaHealth = {
        connected: false,
        errorMessage: metaData.error?.message || "فشل الاتصال بـ Meta Graph API",
      };
    }
  } catch (err: any) {
    status.metaHealth = {
      connected: false,
      errorMessage: err.message || "خطأ أثناء الاتصال بالخادم",
    };
  }

  return status;
}

/**
 * Log a WhatsApp delivery action in Supabase with local fallback
 */
export async function recordWhatsAppLog(log: WhatsAppDeliveryLog): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const row = {
        id: log.id,
        attendee_id: log.attendeeId || null,
        ticket_id: log.ticketId || null,
        recipient_phone: log.recipientPhone,
        recipient_name: log.recipientName,
        status: log.status,
        template_name: log.templateName || null,
        wam_id: log.wamId || null,
        error_message: log.errorMessage || null,
        retry_count: log.retryCount,
        media_url: log.mediaUrl || null,
        payload: log.payload || {},
        sent_at: log.sentAt || null,
        delivered_at: log.deliveredAt || null,
        read_at: log.readAt || null,
        created_at: log.createdAt,
      };

      const { error } = await supabase.from("whatsapp_logs").upsert(row, { onConflict: "id" });
      if (!error) return;
    } catch {}
  }

  // Fallback to disk
  const logs = readLogsFromDisk();
  const existingIdx = logs.findIndex((l) => l.id === log.id || (log.wamId && l.wamId === log.wamId));
  if (existingIdx >= 0) {
    logs[existingIdx] = { ...logs[existingIdx], ...log };
  } else {
    logs.unshift(log);
  }
  writeLogsToDisk(logs.slice(0, 500));
}

/**
 * Retrieve delivery logs from Supabase or disk
 */
export async function getWhatsAppLogs(): Promise<WhatsAppDeliveryLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          attendeeId: r.attendee_id,
          ticketId: r.ticket_id,
          recipientPhone: r.recipient_phone,
          recipientName: r.recipient_name,
          status: r.status,
          templateName: r.template_name,
          wamId: r.wam_id,
          errorMessage: r.error_message,
          retryCount: r.retry_count || 0,
          mediaUrl: r.media_url,
          payload: r.payload,
          sentAt: r.sent_at,
          deliveredAt: r.delivered_at,
          readAt: r.read_at,
          createdAt: r.created_at,
        }));
      }
    } catch {}
  }

  return readLogsFromDisk();
}

/**
 * Send template message or test message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(
  params: WhatsAppSendParams
): Promise<{ success: boolean; wamId?: string; error?: string }> {
  const env = getWhatsAppEnv();

  if (!env.phoneNumberId || !env.accessToken) {
    return {
      success: false,
      error: "Meta WhatsApp Cloud API credentials are not configured in .env.local",
    };
  }

  // Clean phone number (remove spaces, symbols)
  let cleanPhone = params.recipientPhone.replace(/[\s\-\(\)]/g, "");
  if (!cleanPhone.startsWith("+")) {
    if (cleanPhone.startsWith("01")) {
      cleanPhone = "+2" + cleanPhone; // Egypt default format
    } else {
      cleanPhone = "+" + cleanPhone;
    }
  }
  const toPhone = cleanPhone.replace("+", "");

  // Safe Guardrail for Test Mode:
  if (env.mode === "test") {
    if (env.testRecipientPhone) {
      const allowedTestPhone = env.testRecipientPhone.replace(/[\s\+\-\(\)]/g, "");
      if (toPhone !== allowedTestPhone) {
        return {
          success: false,
          error: `[وضع الاختبار نشط] في وضع الاختبار، يُسمح بالإرسال فقط إلى الرقم المسجل في ميتا: ${env.testRecipientPhone}. يرجى تبديل WHATSAPP_MODE=live للإرسال لجميع الحضور.`,
        };
      }
    }
  }

  const logId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  try {
    let payloadBody: any;

    if (params.pdfUrl) {
      // Send PDF ticket document
      payloadBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "document",
        document: {
          link: params.pdfUrl,
          caption: `مرحباً ${params.recipientName}، تذكرتك لـ ملتقى الجيل القادم 2026 جاهزة! يرجى إبراز الباركود عند الدخول.`,
          filename: `NextGen-Ticket-${params.recipientName}.pdf`,
        },
      };
    } else {
      // Standard template message (e.g. 'hello_world' default for test accounts)
      const templateName = params.templateName || "hello_world";
      const languageCode = params.languageCode || "en_US";

      payloadBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${env.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      }
    );

    const metaData = await metaRes.json();

    if (metaRes.ok && metaData.messages && metaData.messages.length > 0) {
      const wamId = metaData.messages[0].id;
      await recordWhatsAppLog({
        id: logId,
        attendeeId: params.attendeeId,
        ticketId: params.ticketId,
        recipientPhone: cleanPhone,
        recipientName: params.recipientName,
        status: "sent",
        templateName: params.templateName || "hello_world",
        wamId,
        retryCount: 0,
        mediaUrl: params.pdfUrl,
        sentAt: now,
        createdAt: now,
      });

      return { success: true, wamId };
    } else {
      const errorMsg =
        metaData.error?.message ||
        metaData.error?.error_user_msg ||
        "فشل إرسال الرسالة عبر Meta Cloud API";

      await recordWhatsAppLog({
        id: logId,
        attendeeId: params.attendeeId,
        ticketId: params.ticketId,
        recipientPhone: cleanPhone,
        recipientName: params.recipientName,
        status: "failed",
        errorMessage: errorMsg,
        retryCount: 0,
        createdAt: now,
      });

      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    const errorMsg = err.message || "Network error sending WhatsApp message";
    await recordWhatsAppLog({
      id: logId,
      attendeeId: params.attendeeId,
      ticketId: params.ticketId,
      recipientPhone: cleanPhone,
      recipientName: params.recipientName,
      status: "failed",
      errorMessage: errorMsg,
      retryCount: 0,
      createdAt: now,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Handle incoming Meta webhook statuses (delivered, read, failed)
 */
export async function updateWebhookStatus(statusUpdate: {
  wamId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipientPhone?: string;
  errorMessage?: string;
}) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const updateData: any = {
        status: statusUpdate.status,
      };
      if (statusUpdate.status === "delivered") {
        updateData.delivered_at = new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString();
      }
      if (statusUpdate.status === "read") {
        updateData.read_at = new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString();
      }
      if (statusUpdate.errorMessage) {
        updateData.error_message = statusUpdate.errorMessage;
      }

      await supabase
        .from("whatsapp_logs")
        .update(updateData)
        .eq("wam_id", statusUpdate.wamId);
    } catch {}
  }

  // Update in local file
  const logs = readLogsFromDisk();
  const item = logs.find((l) => l.wamId === statusUpdate.wamId);
  if (item) {
    item.status = statusUpdate.status;
    if (statusUpdate.status === "delivered") {
      item.deliveredAt = new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString();
    }
    if (statusUpdate.status === "read") {
      item.readAt = new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString();
    }
    if (statusUpdate.errorMessage) {
      item.errorMessage = statusUpdate.errorMessage;
    }
    writeLogsToDisk(logs);
  }
}
