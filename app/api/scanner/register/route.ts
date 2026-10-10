import { NextResponse } from "next/server";
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

    return NextResponse.json({
      success: true,
      message: "تم تسجيلك بنجاح. طلبك الآن قيد مراجعة وتفعيل المسؤول.",
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
