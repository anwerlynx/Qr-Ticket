import { NextResponse } from "next/server";
import { sendWhatsAppMessage, getWhatsAppEnv } from "@/lib/whatsapp-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const env = getWhatsAppEnv();

    const targetPhone = body.phone || env.testRecipientPhone;
    if (!targetPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "يرجى تحديد رقم هاتف المستلم أو تهيئة WHATSAPP_TEST_RECIPIENT_PHONE في .env.local",
        },
        { status: 400 }
      );
    }

    const templateName = body.templateName || "hello_world";
    const recipientName = body.recipientName || "NextGen Tester";

    const result = await sendWhatsAppMessage({
      recipientPhone: targetPhone,
      recipientName,
      templateName,
      languageCode: body.languageCode || "en_US",
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال رسالة الاختبار بنجاح إلى ${targetPhone}`,
      wamId: result.wamId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
