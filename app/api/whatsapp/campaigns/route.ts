import { NextResponse } from "next/server";
import { getWhatsAppEnv, sendWhatsAppMessage } from "@/lib/whatsapp-service";
import { getAllAttendees, getAllTickets } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const env = getWhatsAppEnv();

    if (env.mode === "test") {
      return NextResponse.json(
        {
          success: false,
          error:
            "نظام واتساب في وضع الاختبار (Test Mode). تم تعطيل الإرسال الجماعي لمنع الحظر وحماية الحساب. يمكنك إرسال رسائل فردية أو تجريبية فقط.",
        },
        { status: 403 }
      );
    }

    const delayMs = typeof body.delayMs === "number" ? Math.max(1000, body.delayMs) : 3000;
    const attendees = await getAllAttendees();
    const tickets = await getAllTickets();
    const ticketMap = new Map(tickets.map((t) => [t.attendeeId, t]));

    const eligible = attendees.filter((a) => (a.phone || (a as any).whatsapp) && ticketMap.has(a.id));

    if (eligible.length === 0) {
      return NextResponse.json(
        { success: false, error: "لا يوجد مشتركون لديهم أرقام هواتف وتذاكر صادرة" },
        { status: 400 }
      );
    }

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let sentCount = 0;
    let failedCount = 0;

    for (const attendee of eligible) {
      const ticket = ticketMap.get(attendee.id)!;
      const phone = attendee.phone || (attendee as any).whatsapp;
      const pdfUrl = `${hostUrl}/api/tickets/${ticket.id}/pdf`;

      const res = await sendWhatsAppMessage({
        recipientPhone: phone,
        recipientName: attendee.name,
        attendeeId: attendee.id,
        ticketId: ticket.id,
        pdfUrl,
      });

      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Safe anti-rate-limit throttling delay
      await new Promise((r) => setTimeout(r, delayMs));
    }

    return NextResponse.json({
      success: true,
      message: `اكتملت حملة الواتساب: تم إرسال ${sentCount}، وفشل ${failedCount}`,
      sentCount,
      failedCount,
      total: eligible.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
