import { NextResponse } from "next/server";
import { getAllTickets, getTicketById } from "@/lib/db";
import { sendTicketEmail, getEmailSettings } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketIds, isTest, testEmailRecipient, limit = 15 } = body;

    const hostUrl = new URL(request.url).origin;
    const settings = await getEmailSettings();

    // 1. If Test Email Mode
    if (isTest) {
      if (!testEmailRecipient) {
        return NextResponse.json(
          { success: false, error: "يجب تحديد البريد الإلكتروني المستلم للتجربة" },
          { status: 400 }
        );
      }

      // Pick first valid ticket to test
      const allTickets = await getAllTickets();
      const sampleTicket = allTickets.find((t) => t.status === "valid") || allTickets[0];
      if (!sampleTicket) {
        return NextResponse.json(
          { success: false, error: "لا توجد تذاكر صالحة لإجراء التجربة" },
          { status: 400 }
        );
      }

      const sendResult = await sendTicketEmail(sampleTicket, {
        recipientEmailOverride: testEmailRecipient,
        hostUrl,
      });

      return NextResponse.json({
        success: sendResult.success,
        isTest: true,
        messageId: sendResult.messageId,
        error: sendResult.error,
        mockMode: sendResult.mockMode || settings.provider === "mock",
        provider: sendResult.provider || settings.provider,
        sentVia: sendResult.sentVia,
        serverId: sendResult.serverId,
      });
    }

    // 2. Bulk Batch Sending Mode
    const { onlyUnsent = false, delayMs: customDelayMs } = body;
    const allTickets = await getAllTickets();
    const targetTickets = allTickets.filter((t) => {
      if (ticketIds && Array.isArray(ticketIds)) {
        return ticketIds.includes(t.id);
      }
      if (onlyUnsent && (t.emailStatus === "delivered" || t.emailStatus === "sent")) {
        return false;
      }
      return t.status === "valid";
    });

    const batch = targetTickets.slice(0, limit);
    let sentCount = 0;
    let failedCount = 0;
    const failures: Array<{ ticketId: string; email: string; error: string }> = [];
    const sentByServer: Record<string, number> = {};
    const results: Array<{
      ticketId: string;
      attendeeId?: string;
      attendeeName: string;
      email: string;
      status: "delivered" | "failed";
      error?: string;
      sentAt: string;
      sentVia?: string;
      serverId?: string;
    }> = [];

    const delayMs = typeof customDelayMs === "number" ? customDelayMs : (settings.delayBetweenEmailsMs ?? 500);

    for (let i = 0; i < batch.length; i++) {
      const ticket = batch[i];
      const now = new Date().toISOString();
      const res = await sendTicketEmail(ticket, { hostUrl });
      if (res.success) {
        sentCount++;
        const sender = res.sentVia || "default";
        sentByServer[sender] = (sentByServer[sender] || 0) + 1;

        results.push({
          ticketId: ticket.id,
          attendeeId: ticket.attendeeId,
          attendeeName: ticket.attendeeName,
          email: ticket.attendeeEmail || "",
          status: "delivered",
          sentAt: now,
          sentVia: res.sentVia,
          serverId: res.serverId,
        });
      } else {
        failedCount++;
        failures.push({
          ticketId: ticket.id,
          email: ticket.attendeeEmail || "",
          error: res.error || "فشل إرسال البريد",
        });
        results.push({
          ticketId: ticket.id,
          attendeeId: ticket.attendeeId,
          attendeeName: ticket.attendeeName,
          email: ticket.attendeeEmail || "",
          status: "failed",
          error: res.error,
          sentAt: now,
          sentVia: res.sentVia,
          serverId: res.serverId,
        });
      }

      // Rate limit delay between emails to avoid spam triggers
      if (i < batch.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    const remainingCount = Math.max(0, targetTickets.length - batch.length);

    return NextResponse.json({
      success: true,
      batchSize: batch.length,
      sentCount,
      failedCount,
      remainingCount,
      sentByServer,
      failures,
      results,
      delayUsedMs: delayMs,
      provider: settings.provider,
      mockMode: settings.provider === "mock",
    });
  } catch (err: any) {
    console.error("Email batch sending error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء إرسال البريد الإلكتروني" },
      { status: 500 }
    );
  }
}
