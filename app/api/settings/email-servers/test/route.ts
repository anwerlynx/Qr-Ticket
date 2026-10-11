import { NextResponse } from "next/server";
import { getAllEmailServers, testSingleServerConnection } from "@/lib/email-servers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serverId, testRecipient } = body;

    if (!testRecipient || !testRecipient.includes("@")) {
      return NextResponse.json(
        { success: false, error: "يرجى كتابة عنوان بريد إلكتروني صحيح لإجراء التجربة" },
        { status: 400 }
      );
    }

    const servers = await getAllEmailServers();
    const server = servers.find((s) => s.id === serverId);

    if (!server) {
      return NextResponse.json(
        { success: false, error: "الخادم المحدد غير موجود" },
        { status: 404 }
      );
    }

    if (!server.password) {
      return NextResponse.json(
        { success: false, error: "كلمة مرور التطبيق غير مسجلة لهذا الخادم" },
        { status: 400 }
      );
    }

    const res = await testSingleServerConnection(server, testRecipient);

    if (res.success) {
      return NextResponse.json({
        success: true,
        message: `✓ نجح الاتصال! تم إرسال رسالة تجريبية من (${server.email}) إلى (${testRecipient}) بنجاح!`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: res.error || "فشل الاتصال بهذا الخادم" },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء اختبار الخادم" },
      { status: 500 }
    );
  }
}
