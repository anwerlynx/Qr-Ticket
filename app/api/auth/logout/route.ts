import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
