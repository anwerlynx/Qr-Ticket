import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: { role: "admin", name: "System Administrator" },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
