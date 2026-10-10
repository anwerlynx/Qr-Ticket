import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyScannerLogin } from "@/lib/scanner-staff";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    if (!phone || !pin) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال رقم الهاتف ورمز PIN" },
        { status: 400 }
      );
    }

    const result = await verifyScannerLogin(phone, pin);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          isPending: result.isPending,
        },
        { status: 401 }
      );
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("nextgen_scanner_session", JSON.stringify({
      id: result.staff!.id,
      name: result.staff!.name,
      phone: result.staff!.phone,
      gate: result.staff!.gate,
    }), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: result.staff!.id,
        name: result.staff!.name,
        phone: result.staff!.phone,
        gate: result.staff!.gate,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل تسجيل الدخول" },
      { status: 500 }
    );
  }
}
