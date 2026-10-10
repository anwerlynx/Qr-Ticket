import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllScannerStaff } from "@/lib/scanner-staff";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("nextgen_scanner_session")?.value;
    if (!raw) {
      return NextResponse.json({ authenticated: false });
    }

    const sessionData = JSON.parse(raw);
    const allStaff = await getAllScannerStaff();
    const staff = allStaff.find((s) => s.id === sessionData.id);

    if (!staff || staff.status !== "approved") {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      staff: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        gate: staff.gate,
        totalScans: staff.totalScans || 0,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("nextgen_scanner_session");
  return NextResponse.json({ success: true });
}
