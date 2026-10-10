import { NextResponse } from "next/server";
import { testEmailConnection } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient } = body;

    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال عنوان بريد إلكتروني صحيح لتجربة الإرسال" },
        { status: 400 }
      );
    }

    const result = await testEmailConnection(recipient);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل الاتصال بخادم البريد" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      mockMode: result.mockMode,
      message: result.mockMode
        ? "تمت المحاكاة بنجاح (وضع Mock)"
        : `✓ تم إرسال رسالة الاختبار بنجاح إلى ${recipient} عبر ${result.provider?.toUpperCase()}. تحقق من صندوق الوارد (Inbox)!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
