import { NextResponse } from "next/server";
import { getAttendeeById, updateAttendee, deleteAttendee } from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const attendee = await getAttendeeById(id);
    if (!attendee) {
      return NextResponse.json(
        { success: false, error: "المشارك غير موجود" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, attendee });
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

    const updated = await updateAttendee(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "المشارك غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      attendee: updated,
      message: "تم تحديث بيانات المشارك بنجاح",
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
    const deleted = await deleteAttendee(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "المشارك غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف المشارك بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
