import { cookies } from "next/headers";
import { registerScannerStaff } from "@/lib/scanner-staff";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, pin, gate } = body;

    const result = await registerScannerStaff({ name, phone, pin, gate });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Automatically set scanner session cookie so staff can scan immediately
    const cookieStore = await cookies();
    cookieStore.set(
      "nextgen_scanner_session",
      JSON.stringify({
        id: result.staff!.id,
        name: result.staff!.name,
        phone: result.staff!.phone,
        gate: result.staff!.gate,
      }),
      {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    return NextResponse.json({
      success: true,
      message: "تم تسجيل حسابك وتفعيله بنجاح! جاري توجيهك إلى شاشة المسح...",
      staff: {
        id: result.staff?.id,
        name: result.staff?.name,
        phone: result.staff?.phone,
        gate: result.staff?.gate,
        status: result.staff?.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل تسجيل المنظم" },
      { status: 500 }
    );
  }
}
