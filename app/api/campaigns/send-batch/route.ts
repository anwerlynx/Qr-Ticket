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
      });
    }

    // 2. Bulk Batch Sending Mode
    const allTickets = await getAllTickets();
    const targetTickets = allTickets.filter((t) => {
      if (ticketIds && Array.isArray(ticketIds)) {
        return ticketIds.includes(t.id);
      }
      return t.status === "valid";
    });

    const batch = targetTickets.slice(0, limit);
    let sentCount = 0;
    let failedCount = 0;
    const failures: Array<{ ticketId: string; email: string; error: string }> = [];

    const delayMs = settings.delayBetweenEmailsMs || 200;

    for (let i = 0; i < batch.length; i++) {
      const ticket = batch[i];
      const res = await sendTicketEmail(ticket, { hostUrl });
      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
        failures.push({
          ticketId: ticket.id,
          email: ticket.attendeeEmail || "",
          error: res.error || "Unknown error",
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
      failures,
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
