import { NextResponse } from "next/server";
import {
  getAllScannerStaff,
  updateScannerStaffStatus,
  deleteScannerStaff,
} from "@/lib/scanner-staff";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getAllScannerStaff();
    return NextResponse.json({
      success: true,
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        gate: s.gate,
        status: s.status,
        createdAt: s.createdAt,
        lastLoginAt: s.lastLoginAt,
        totalScans: s.totalScans || 0,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "معرف المنظم والحالة مطلوبان" },
        { status: 400 }
      );
    }

    const updated = await updateScannerStaffStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "فشل تحديث حالة المنظم" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `تم تحديث حالة المنظم إلى: ${status === "approved" ? "مفعل (Approved)" : status === "rejected" ? "مرفوض (Rejected)" : "قيد المراجعة"}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المنظم مطلوب" },
        { status: 400 }
      );
    }

    const deleted = await deleteScannerStaff(id);
    return NextResponse.json({
      success: deleted,
      message: "تم حذف المنظم بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
