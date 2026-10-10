import { NextResponse } from "next/server";
import { getDashboardStats, getAllTickets, getAllAttendees } from "@/lib/db";
import { getEventSettings } from "@/lib/event-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startTime = performance.now();

    // Parallel in-memory / fast server-side loading
    const [stats, eventSettings, tickets, attendees] = await Promise.all([
      getDashboardStats(),
      getEventSettings(),
      getAllTickets(),
      getAllAttendees(),
    ]);

    const durationMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      durationMs,
      stats,
      eventSettings,
      ticketsPreview: tickets.slice(0, 50), // Return recent tickets for instant preview
      totalTicketsCount: tickets.length,
      totalAttendeesCount: attendees.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bootstrap dashboard" },
      { status: 500 }
    );
  }
}
