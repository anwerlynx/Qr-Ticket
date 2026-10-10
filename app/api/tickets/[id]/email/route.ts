import { NextResponse } from "next/server";
import { getTicketById } from "@/lib/db";
import { renderNextGenTicketEmailHtml } from "@/components/tickets/NextGenTicketEmail";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = await getTicketById(id);
    if (!ticket) {
      return new Response("Ticket not found", { status: 404 });
    }

    const hostUrl = new URL(request.url).origin;
    const html = await renderNextGenTicketEmailHtml(ticket, hostUrl);

    // Check if client wants raw HTML or rendered view
    const url = new URL(request.url);
    if (url.searchParams.get("format") === "json") {
      return NextResponse.json({ success: true, html });
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
