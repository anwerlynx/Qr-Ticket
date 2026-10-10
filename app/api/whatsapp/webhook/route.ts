import { NextResponse } from "next/server";
import { getWhatsAppEnv, updateWebhookStatus } from "@/lib/whatsapp-service";

export const dynamic = "force-dynamic";

/**
 * Meta Webhook Verification Handshake (GET)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const env = getWhatsAppEnv();

  if (mode === "subscribe" && token === env.webhookVerifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * Meta Inbound Webhook Notifications (POST)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const val = change.value;
            if (val && Array.isArray(val.statuses)) {
              for (const st of val.statuses) {
                await updateWebhookStatus({
                  wamId: st.id,
                  status: st.status,
                  timestamp: st.timestamp,
                  recipientPhone: st.recipient_id,
                  errorMessage: st.errors?.[0]?.title || st.errors?.[0]?.message,
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, status: "EVENT_RECEIVED" });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
