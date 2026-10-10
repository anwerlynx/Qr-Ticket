import { getAllAttendees } from "@/lib/db";
import AttendeesExcelTableClient from "@/components/attendees/AttendeesExcelTableClient";

export const dynamic = "force-dynamic";

export default async function AttendeesPage() {
  const attendees = await getAllAttendees();
  const counts = {
    total: attendees.length,
    checkedIn: attendees.filter((a) => a.status === "checked_in").length,
    notCheckedIn: attendees.filter((a) => a.status !== "checked_in").length,
    hasTicket: attendees.filter((a) => a.hasTicket).length,
    noTicket: attendees.filter((a) => !a.hasTicket).length,
    accepted: attendees.filter((a) => a.approvalStatus !== "rejected").length,
    pending: attendees.filter((a) => a.approvalStatus === "pending").length,
    rejected: attendees.filter((a) => a.approvalStatus === "rejected").length,
  };

  return (
    <AttendeesExcelTableClient
      initialAttendees={attendees}
      initialCounts={counts}
    />
  );
}
