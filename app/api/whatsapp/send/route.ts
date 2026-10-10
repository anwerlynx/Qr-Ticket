import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { getTicketById, getAttendeeById } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendeeId, ticketId, phone, recipientName } = body;

    let targetPhone = phone;
    let targetName = recipientName;
    let targetTicket = null;

    if (ticketId) {
      targetTicket = await getTicketById(ticketId);
      if (targetTicket) {
        targetName = targetName || targetTicket.attendeeName;
      }
    }

    if (attendeeId && !targetPhone) {
      const attendee = await getAttendeeById(attendeeId);
      if (attendee) {
        targetPhone = attendee.phone || (attendee as any).whatsapp;
        targetName = targetName || attendee.name;
      }
    }

    if (!targetPhone) {
      return NextResponse.json(
        { success: false, error: "رقم هاتف المشترك غير متوفر" },
        { status: 400 }
      );
    }

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let pdfUrl: string | undefined;

    if (targetTicket) {
      pdfUrl = `${hostUrl}/api/tickets/${targetTicket.id}/pdf`;
    }

    const result = await sendWhatsAppMessage({
      recipientPhone: targetPhone,
      recipientName: targetName || "المشترك",
      attendeeId,
      ticketId: targetTicket?.id,
      pdfUrl,
      eventDate: targetTicket?.eventDate,
      venueName: targetTicket?.venueName,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال التذكرة عبر واتساب بنجاح إلى ${targetPhone}`,
      wamId: result.wamId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
