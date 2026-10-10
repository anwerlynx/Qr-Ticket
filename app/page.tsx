import { getEventSettings } from "@/lib/event-settings";
import { getAllTickets, getAllAttendees } from "@/lib/db";
import HomePageClient from "@/components/home/HomePageClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [eventSettings, tickets, attendees] = await Promise.all([
    getEventSettings(),
    getAllTickets(),
    getAllAttendees(),
  ]);

  const totalRegistered = attendees.length;
  const issuedTickets = tickets.filter((t) => t.status !== "revoked").length;
  const pendingTickets = Math.max(0, totalRegistered - issuedTickets);
  const checkedInCount = tickets.filter((t) => t.status === "used").length;
  const notCheckedInCount = Math.max(0, issuedTickets - checkedInCount);

  const stats = {
    totalRegistered,
    issuedTickets,
    pendingTickets,
    sentEmails: 0,
    deliveredEmails: 0,
    failedEmails: 0,
    checkedInCount,
    notCheckedInCount,
  };

  return (
    <HomePageClient
      initialStats={stats}
      initialEventSettings={eventSettings}
      initialTickets={tickets.slice(0, 50)}
      initialTotalTickets={tickets.length}
      initialTotalAttendees={attendees.length}
    />
  );
}
