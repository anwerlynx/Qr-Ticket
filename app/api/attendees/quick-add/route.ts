import { NextResponse } from "next/server";
import { registerAndIssueSingleAttendee } from "@/lib/db";
import { sendTicketEmail } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, job, faculty, city, category, sendEmailImmediately } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال اسم المشارك" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال بريد إلكتروني صحيح" },
        { status: 400 }
      );
    }

    // 1. Create attendee and issue ticket with barcode
    const { attendee, ticket } = await registerAndIssueSingleAttendee({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      job: job?.trim(),
      faculty: faculty?.trim(),
      city: city?.trim(),
      category: category || "General",
    });

    // 2. Send email immediately if requested (default: true)
    let emailResult = null;
    if (sendEmailImmediately !== false) {
      emailResult = await sendTicketEmail(ticket);
    }

    return NextResponse.json({
      success: true,
      attendee,
      ticket,
      emailResult,
      message: emailResult?.success
        ? `تم تسجيل ${attendee.name} وإصدار التذكرة رقم ${ticket.ticketNumber} وإرسالها إلى ${attendee.email} بنجاح!`
        : `تم تسجيل ${attendee.name} وإصدار التذكرة رقم ${ticket.ticketNumber} بنجاح!`,
    });
  } catch (err: any) {
    console.error("Quick add attendee error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء إضافة المشارك" },
      { status: 500 }
    );
  }
}
