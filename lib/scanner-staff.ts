import fs from "fs";
import path from "path";
import crypto from "crypto";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase";

export interface ScannerStaff {
  id: string;
  name: string;
  phone: string;
  pinHash: string;
  gate: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  lastLoginAt?: string;
  totalScans?: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STAFF_FILE = path.join(DATA_DIR, "scanner_staff.json");

// Default initial staff demo
const INITIAL_STAFF: ScannerStaff[] = [
  {
    id: "staff-gate-001",
    name: "منظم البوابة الرئيسية",
    phone: "01000000001",
    pinHash: hashPin("1234"),
    gate: "البوابة 1 - المدخل الرئيسي",
    status: "approved",
    createdAt: new Date().toISOString(),
    totalScans: 0,
  },
];

let inMemoryStaffStore: ScannerStaff[] = [...INITIAL_STAFF];

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin.trim()).digest("hex");
}

function ensureStaffFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STAFF_FILE)) {
      fs.writeFileSync(STAFF_FILE, JSON.stringify(INITIAL_STAFF, null, 2), "utf8");
    }
  } catch {
    // Read-only environment safe
  }
}

function readStaffFromDisk(): ScannerStaff[] {
  ensureStaffFile();
  try {
    if (fs.existsSync(STAFF_FILE)) {
      const raw = fs.readFileSync(STAFF_FILE, "utf8");
      inMemoryStaffStore = JSON.parse(raw);
      return inMemoryStaffStore;
    }
  } catch {}
  return inMemoryStaffStore;
}

function writeStaffToDisk(staffList: ScannerStaff[]) {
  inMemoryStaffStore = staffList;
  try {
    ensureStaffFile();
    fs.writeFileSync(STAFF_FILE, JSON.stringify(staffList, null, 2), "utf8");
  } catch {}
}

/**
 * Get all staff from Supabase (checking both scanner_staff and attendees fallback) or local disk
 */
export async function getAllScannerStaff(): Promise<ScannerStaff[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      // 1. Try dedicated table first
      const { data: dedicatedData, error: dedicatedErr } = await supabase
        .from("scanner_staff")
        .select("*")
        .order("created_at", { ascending: false });

      if (!dedicatedErr && dedicatedData && dedicatedData.length > 0) {
        return dedicatedData.map((row: any) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          pinHash: row.pin_hash,
          gate: row.gate,
          status: row.status,
          createdAt: row.created_at,
          lastLoginAt: row.last_login_at,
          totalScans: row.total_scans || 0,
        }));
      }

      // 2. Seamless cloud fallback to attendees table with category: 'Staff_Scanner'
      const { data: attData, error: attErr } = await supabase
        .from("attendees")
        .select("*")
        .eq("category", "Staff_Scanner")
        .order("created_at", { ascending: false });

      if (!attErr && attData && attData.length > 0) {
        return attData.map((row: any) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          pinHash: row.custom_fields?.pinHash || "",
          gate: row.custom_fields?.gate || "البوابة الرئيسية",
          status: (row.status === "rejected" || row.status === "approved" || row.status === "pending")
            ? row.status
            : (row.custom_fields?.staffStatus || "pending"),
          createdAt: row.created_at,
          lastLoginAt: row.custom_fields?.lastLoginAt,
          totalScans: row.custom_fields?.totalScans || 0,
        }));
      }
    } catch (err) {
      console.error("Supabase getAllScannerStaff error:", err);
    }
  }

  return readStaffFromDisk();
}

/**
 * Register a new gate scanner staff member (defaults to pending)
 */
