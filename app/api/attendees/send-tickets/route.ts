import { NextResponse } from "next/server";
import { getAllAttendees, getTicketById, issueTicket, updateAttendee, getAllTickets } from "@/lib/db";
import { sendTicketEmail, getEmailSettings } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendeeIds, delayMs: customDelayMs } = body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "يجب تحديد مشارك واحد على الأقل لإرسال التذاكر" },
        { status: 400 }
      );
    }

    const hostUrl = new URL(request.url).origin;
    const settings = await getEmailSettings();
    const delayMs = typeof customDelayMs === "number" ? customDelayMs : (settings.delayBetweenEmailsMs ?? 500);

    const allAttendees = await getAllAttendees();
    const allTickets = await getAllTickets();

    const selectedAttendees = allAttendees.filter((a) => attendeeIds.includes(a.id));

    if (selectedAttendees.length === 0) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على المشاركين المحددين" },
        { status: 404 }
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    let newlyIssuedCount = 0;
    const results: Array<{
      attendeeId: string;
      name: string;
      email: string;
      ticketNumber: string;
      status: "sent" | "failed";
      error?: string;
    }> = [];

    for (const att of selectedAttendees) {
      try {
        let ticket = null;

        // 1. Check if attendee already has an active ticket
        if (att.hasTicket && att.ticketId) {
          ticket = await getTicketById(att.ticketId);
        }

        // Fallback: search by attendee email if ticketId was not set
        if (!ticket && att.email) {
          ticket = allTickets.find(
            (t) =>
              t.attendeeEmail?.toLowerCase() === att.email.toLowerCase() ||
              t.attendeeId === att.id
          );
        }

        // 2. If no ticket exists, automatically issue a personalized ticket now
        if (!ticket) {
          ticket = await issueTicket({
            attendeeName: att.name,
            attendeeEmail: att.email,
            category: att.category || "General",
          });
          newlyIssuedCount++;

          // Link ticket to attendee record
          await updateAttendee(att.id, {
            hasTicket: true,
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            approvalStatus: att.approvalStatus === "rejected" ? "accepted" : att.approvalStatus,
          });
        }

        // 3. Dispatch the personalized ticket email with new Figma design & QR barcode
        const sendRes = await sendTicketEmail(ticket, {
          hostUrl,
          recipientEmailOverride: att.email,
        });

        if (sendRes.success) {
          sentCount++;
          results.push({
            attendeeId: att.id,
            name: att.name,
            email: att.email,
            ticketNumber: ticket.ticketNumber,
            status: "sent",
          });
        } else {
          failedCount++;
          results.push({
            attendeeId: att.id,
            name: att.name,
            email: att.email,
            ticketNumber: ticket.ticketNumber,
            status: "failed",
            error: sendRes.error || "فشل إرسال البريد الإلكتروني",
          });
        }

        // Rate limit delay between emails
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          attendeeId: att.id,
          name: att.name,
          email: att.email,
          ticketNumber: att.ticketNumber || "-",
          status: "failed",
          error: err.message || "حدث خطأ غير متوقع",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSelected: selectedAttendees.length,
      sentCount,
      failedCount,
      newlyIssuedCount,
      results,
    });
  } catch (err: any) {
    console.error("Send selected tickets error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء إرسال التذاكر للمحددين" },
      { status: 500 }
    );
  }
}
