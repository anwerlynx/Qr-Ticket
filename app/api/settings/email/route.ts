import { NextResponse } from "next/server";
import { getEmailSettings, saveEmailSettings } from "@/lib/email-service";

export async function GET() {
  try {
    const settings = await getEmailSettings();
    // Mask password before returning
    const safeSettings = {
      ...settings,
      smtpPassword: settings.smtpPassword ? "••••••••••••" : "",
    };

    return NextResponse.json({
      success: true,
      settings: safeSettings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await getEmailSettings();

    // If user didn't change password (kept masked), preserve current password
    let passwordToSave = body.smtpPassword;
    if (passwordToSave === "••••••••••••" || !passwordToSave) {
      passwordToSave = current.smtpPassword;
    }

    const toSave = {
      ...body,
      smtpPassword: passwordToSave,
    };

    const saved = await saveEmailSettings(toSave);

    return NextResponse.json({
      success: true,
      message: "تم حفظ إعدادات البريد الإلكتروني بنجاح",
      settings: {
        ...saved,
        smtpPassword: saved.smtpPassword ? "••••••••••••" : "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
