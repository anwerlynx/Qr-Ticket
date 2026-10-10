import { NextResponse } from "next/server";
import { getAllAttendees } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const approval = searchParams.get("approval") || "all";
    const attendance = searchParams.get("attendance") || "all";
    const ticketFilter = searchParams.get("ticket") || "all";

    const attendees = await getAllAttendees();

    const filtered = attendees.filter((a) => {
      // Search matching across all text fields
      const matchSearch =
        !search ||
        a.name.toLowerCase().includes(search) ||
        a.email.toLowerCase().includes(search) ||
        (a.phone && a.phone.includes(search)) ||
        (a.whatsapp && a.whatsapp.includes(search)) ||
        (a.faculty && a.faculty.toLowerCase().includes(search)) ||
        (a.job && a.job.toLowerCase().includes(search)) ||
        (a.city && a.city.toLowerCase().includes(search)) ||
        (a.ticketNumber && a.ticketNumber.toLowerCase().includes(search));

      // Attendance filter: all, checked_in, not_checked_in
      const matchAttendance =
        attendance === "all" ||
        (attendance === "checked_in" && a.status === "checked_in") ||
        (attendance === "not_checked_in" && a.status !== "checked_in");

      // Approval filter: all, accepted, pending, rejected
      const currentApproval = a.approvalStatus || "accepted";
      const matchApproval = approval === "all" || currentApproval === approval;

      // Ticket filter: all, with_ticket, no_ticket
      const matchTicket =
        ticketFilter === "all" ||
        (ticketFilter === "with_ticket" && a.hasTicket) ||
        (ticketFilter === "no_ticket" && !a.hasTicket);

      return matchSearch && matchAttendance && matchApproval && matchTicket;
    });

    return NextResponse.json({
      success: true,
      attendees: filtered,
      total: attendees.length,
      counts: {
        total: attendees.length,
        checkedIn: attendees.filter((a) => a.status === "checked_in").length,
        notCheckedIn: attendees.filter((a) => a.status !== "checked_in").length,
        hasTicket: attendees.filter((a) => a.hasTicket).length,
        noTicket: attendees.filter((a) => !a.hasTicket).length,
        accepted: attendees.filter((a) => (a.approvalStatus || "accepted") === "accepted").length,
        pending: attendees.filter((a) => a.approvalStatus === "pending").length,
        rejected: attendees.filter((a) => a.approvalStatus === "rejected").length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
