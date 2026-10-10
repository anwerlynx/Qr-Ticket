import { NextResponse } from "next/server";
import { getWhatsAppStatus, getWhatsAppLogs } from "@/lib/whatsapp-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getWhatsAppStatus();
    const logs = await getWhatsAppLogs();

    const stats = {
      totalSent: logs.filter((l) => l.status === "sent" || l.status === "delivered" || l.status === "read").length,
      delivered: logs.filter((l) => l.status === "delivered" || l.status === "read").length,
      read: logs.filter((l) => l.status === "read").length,
      failed: logs.filter((l) => l.status === "failed").length,
    };

    return NextResponse.json({
      success: true,
      status,
      stats,
      recentLogs: logs.slice(0, 50),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
