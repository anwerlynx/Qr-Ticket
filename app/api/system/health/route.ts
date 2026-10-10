import { NextResponse } from "next/server";
import { getAllAttendees, getAllTickets, getEmailLogs } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isEmailConfigured } from "@/lib/email-service";

export async function GET() {
  try {
    const attendees = await getAllAttendees();
    const tickets = await getAllTickets();
    const emailLogs = await getEmailLogs();
    const isDbCloud = isSupabaseConfigured();
    const isEmailReady = isEmailConfigured();

    const usedTickets = tickets.filter((t) => t.status === "used").length;
    const validTickets = tickets.filter((t) => t.status === "valid").length;
    const deliveredEmails = emailLogs.filter((e) => e.status === "delivered" || e.status === "sent").length;

    return NextResponse.json({
      success: true,
      status: "operational",
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      storageEngine: {
        mode: isDbCloud ? "cloud_postgresql_supabase" : "local_embedded_json",
        isCloudPersisted: isDbCloud,
        description: isDbCloud
          ? "متصل بقاعدة بيانات Supabase السحابية (جاهز لـ Vercel والإنتاج)"
          : "يعمل بوحدة التخزين المحلية المدمجة (Local JSON Store)",
      },
      emailDelivery: {
        isConfigured: isEmailReady,
        provider: process.env.RESEND_API_KEY ? "resend" : "smtp_or_offline",
      },
      metrics: {
        totalAttendees: attendees.length,
        totalTickets: tickets.length,
        validTickets,
        checkedInAttendees: usedTickets,
        deliveredEmails,
      },
      apiFeatures: {
        bulkAttendeeImport: true,
        massTicketGeneration: true,
        bulkEmailDelivery: true,
        qrGateCheckIn: true,
        realTimeAnalytics: true,
        dynamicEventCustomizer: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, status: "degraded", error: err.message },
      { status: 500 }
    );
  }
}