export async function registerScannerStaff(params: {
  name: string;
  phone: string;
  pin: string;
  gate?: string;
}): Promise<{ success: boolean; staff?: ScannerStaff; error?: string }> {
  const cleanPhone = params.phone.trim().replace(/\s+/g, "");
  const cleanPin = params.pin.trim();

  if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
    return { success: false, error: "رمز PIN يجب أن يتكون من 4 أرقام فقط" };
  }

  if (!params.name.trim() || !cleanPhone) {
    return { success: false, error: "يرجى كتابة الاسم ورقم الهاتف بالكامل" };
  }

  const staffList = await getAllScannerStaff();
  const exists = staffList.find((s) => s.phone === cleanPhone);
  if (exists) {
    return { success: false, error: "رقم الهاتف مسجل بالفعل مسبقاً" };
  }

  const newStaff: ScannerStaff = {
    id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name.trim(),
    phone: cleanPhone,
    pinHash: hashPin(cleanPin),
    gate: params.gate?.trim() || "البوابة الرئيسية",
    status: "pending",
    createdAt: new Date().toISOString(),
    totalScans: 0,
  };

  // Persist to Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      // Try dedicated table
      const { error: dedicatedErr } = await supabase.from("scanner_staff").insert({
        id: newStaff.id,
        name: newStaff.name,
        phone: newStaff.phone,
        pin_hash: newStaff.pinHash,
        gate: newStaff.gate,
        status: newStaff.status,
        created_at: newStaff.createdAt,
      });

      // If dedicated table fails or does not exist, insert into attendees table as cloud fallback
      if (dedicatedErr) {
        await supabase.from("attendees").upsert({
          id: newStaff.id,
          name: newStaff.name,
          email: `${newStaff.phone}@staff.nextgen.local`,
          phone: newStaff.phone,
          category: "Staff_Scanner",
          status: newStaff.status,
          custom_fields: {
            pinHash: newStaff.pinHash,
            gate: newStaff.gate,
            isScannerStaff: true,
            staffStatus: newStaff.status,
            totalScans: 0,
          },
          created_at: newStaff.createdAt,
          updated_at: newStaff.createdAt,
        });
      }
    } catch (err) {
      console.error("Supabase registerScannerStaff error:", err);
    }
  }

  // Also sync locally
  const current = readStaffFromDisk();
  writeStaffToDisk([newStaff, ...current.filter((s) => s.phone !== cleanPhone)]);

  return { success: true, staff: newStaff };
}

/**
 * Verify scanner login with phone and 4-digit PIN
 */
export async function verifyScannerLogin(
  phone: string,
  pin: string
): Promise<{
  success: boolean;
  staff?: ScannerStaff;
  error?: string;
  isPending?: boolean;
}> {
  const cleanPhone = phone.trim().replace(/\s+/g, "");
  const cleanPin = pin.trim();
  const targetHash = hashPin(cleanPin);

  const staffList = await getAllScannerStaff();
  const staff = staffList.find((s) => s.phone === cleanPhone);

  if (!staff) {
    return { success: false, error: "رقم الهاتف غير مسجل في النظام" };
  }

  if (staff.pinHash !== targetHash) {
    return { success: false, error: "رمز PIN غير صحيح" };
  }

  if (staff.status === "pending") {
    return {
      success: false,
      isPending: true,
      error: "طلبك قيد المراجعة حالياً، يرجى انتظار موافقة المسؤول على تفعيل صلاحيتك",
    };
  }

  if (staff.status === "rejected") {
    return {
      success: false,
      error: "تم رفض صلاحية الدخول الخاصة بهذا الحساب من قِبل الإدارة",
    };
  }

  // Update last login
  const now = new Date().toISOString();
  staff.lastLoginAt = now;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      await supabase
        .from("scanner_staff")
        .update({ last_login_at: now })
        .eq("id", staff.id);

      await supabase
        .from("attendees")
        .update({ updated_at: now })
        .eq("id", staff.id);
    } catch {}
  }

  const current = readStaffFromDisk();
  const idx = current.findIndex((s) => s.id === staff.id);
  if (idx !== -1) {
    current[idx].lastLoginAt = now;
    writeStaffToDisk(current);
  }

  return { success: true, staff };
}

/**
 * Update staff approval status (Admin action)
 */
export async function updateScannerStaffStatus(
  id: string,
  status: "approved" | "rejected" | "pending"
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      await supabase.from("scanner_staff").update({ status }).eq("id", id);
      await supabase
        .from("attendees")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch (err) {
      console.error("Supabase updateScannerStaffStatus error:", err);
    }
  }

  const current = readStaffFromDisk();
  const idx = current.findIndex((s) => s.id === id);
  if (idx !== -1) {
    current[idx].status = status;
    writeStaffToDisk(current);
    return true;
  }
  return false;
}

/**
 * Delete scanner staff member
 */
export async function deleteScannerStaff(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      await supabase.from("scanner_staff").delete().eq("id", id);
      await supabase.from("attendees").delete().eq("id", id);
    } catch (err) {
      console.error("Supabase deleteScannerStaff error:", err);
    }
  }

  const current = readStaffFromDisk();
  const filtered = current.filter((s) => s.id !== id);
  writeStaffToDisk(filtered);
  return true;
}

/**
 * Increment scanner scan count
 */
export async function incrementStaffScanCount(staffId: string): Promise<void> {
  const current = readStaffFromDisk();
  const idx = current.findIndex((s) => s.id === staffId);
  if (idx !== -1) {
    current[idx].totalScans = (current[idx].totalScans || 0) + 1;
    writeStaffToDisk(current);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const { data } = await supabase
        .from("scanner_staff")
        .select("total_scans")
        .eq("id", staffId)
        .single();
      if (data) {
        await supabase
          .from("scanner_staff")
          .update({ total_scans: (data.total_scans || 0) + 1 })
          .eq("id", staffId);
      }
    } catch {}
  }
}
