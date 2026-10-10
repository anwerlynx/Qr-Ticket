import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || searchParams.get("credential") || searchParams.get("query");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "رمز التحقق مطلوب في الرابط (?token=...)" },
        { status: 400 }
      );
    }

    const { getTicketById, getTicketByCredential } = await import("@/lib/db");
    const ticket = (await getTicketByCredential(token)) || (await getTicketById(token));

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "تذكرة غير صالحة أو غير مسجلة في النظام", notFound: true },
        { status: 404 }
      );
    }

    const isUsed = ticket.status === "used";
    const isRevoked = ticket.status === "revoked";

    return NextResponse.json({
      success: true,
      ticket,
      canCheckIn: !isUsed && !isRevoked,
      alreadyCheckedIn: isUsed,
      isRevoked,
      message: isUsed
        ? `تم تسجيل الدخول مسبقاً في ${ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString("ar-EG") : ""}`
        : isRevoked
        ? "هذه التذكرة ملغاة"
        : "تذكرة صالحة وجاهزة لتسجيل الدخول",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "حدث خطأ أثناء فحص التذكرة" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token || body.query || body.credential;
    const station = body.station || "Baggage / Gate 1";

    if (!token) {
      return NextResponse.json(
        { success: false, message: "رمز التحقق مطلوب (token or credential is required)" },
        { status: 400 }
      );
    }

    const { processCheckIn } = await import("@/lib/db");
    const result = await processCheckIn(token, station);

    const httpStatus = result.success ? 200 : result.alreadyCheckedIn ? 409 : 404;

    return NextResponse.json(result, { status: httpStatus });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "حدث خطأ غير متوقع أثناء الفحص" },
      { status: 500 }
    );
  }
}

