import { NextResponse } from "next/server";
import { getTicketById } from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = await getTicketById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "التذكرة غير موجودة" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { updateTicket } = await import("@/lib/db");

    const updated = await updateTicket(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "التذكرة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: "تم تحديث بيانات التذكرة بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { deleteTicket } = await import("@/lib/db");

    const deleted = await deleteTicket(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "التذكرة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف التذكرة وإلغاء ارتباطها بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

