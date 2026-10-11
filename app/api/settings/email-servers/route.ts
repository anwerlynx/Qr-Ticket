import { NextResponse } from "next/server";
import {
  getAllEmailServers,
  saveEmailServer,
  deleteEmailServer,
} from "@/lib/email-servers";

export async function GET() {
  try {
    const servers = await getAllEmailServers();
    // Mask passwords for security in client view
    const safeServers = servers.map((s) => ({
      ...s,
      hasPassword: Boolean(s.password),
      password: s.password ? "••••••••" : "",
    }));
    return NextResponse.json({ success: true, servers: safeServers });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل جلب خوادم البريد" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, host, port, secure, username, password, dailyLimit } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "يرجى كتابة عنوان بريد إلكتروني صالح" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال كلمة مرور التطبيقات (App Password)" },
        { status: 400 }
      );
    }

    const saved = await saveEmailServer({
      id: body.id,
      name: name || email,
      email,
      host: host || "smtp.gmail.com",
      port: Number(port) || 465,
      secure: secure !== false,
      username: username || email,
      password,
      dailyLimit: Number(dailyLimit) || 450,
      status: "active",
      lastError: undefined,
    });

    return NextResponse.json({
      success: true,
      message: `تمت إضافة خادم البريد (${saved.name}) بنجاح وهو نشط الآن في حوض التوزيع!`,
      server: {
        ...saved,
        hasPassword: true,
        password: "••••••••",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل حفظ خادم البريد" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الخادم مطلوب" },
        { status: 400 }
      );
    }

    await deleteEmailServer(id);
    return NextResponse.json({
      success: true,
      message: "تم حذف خادم البريد من حوض التوزيع بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل حذف خادم البريد" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الخادم مطلوب" },
        { status: 400 }
      );
    }

    const servers = await getAllEmailServers();
    const existing = servers.find((s) => s.id === id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "الخادم غير موجود" },
        { status: 404 }
      );
    }

    const updated = await saveEmailServer({
      ...existing,
      ...body,
      status: status || existing.status,
    });

    return NextResponse.json({
      success: true,
      message: `تم تحديث حالة الخادم (${updated.name}) بنجاح`,
      server: {
        ...updated,
        hasPassword: Boolean(updated.password),
        password: "••••••••",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل تحديث الخادم" },
      { status: 500 }
    );
  }
}
