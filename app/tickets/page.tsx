import { getAllTickets } from "@/lib/db";
import TicketsDirectoryClient from "@/components/tickets/TicketsDirectoryClient";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const tickets = await getAllTickets();
  return <TicketsDirectoryClient initialTickets={tickets} />;
}
