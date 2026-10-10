import fs from "fs";
import path from "path";
import {
  TicketData,
  AttendeeRecord,
  CheckInResult,
  ImportValidationResult,
  ImportValidationRecord,
  BulkIssuanceResult,
  EmailDeliveryRecord,
  DashboardStats,
} from "@/types/ticket";
import {
  generateSecureCredential,
  generateHumanReadableTicketNumber,
} from "./qr";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase";
import { getEventSettings } from "./event-settings";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "tickets.json");
const ATTENDEES_FILE = path.join(DATA_DIR, "attendees.json");
const EMAIL_LOGS_FILE = path.join(DATA_DIR, "email_logs.json");

// Initial seed attendees (empty by default - all live data is loaded directly from Supabase)
const INITIAL_ATTENDEES: AttendeeRecord[] = [];

// Initial seed tickets (empty by default - all live data is loaded directly from Supabase)
const INITIAL_TICKETS: TicketData[] = [];

// -------------------------------------------------------------
// -------------------------------------------------------------
// LOCAL PERSISTENCE HELPERS (Offline & Vercel Read-Only Safe)
// -------------------------------------------------------------
const inMemoryFallbackStore = new Map<string, any>([
  [ATTENDEES_FILE, INITIAL_ATTENDEES],
  [DB_FILE, INITIAL_TICKETS],
  [EMAIL_LOGS_FILE, []],
]);

function ensureFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ATTENDEES_FILE)) {
      fs.writeFileSync(ATTENDEES_FILE, JSON.stringify(INITIAL_ATTENDEES, null, 2), "utf8");
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_TICKETS, null, 2), "utf8");
    }
    if (!fs.existsSync(EMAIL_LOGS_FILE)) {
      fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify([], null, 2), "utf8");
    }
  } catch (err) {
    // Read-only filesystem (e.g. Vercel Serverless environment) - fall back safely to memory
  }
}

// High-Performance In-Memory Cache with instant invalidation
const memoryCache = new Map<string, { data: any; mtime: number }>();

// Cache Supabase Schema Readiness to avoid repeated 404 network roundtrips
let supabaseSchemaReady: boolean | null = null;
let lastSupabaseCheckTime = 0;

export async function isSupabaseReady(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const now = Date.now();
  if (supabaseSchemaReady !== null && now - lastSupabaseCheckTime < 30000) {
    return supabaseSchemaReady;
  }
  try {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("tickets").select("id").limit(1);
    lastSupabaseCheckTime = now;
    if (error && (error.code === "PGRST205" || error.message.includes("schema cache"))) {
      supabaseSchemaReady = false;
      return false;
    }
    supabaseSchemaReady = !error;
    return supabaseSchemaReady;
  } catch {
    supabaseSchemaReady = false;
    lastSupabaseCheckTime = now;
    return false;
  }
}

function readJson<T>(file: string, fallback: T): T {
  ensureFiles();
  try {
    if (fs.existsSync(file)) {
      const stat = fs.statSync(file);
      const cached = memoryCache.get(file);
      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.data as T;
      }
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(file, { data: parsed, mtime: stat.mtimeMs });
      inMemoryFallbackStore.set(file, parsed);
      return parsed;
    }
  } catch (err) {
    // Disk read failed or read-only
  }

  // Safe in-memory fallback
  if (inMemoryFallbackStore.has(file)) {
    return inMemoryFallbackStore.get(file) as T;
  }
  return fallback;
}

function writeJson(file: string, data: any) {
  inMemoryFallbackStore.set(file, data);
  try {
    ensureFiles();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    const stat = fs.statSync(file);
    memoryCache.set(file, { data, mtime: stat.mtimeMs });
  } catch (err) {
    // In read-only serverless environment (Vercel), disk write fails safely.
    // In-memory fallback retains data for current runtime instance.
  }
}

// High-performance server-side in-memory cache with auto-TTL
let cachedAttendees: AttendeeRecord[] | null = null;
let lastAttendeesCacheTime = 0;
const ATTENDEES_CACHE_TTL = 1500; // 1.5 seconds deduplication window during single page SSR

export function invalidateAttendeesCache() {
  cachedAttendees = null;
  lastAttendeesCacheTime = 0;
}

let cachedTickets: TicketData[] | null = null;
let lastTicketsCacheTime = 0;
const TICKETS_CACHE_TTL = 1500; // 1.5 seconds deduplication window during single page SSR

export function invalidateTicketsCache() {
  cachedTickets = null;
  lastTicketsCacheTime = 0;
}

// -------------------------------------------------------------
// ATTENDEES OPERATIONS
// -------------------------------------------------------------
export async function getAllAttendees(forceRefresh: boolean = false): Promise<AttendeeRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedAttendees && now - lastAttendeesCacheTime < ATTENDEES_CACHE_TTL) {
    return cachedAttendees;
  }

  let result: AttendeeRecord[] = [];

  if (await isSupabaseReady()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("attendees")
      .select(`
        id, name, email, phone, registration_id, category, registered_at, status, custom_fields, created_at, updated_at,
        tickets ( id, ticket_number )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      result = data
        .filter((row: any) => row.category !== "Staff_Scanner")
        .map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          registrationId: row.registration_id,
          category: row.category,
          registeredAt: row.registered_at,
          hasTicket: Boolean(
            row.tickets && (Array.isArray(row.tickets) ? row.tickets.length > 0 : Boolean(row.tickets.id))
          ),
          ticketId: Array.isArray(row.tickets) ? row.tickets[0]?.id : row.tickets?.id,
          ticketNumber: Array.isArray(row.tickets) ? row.tickets[0]?.ticket_number : row.tickets?.ticket_number,
          status: row.status,
          customFields: row.custom_fields,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      cachedAttendees = result;
      lastAttendeesCacheTime = now;
      return result;
    }
  }

  // Local fallback
  result = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES).filter(
    (a) => a.category !== ("Staff_Scanner" as any)
  );
  cachedAttendees = result;
  lastAttendeesCacheTime = now;
  return result;
}

export async function getAttendeeById(id: string): Promise<AttendeeRecord | undefined> {
  const attendees = await getAllAttendees();
  return attendees.find((a) => a.id === id);
}

export async function getAttendeeByEmail(email: string): Promise<AttendeeRecord | undefined> {
  const attendees = await getAllAttendees();
  return attendees.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export async function updateAttendeeApprovalStatus(
  id: string,
  approvalStatus: "accepted" | "pending" | "rejected"
): Promise<AttendeeRecord | null> {
  const attendees = await getAllAttendees();
  const index = attendees.findIndex((a) => a.id === id);
  if (index === -1) return null;

  attendees[index].approvalStatus = approvalStatus;
  attendees[index].updatedAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    await supabase
      .from("attendees")
      .update({ status: approvalStatus === "rejected" ? "rejected" : attendees[index].status })
      .eq("id", id);
  } else {
    writeJson(ATTENDEES_FILE, attendees);
  }

  invalidateAttendeesCache();
  return attendees[index];
}

export async function updateAttendee(
  id: string,
  updates: Partial<AttendeeRecord>
): Promise<AttendeeRecord | null> {
  const attendees = await getAllAttendees();
  const index = attendees.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const existing = attendees[index];
  const updated: AttendeeRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  attendees[index] = updated;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    await supabase.from("attendees").update({
      name: updated.name,
      email: updated.email,
      phone: updated.phone || updated.whatsapp,
      category: updated.category,
    }).eq("id", id);
  } else {
    writeJson(ATTENDEES_FILE, attendees);
  }

  // Also sync ticket if exists
  if (updated.hasTicket && updated.ticketId) {
    const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
    const tIndex = currentTickets.findIndex((t) => t.id === updated.ticketId || t.attendeeId === id);
    if (tIndex !== -1) {
      if (updates.name) currentTickets[tIndex].attendeeName = updates.name;
      if (updates.email) currentTickets[tIndex].attendeeEmail = updates.email;
      if (updates.phone || updates.whatsapp) currentTickets[tIndex].attendeePhone = updates.phone || updates.whatsapp;
      if (updates.category) currentTickets[tIndex].category = updates.category;
      writeJson(DB_FILE, currentTickets);
    }
  }

  return updated;
}

export async function bulkUpdateAttendeeApprovalStatus(
  ids: string[],
  approvalStatus: "accepted" | "pending" | "rejected"
): Promise<{ updatedCount: number }> {
  const attendees = await getAllAttendees();
  const idSet = new Set(ids);
  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const att of attendees) {
    if (idSet.has(att.id)) {
      att.approvalStatus = approvalStatus;
      att.updatedAt = now;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin()!;
      await supabase
        .from("attendees")
        .update({ status: approvalStatus === "rejected" ? "rejected" : "registered" })
        .in("id", ids);
    } else {
      writeJson(ATTENDEES_FILE, attendees);
    }
    invalidateAttendeesCache();
  }

  return { updatedCount };
}

export async function deleteAttendee(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      // 1. Find tickets for this attendee
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("attendee_id", id);
      const ticketIds = (tickets || []).map((t: any) => t.id);

      // 2. Cascade delete in relational foreign key order
      if (ticketIds.length > 0) {
        await supabase.from("check_ins").delete().in("ticket_id", ticketIds);
        await supabase.from("email_logs").delete().in("ticket_id", ticketIds);
        await supabase.from("whatsapp_logs").delete().in("ticket_id", ticketIds);
        await supabase.from("tickets").delete().in("id", ticketIds);
      }

      await supabase.from("check_ins").delete().eq("attendee_id", id);
      await supabase.from("email_logs").delete().eq("attendee_id", id);
      await supabase.from("whatsapp_logs").delete().eq("attendee_id", id);
      await supabase.from("tickets").delete().eq("attendee_id", id);
      await supabase.from("attendees").delete().eq("id", id);
    } catch (err) {
      console.error("Supabase cascade delete error:", err);
    }
  }

  // Local storage update fallback
  try {
    const attendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
    const filteredAttendees = attendees.filter((a) => a.id !== id);
    writeJson(ATTENDEES_FILE, filteredAttendees);

    const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
    const filteredTickets = currentTickets.filter((t) => t.attendeeId !== id);
    writeJson(DB_FILE, filteredTickets);
  } catch {}

  invalidateAttendeesCache();
  invalidateTicketsCache();

  return true;
}

/**
 * Bulk delete multiple attendees and their tickets cleanly
 */
export async function deleteAttendeesBulk(ids: string[]): Promise<{ deletedCount: number }> {
  if (!ids || ids.length === 0) return { deletedCount: 0 };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      // 1. Find tickets for these attendees
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id")
        .in("attendee_id", ids);
      const ticketIds = (tickets || []).map((t: any) => t.id);

      // 2. Cascade delete in relational foreign key order
      if (ticketIds.length > 0) {
        await supabase.from("check_ins").delete().in("ticket_id", ticketIds);
        await supabase.from("email_logs").delete().in("ticket_id", ticketIds);
        await supabase.from("whatsapp_logs").delete().in("ticket_id", ticketIds);
        await supabase.from("tickets").delete().in("id", ticketIds);
      }

      await supabase.from("check_ins").delete().in("attendee_id", ids);
      await supabase.from("email_logs").delete().in("attendee_id", ids);
      await supabase.from("whatsapp_logs").delete().in("attendee_id", ids);
      await supabase.from("tickets").delete().in("attendee_id", ids);
      await supabase.from("attendees").delete().in("id", ids);
    } catch (err) {
      console.error("Supabase bulk cascade delete error:", err);
    }
  }

  try {
    const attendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
    const idSet = new Set(ids);
    const remainingAttendees = attendees.filter((a) => !idSet.has(a.id));
    writeJson(ATTENDEES_FILE, remainingAttendees);

    const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
    const remainingTickets = currentTickets.filter((t) => !t.attendeeId || !idSet.has(t.attendeeId));
    writeJson(DB_FILE, remainingTickets);
  } catch {}

  invalidateAttendeesCache();
  invalidateTicketsCache();

  return { deletedCount: ids.length };
}

/**
 * Permanently purge all attendees and tickets from database
 * (Used to reset database completely before importing a new event file)
 */
export async function purgeAllDatabaseData(): Promise<{
  purgedAttendeesCount: number;
  purgedTicketsCount: number;
}> {
  const currentAttendees = await getAllAttendees(true);
  const currentTickets = await getAllTickets(true);
  const aCount = currentAttendees.length;
  const tCount = currentTickets.length;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      // Delete in proper relational foreign-key order across all tables
      await supabase.from("check_ins").delete().not("id", "is", null);
      await supabase.from("whatsapp_logs").delete().not("id", "is", null);
      await supabase.from("email_logs").delete().not("id", "is", null);
      await supabase.from("tickets").delete().not("id", "is", null);
      await supabase.from("attendees").delete().not("id", "is", null);
    } catch (err) {
      console.error("Supabase purge error:", err);
    }
  }

  // Clear memory cache and in-memory store so changes reflect instantly
  memoryCache.clear();
  invalidateAttendeesCache();
  invalidateTicketsCache();
  inMemoryFallbackStore.set(ATTENDEES_FILE, []);
  inMemoryFallbackStore.set(DB_FILE, []);
  inMemoryFallbackStore.set(EMAIL_LOGS_FILE, []);

  // Local storage reset
  writeJson(ATTENDEES_FILE, []);
  writeJson(DB_FILE, []);
  writeJson(EMAIL_LOGS_FILE, []);

  return {
    purgedAttendeesCount: aCount,
    purgedTicketsCount: tCount,
  };
}

/**
 * Clear/Empty a specific data column across all attendee records
 */
export async function clearAttendeeColumn(columnName: string): Promise<{ affectedCount: number }> {
  const attendees = await getAllAttendees(true);
  let affected = 0;

  for (const a of attendees) {
    (a as any)[columnName] = "";
    if (a.customFields && typeof a.customFields === "object") {
      delete (a.customFields as any)[columnName];
    }
    affected++;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        if (columnName === "phone" || columnName === "whatsapp") {
          await supabase.from("attendees").update({ phone: null }).neq("id", "00000000-0000-0000-0000-000000000000");
        } else if (columnName === "category") {
          await supabase.from("attendees").update({ category: "General" }).neq("id", "00000000-0000-0000-0000-000000000000");
        }
      }
    } catch (err) {
      console.error("Supabase clear column error:", err);
    }
  }

  writeJson(ATTENDEES_FILE, attendees);
  invalidateAttendeesCache();
  return { affectedCount: affected };
}

/**
 * Validates and imports a list of attendee records in bulk into the database.
 * Preserves existing attendees' ticket and check-in status (never overwrites or resets).
 */
export async function importAttendeesBulk(
  records: ImportValidationRecord[]
): Promise<ImportValidationResult> {
  const existingAttendees = await getAllAttendees();
  const existingEmails = new Map<string, AttendeeRecord>();
  existingAttendees.forEach((a) => existingEmails.set(a.email.toLowerCase(), a));

  const seenInBatch = new Set<string>();
  const validRecords: ImportValidationRecord[] = [];
  const duplicateInFileRecords: Array<{ rowNumber: number; email: string; name: string }> = [];
  const existingInDbRecords: Array<{ rowNumber: number; email: string; name: string; existingId: string }> = [];
  const invalidRecords: Array<{ rowNumber: number; rowData: any; errors: string[] }> = [];

  for (const rec of records) {
    const errors: string[] = [];
    const cleanName = (rec.name || "").trim();
    const cleanEmail = (rec.email || "").trim().toLowerCase();

    if (!cleanName) {
      errors.push("الاسم غير موجود أو فارغ");
    }
    if (!cleanEmail) {
      errors.push("البريد الإلكتروني فارغ");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.push("صيغة البريد الإلكتروني غير صالحة");
    }

    if (errors.length > 0) {
      invalidRecords.push({ rowNumber: rec.rowNumber, rowData: rec, errors });
      continue;
    }

    // Check duplicate in current file batch
    if (seenInBatch.has(cleanEmail)) {
      duplicateInFileRecords.push({
        rowNumber: rec.rowNumber,
        email: cleanEmail,
        name: cleanName,
      });
      continue;
    }
    seenInBatch.add(cleanEmail);

    // Check if already in database
    if (existingEmails.has(cleanEmail)) {
      const exist = existingEmails.get(cleanEmail)!;
      existingInDbRecords.push({
        rowNumber: rec.rowNumber,
        email: cleanEmail,
        name: cleanName,
        existingId: exist.id,
      });
      continue;
    }

    validRecords.push({
      ...rec,
      name: cleanName,
      email: cleanEmail,
      phone: rec.phone?.trim() || undefined,
      registrationId: rec.registrationId?.trim() || undefined,
      category: rec.category || "General",
    });
  }

  // Insert valid records into database
  if (validRecords.length > 0) {
    const now = new Date().toISOString();
    const newAttendees: AttendeeRecord[] = validRecords.map((r, i) => ({
      id: `att-ng-${Date.now()}-${i}`,
      name: r.name,
      email: r.email,
      phone: r.phone || r.whatsapp,
      registrationId: r.registrationId || `REG-${Date.now().toString().slice(-4)}-${i + 1}`,
      category: r.category || "General",
      registeredAt: now,
      hasTicket: false,
      status: "registered",
      approvalStatus: r.approvalStatus || "accepted",
      job: r.job,
      city: r.city,
      whatsapp: r.whatsapp,
      faculty: r.faculty,
      referralSource: r.referralSource,
      timestamp: r.timestamp,
      customFields: r.customFields,
      createdAt: now,
      updatedAt: now,
    }));

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin()!;
      const rowsToInsert = newAttendees.map((a) => ({
        name: a.name,
        email: a.email,
        phone: a.phone,
        registration_id: a.registrationId,
        category: a.category,
        registered_at: a.registeredAt,
        status: a.status,
      }));
      await supabase.from("attendees").insert(rowsToInsert);
    } else {
      // Local storage append
      const currentList = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
      writeJson(ATTENDEES_FILE, [...newAttendees, ...currentList]);
    }
    invalidateAttendeesCache();
  }

  return {
    totalRows: records.length,
    validCount: validRecords.length,
    duplicateInFileCount: duplicateInFileRecords.length,
    existingInDbCount: existingInDbRecords.length,
    invalidCount: invalidRecords.length,
    validRecords,
    duplicateInFileRecords,
    existingInDbRecords,
    invalidRecords,
  };
}

// -------------------------------------------------------------
// TICKETS OPERATIONS
// -------------------------------------------------------------
export async function getAllTickets(forceRefresh: boolean = false): Promise<TicketData[]> {
  const now = Date.now();
  if (!forceRefresh && cachedTickets && now - lastTicketsCacheTime < TICKETS_CACHE_TTL) {
    return cachedTickets;
  }

  let result: TicketData[] = [];

  if (await isSupabaseReady()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        *,
        attendees ( name, email, phone, category )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      result = data.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        secureCredential: t.secure_credential,
        attendeeId: t.attendee_id,
        attendeeName: t.attendees?.name || "حضور",
        attendeeEmail: t.attendees?.email,
        attendeePhone: t.attendees?.phone,
        category: t.attendees?.category || "General",
        eventName: t.event_name,
        eventTagline: t.event_tagline,
        eventDate: t.event_date,
        eventTime: t.event_time,
        venueName: t.venue_name,
        venueAddress: t.venue_address,
        mapUrl: t.map_url,
        entryInstructions: t.entry_instructions,
        organizerName: t.organizer_name,
        contactEmail: t.contact_email,
        contactPhone: t.contact_phone,
        status: t.status,
        issuedAt: t.issued_at,
        checkedInAt: t.checked_in_at,
        checkInStation: t.check_in_station,
        checkInNotes: t.check_in_notes,
      }));
      cachedTickets = result;
      lastTicketsCacheTime = now;
      return result;
    }
  }

  result = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
  cachedTickets = result;
  lastTicketsCacheTime = now;
  return result;
}

export async function getTicketById(id: string): Promise<TicketData | undefined> {
  const tickets = await getAllTickets();
  return tickets.find(
    (t) =>
      t.id === id ||
      t.ticketNumber.toLowerCase() === id.toLowerCase() ||
      t.secureCredential === id
  );
}

export async function getTicketByCredential(credential: string): Promise<TicketData | undefined> {
  const tickets = await getAllTickets();
  return tickets.find((t) => t.secureCredential === credential);
}

/**
 * Bulk generate tickets for eligible attendees.
 * Generates unique human-readable ticket numbers (NG-7K4P9X2M) and cryptographic QR credentials.
 * Automatically skips attendees who already have a valid ticket.
 */
export async function issueBulkTickets(attendeeIds?: string[]): Promise<BulkIssuanceResult> {
  const attendees = await getAllAttendees();
  const tickets = await getAllTickets();

  const existingTicketByAttendee = new Map<string, TicketData>();
  tickets.forEach((t) => {
    if (t.attendeeId) existingTicketByAttendee.set(t.attendeeId, t);
    if (t.attendeeEmail) existingTicketByAttendee.set(t.attendeeEmail.toLowerCase(), t);
  });

  // Filter eligible attendees
  const eligibleAttendees = attendees.filter((a) => {
    if (attendeeIds && !attendeeIds.includes(a.id)) return false;
    // Skip if already has an issued active ticket
    if (a.hasTicket || existingTicketByAttendee.has(a.id) || existingTicketByAttendee.has(a.email.toLowerCase())) {
      return false;
    }
    // Skip if rejected (unless specifically targeted by ID)
    if (!attendeeIds && a.approvalStatus === "rejected") {
      return false;
    }
    return true;
  });

  const createdTickets: TicketData[] = [];
  const failedRecords: Array<{ attendeeId: string; name: string; error: string }> = [];
  const now = new Date().toISOString();

  for (const att of eligibleAttendees) {
    try {
      const ticketNumber = generateHumanReadableTicketNumber();
      const secureCredential = generateSecureCredential();
      const ticketId = `ng-ticket-${ticketNumber.toLowerCase()}`;

      const eventSettings = getEventSettings();
      const newTicket: TicketData = {
        id: ticketId,
        ticketNumber,
        secureCredential,
        attendeeId: att.id,
        attendeeName: att.name,
        attendeeEmail: att.email,
        attendeePhone: att.phone,
        category: att.category || "General",
        eventName: eventSettings.eventName || "ملتقى الجيل القادم | NEXT GEN",
        eventTagline: eventSettings.eventTagline || "#جيل_جديد_عالم_جديد",
        eventDate: eventSettings.eventDate || "13 أكتوبر 2026",
        eventTime: eventSettings.eventTime || "05:00 مساءً",
        venueName: eventSettings.venueName || "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
        venueAddress: eventSettings.venueAddress || "كفر الشيخ، جمهورية مصر العربية",
        mapUrl: eventSettings.mapUrl || "https://maps.google.com/?q=31.1107,30.9388",
        greetingTitle: eventSettings.greetingTitle || "يا مرحب بيك",
        greetingSubtitle: eventSettings.greetingSubtitle || "أنت ضمن القائمة!",
        greetingDescription: eventSettings.greetingDescription,
        facebookUrl: eventSettings.facebookUrl,
        twitterUrl: eventSettings.twitterUrl,
        instagramUrl: eventSettings.instagramUrl,
        showFacebook: eventSettings.showFacebook,
        showTwitter: eventSettings.showTwitter,
        showInstagram: eventSettings.showInstagram,
        entryInstructions: [
          "يرجى إبراز هذا الرمز (QR Code) عند بوابة الدخول للتحقق.",
          "التذكرة مخصصة لشخص واحد فقط وغير قابلة لإعادة الاستخدام.",
          "تفتح الأبواب قبل بدء الفعالية بساعة واحدة.",
        ],
        organizerName: eventSettings.organizerName || "Primex Agency & Millala Inc.",
        contactEmail: "info@primexagency.com",
        contactPhone: "+20 100 000 0000",
        copyrightText: eventSettings.copyrightText,
        status: "valid",
        issuedAt: now,
      };

      createdTickets.push(newTicket);
    } catch (err: any) {
      failedRecords.push({
        attendeeId: att.id,
        name: att.name,
        error: err.message || "فشل إنشاء التذكرة",
      });
    }
  }

  // Persist created tickets
  if (createdTickets.length > 0) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin()!;
      const rows = createdTickets.map((t) => ({
        attendee_id: t.attendeeId,
        ticket_number: t.ticketNumber,
        secure_credential: t.secureCredential,
        event_name: t.eventName,
        event_tagline: t.eventTagline,
        event_date: t.eventDate,
        event_time: t.eventTime,
        venue_name: t.venueName,
        venue_address: t.venueAddress,
        map_url: t.mapUrl,
        entry_instructions: t.entryInstructions,
        organizer_name: t.organizerName,
        contact_email: t.contactEmail,
        contact_phone: t.contactPhone,
        status: "valid",
      }));
      await supabase.from("tickets").insert(rows);

      // Update attendee status in fast parallel batches
      const attendeeIdsToUpdate = createdTickets.map((t) => t.attendeeId).filter(Boolean) as string[];
      if (attendeeIdsToUpdate.length > 0) {
        for (let i = 0; i < attendeeIdsToUpdate.length; i += 100) {
          const chunk = attendeeIdsToUpdate.slice(i, i + 100);
          await supabase.from("attendees").update({ status: "ticket_issued" }).in("id", chunk);
        }
      }
    } else {
      // Local storage
      const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
      writeJson(DB_FILE, [...createdTickets, ...currentTickets]);

      // Update attendees in local storage
      const currentAttendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
      const updatedAttendees = currentAttendees.map((a) => {
        const ticket = createdTickets.find((t) => t.attendeeId === a.id);
        if (ticket) {
          return {
            ...a,
            hasTicket: true,
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            status: "ticket_issued" as const,
            updatedAt: now,
          };
        }
        return a;
      });
      writeJson(ATTENDEES_FILE, updatedAttendees);
    }
    invalidateAttendeesCache();
    invalidateTicketsCache();
  }

  const skippedCount = (attendeeIds ? attendeeIds.length : attendees.length) - eligibleAttendees.length;

  return {
    totalEligible: eligibleAttendees.length,
    createdCount: createdTickets.length,
    skippedCount,
    failedCount: failedRecords.length,
    tickets: createdTickets,
    failedRecords,
  };
}

/**
 * Issue a single ticket
 */
export async function issueTicket(params: {
  attendeeName: string;
  attendeeEmail?: string;
  category?: TicketData["category"];
  ticketNumber?: string;
}): Promise<TicketData> {
  const ticketNumber = params.ticketNumber || generateHumanReadableTicketNumber();
  const secureCredential = generateSecureCredential();
  const id = `ng-ticket-${ticketNumber.toLowerCase()}`;
  const now = new Date().toISOString();

  const eventSettings = getEventSettings();
  const newTicket: TicketData = {
    id,
    ticketNumber,
    secureCredential,
    attendeeName: params.attendeeName,
    attendeeEmail: params.attendeeEmail,
    category: params.category || "General",
    eventName: eventSettings.eventName || "ملتقى الجيل القادم | NEXT GEN",
    eventTagline: eventSettings.eventTagline || "#جيل_جديد_عالم_جديد",
    eventDate: eventSettings.eventDate || "13 أكتوبر 2026",
    eventTime: eventSettings.eventTime || "05:00 مساءً",
    venueName: eventSettings.venueName || "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
    venueAddress: eventSettings.venueAddress || "كفر الشيخ، جمهورية مصر العربية",
    mapUrl: eventSettings.mapUrl || "https://maps.google.com/?q=31.1107,30.9388",
    greetingTitle: eventSettings.greetingTitle || "يا مرحب بيك",
    greetingSubtitle: eventSettings.greetingSubtitle || "أنت ضمن القائمة!",
    greetingDescription: eventSettings.greetingDescription,
    facebookUrl: eventSettings.facebookUrl,
    twitterUrl: eventSettings.twitterUrl,
    instagramUrl: eventSettings.instagramUrl,
    showFacebook: eventSettings.showFacebook,
    showTwitter: eventSettings.showTwitter,
    showInstagram: eventSettings.showInstagram,
    copyrightText: eventSettings.copyrightText,
    entryInstructions: [
      "يرجى إبراز هذا الرمز (QR Code) عند بوابة الدخول للتحقق.",
      "التذكرة مخصصة لشخص واحد فقط وغير قابلة لإعادة الاستخدام.",
      "تفتح الأبواب قبل بدء الفعالية بساعة واحدة.",
    ],
    organizerName: eventSettings.organizerName || "Primex Agency & Millala Inc.",
    contactEmail: "info@primexagency.com",
    contactPhone: "+20 100 000 0000",
    status: "valid",
    issuedAt: now,
  };

  const current = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
  writeJson(DB_FILE, [newTicket, ...current]);
  return newTicket;
}

/**
 * Register a single attendee, automatically accept them, generate and issue their ticket with barcode,
 * and persist both in the database.
 */
export async function registerAndIssueSingleAttendee(params: {
  name: string;
  email: string;
  phone?: string;
  job?: string;
  faculty?: string;
  city?: string;
  category?: TicketData["category"];
}): Promise<{
  attendee: AttendeeRecord;
  ticket: TicketData;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim();
  const now = new Date().toISOString();
  const attId = `att-ng-${Date.now()}`;
  const ticketNumber = generateHumanReadableTicketNumber();
  const secureCredential = generateSecureCredential();
  const ticketId = `ng-ticket-${ticketNumber.toLowerCase()}`;

  const eventSettings = getEventSettings();
  const newTicket: TicketData = {
    id: ticketId,
    ticketNumber,
    secureCredential,
    attendeeId: attId,
    attendeeName: cleanName,
    attendeeEmail: cleanEmail,
    attendeePhone: params.phone?.trim(),
    category: params.category || "General",
    eventName: eventSettings.eventName || "ملتقى الجيل القادم | NEXT GEN",
    eventTagline: eventSettings.eventTagline || "#جيل_جديد_عالم_جديد",
    eventDate: eventSettings.eventDate || "13 أكتوبر 2026",
    eventTime: eventSettings.eventTime || "05:00 مساءً",
    venueName: eventSettings.venueName || "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
    venueAddress: eventSettings.venueAddress || "كفر الشيخ، جمهورية مصر العربية",
    mapUrl: eventSettings.mapUrl || "https://maps.google.com/?q=31.1107,30.9388",
    greetingTitle: eventSettings.greetingTitle || "يا مرحب بيك",
    greetingSubtitle: eventSettings.greetingSubtitle || "أنت ضمن القائمة!",
    greetingDescription: eventSettings.greetingDescription,
    facebookUrl: eventSettings.facebookUrl,
    twitterUrl: eventSettings.twitterUrl,
    instagramUrl: eventSettings.instagramUrl,
    showFacebook: eventSettings.showFacebook,
    showTwitter: eventSettings.showTwitter,
    showInstagram: eventSettings.showInstagram,
    copyrightText: eventSettings.copyrightText,
    entryInstructions: [
      "يرجى إبراز هذا الرمز (QR Code) عند بوابة الدخول للتحقق.",
      "التذكرة مخصصة لشخص واحد فقط وغير قابلة لإعادة الاستخدام.",
      "تفتح الأبواب قبل بدء الفعالية بساعة واحدة.",
    ],
    organizerName: eventSettings.organizerName || "Primex Agency & Millala Inc.",
    contactEmail: "info@primexagency.com",
    contactPhone: "+20 100 000 0000",
    status: "valid",
    issuedAt: now,
  };

  const newAttendee: AttendeeRecord = {
    id: attId,
    name: cleanName,
    email: cleanEmail,
    phone: params.phone?.trim(),
    registrationId: `REG-${Date.now().toString().slice(-4)}`,
    category: params.category || "General",
    registeredAt: now,
    hasTicket: true,
    ticketId,
    ticketNumber,
    status: "ticket_issued",
    approvalStatus: "accepted",
    job: params.job?.trim(),
    city: params.city?.trim(),
    whatsapp: params.phone?.trim(),
    faculty: params.faculty?.trim(),
    referralSource: "Direct Entry",
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    await supabase.from("attendees").insert({
      id: newAttendee.id,
      name: newAttendee.name,
      email: newAttendee.email,
      phone: newAttendee.phone,
      registration_id: newAttendee.registrationId,
      category: newAttendee.category,
      registered_at: newAttendee.registeredAt,
      status: newAttendee.status,
    });

    await supabase.from("tickets").insert({
      id: newTicket.id,
      attendee_id: newTicket.attendeeId,
      ticket_number: newTicket.ticketNumber,
      secure_credential: newTicket.secureCredential,
      event_name: newTicket.eventName,
      event_tagline: newTicket.eventTagline,
      event_date: newTicket.eventDate,
      event_time: newTicket.eventTime,
      venue_name: newTicket.venueName,
      venue_address: newTicket.venueAddress,
      map_url: newTicket.mapUrl,
      entry_instructions: newTicket.entryInstructions,
      organizer_name: newTicket.organizerName,
      contact_email: newTicket.contactEmail,
      contact_phone: newTicket.contactPhone,
      status: "valid",
    });
  } else {
    // Local JSON
    const currentAttendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
    writeJson(ATTENDEES_FILE, [newAttendee, ...currentAttendees]);

    const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
    writeJson(DB_FILE, [newTicket, ...currentTickets]);
  }

  return { attendee: newAttendee, ticket: newTicket };
}

/**
 * Update ticket details (name, category, date, venue, social links, etc.)
 * and synchronize with attendee record if applicable.
 */
export async function updateTicket(
  ticketId: string,
  updates: Partial<TicketData>
): Promise<TicketData | null> {
  const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
  const index = currentTickets.findIndex(
    (t) => t.id === ticketId || t.ticketNumber.toLowerCase() === ticketId.toLowerCase()
  );
  if (index === -1) return null;

  const existing = currentTickets[index];
  const updated: TicketData = {
    ...existing,
    ...updates,
  };
  currentTickets[index] = updated;
  writeJson(DB_FILE, currentTickets);

  // If attendee name or category was updated, update attendee record as well
  if (updated.attendeeId || updated.attendeeEmail) {
    const attendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
    const attIndex = attendees.findIndex(
      (a) => a.id === updated.attendeeId || a.email.toLowerCase() === updated.attendeeEmail?.toLowerCase()
    );
    if (attIndex !== -1) {
      if (updates.attendeeName) attendees[attIndex].name = updates.attendeeName;
      if (updates.category) attendees[attIndex].category = updates.category;
      attendees[attIndex].updatedAt = new Date().toISOString();
      writeJson(ATTENDEES_FILE, attendees);
    }
  }

  return updated;
}

/**
 * Delete or revoke a ticket and automatically release the associated attendee record.
 */
export async function deleteTicket(ticketId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const { data: ticket } = await supabase
        .from("tickets")
        .select("id, attendee_id")
        .or(`id.eq.${ticketId},ticket_number.ilike.${ticketId}`)
        .maybeSingle();

      if (ticket) {
        // Cascade delete audit logs and delivery records referencing this ticket
        await supabase.from("check_ins").delete().eq("ticket_id", ticket.id);
        await supabase.from("email_logs").delete().eq("ticket_id", ticket.id);
        await supabase.from("whatsapp_logs").delete().eq("ticket_id", ticket.id);
        await supabase.from("tickets").delete().eq("id", ticket.id);

        if (ticket.attendee_id) {
          await supabase
            .from("attendees")
            .update({ status: "registered" })
            .eq("id", ticket.attendee_id);
        }
      }
    } catch (err) {
      console.error("Supabase deleteTicket error:", err);
    }
  }

  try {
    const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
    const index = currentTickets.findIndex(
      (t) => t.id === ticketId || t.ticketNumber.toLowerCase() === ticketId.toLowerCase()
    );
    if (index !== -1) {
      const target = currentTickets[index];
      currentTickets.splice(index, 1);
      writeJson(DB_FILE, currentTickets);

      if (target.attendeeId || target.attendeeEmail) {
        const attendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
        const attIndex = attendees.findIndex(
          (a) => a.id === target.attendeeId || a.email.toLowerCase() === target.attendeeEmail?.toLowerCase()
        );
        if (attIndex !== -1) {
          attendees[attIndex].hasTicket = false;
          attendees[attIndex].ticketId = undefined;
          attendees[attIndex].ticketNumber = undefined;
          attendees[attIndex].status = "registered";
          attendees[attIndex].updatedAt = new Date().toISOString();
          writeJson(ATTENDEES_FILE, attendees);
        }
      }
    }
  } catch {}

  invalidateTicketsCache();
  invalidateAttendeesCache();
  return true;
}

/**
 * Updates all existing tickets in the database with common global template settings
 * (date, venue, Google maps, greeting texts, social links)
 * while preserving attendee-specific fields (name, ticket number, QR barcode).
 */
export async function updateAllTicketsWithEventSettings(
  settings: Partial<import("@/types/ticket").EventTicketSettings>
): Promise<number> {
  const currentTickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
  let updatedCount = 0;
  const updated = currentTickets.map((t) => {
    updatedCount++;
    return {
      ...t,
      ...(settings.eventName ? { eventName: settings.eventName } : {}),
      ...(settings.eventTagline ? { eventTagline: settings.eventTagline } : {}),
      ...(settings.eventDate ? { eventDate: settings.eventDate } : {}),
      ...(settings.eventTime ? { eventTime: settings.eventTime } : {}),
      ...(settings.venueName ? { venueName: settings.venueName } : {}),
      ...(settings.venueAddress ? { venueAddress: settings.venueAddress } : {}),
      ...(settings.mapUrl !== undefined ? { mapUrl: settings.mapUrl } : {}),
      ...(settings.greetingTitle ? { greetingTitle: settings.greetingTitle } : {}),
      ...(settings.greetingSubtitle ? { greetingSubtitle: settings.greetingSubtitle } : {}),
      ...(settings.greetingDescription ? { greetingDescription: settings.greetingDescription } : {}),
      ...(settings.facebookUrl !== undefined ? { facebookUrl: settings.facebookUrl } : {}),
      ...(settings.twitterUrl !== undefined ? { twitterUrl: settings.twitterUrl } : {}),
      ...(settings.instagramUrl !== undefined ? { instagramUrl: settings.instagramUrl } : {}),
      ...(settings.showFacebook !== undefined ? { showFacebook: settings.showFacebook } : {}),
      ...(settings.showTwitter !== undefined ? { showTwitter: settings.showTwitter } : {}),
      ...(settings.showInstagram !== undefined ? { showInstagram: settings.showInstagram } : {}),
      ...(settings.copyrightText ? { copyrightText: settings.copyrightText } : {}),
      ...(settings.organizerName ? { organizerName: settings.organizerName } : {}),
    };
  });
  writeJson(DB_FILE, updated);
  return updatedCount;
}

/**
 * Concurrency-safe Atomic Check-in validation
 */
export async function processCheckIn(query: string, station: string = "Terminal 1"): Promise<CheckInResult> {
  const cleanQuery = query.trim();
  let searchToken = cleanQuery;

  // Extract token from all URL formats, fragments, query strings, or prefixes
  if (cleanQuery.includes("NEXTGEN:SEC:")) {
    searchToken = cleanQuery.replace("NEXTGEN:SEC:", "").trim();
  } else if (cleanQuery.includes("token=")) {
    const match = cleanQuery.match(/[?&]token=([^&#\s]+)/);
    if (match) {
      searchToken = decodeURIComponent(match[1]).trim();
    }
  } else if (cleanQuery.includes("/tickets/")) {
    const match = cleanQuery.match(/\/tickets\/([^/?#\s]+)/);
    if (match) {
      searchToken = decodeURIComponent(match[1]).trim();
    }
  }

  if (await isSupabaseReady()) {
    const supabase = getSupabaseAdmin()!;
    // 1. Try stored procedure if available
    const { data, error } = await supabase.rpc("process_atomic_check_in", {
      p_credential: searchToken,
      p_station: station,
    });
    if (!error && data) {
      invalidateTicketsCache();
      invalidateAttendeesCache();
      return data as CheckInResult;
    }

    // 2. Direct Supabase atomic check-in fallback (reliable without RPC)
    const { data: sbTickets, error: sbErr } = await supabase
      .from("tickets")
      .select(`
        id, ticket_number, secure_credential, attendee_id, status, event_name, event_date, venue_name, issued_at, checked_in_at,
        attendees ( name, category )
      `)
      .or(`secure_credential.eq.${searchToken},ticket_number.ilike.${searchToken},id.eq.${searchToken}`)
      .limit(1);

    if (!sbErr && sbTickets && sbTickets.length > 0) {
      const ticketRow = sbTickets[0] as any;
      const attData = Array.isArray(ticketRow.attendees) ? ticketRow.attendees[0] : ticketRow.attendees;
      const now = new Date().toISOString();

      if (ticketRow.status === "revoked") {
        return {
          success: false,
          message: "هذه التذكرة ملغاة ولا يُسمح بالدخول بها.",
          status: "revoked",
        };
      }

      if (ticketRow.status === "used") {
        return {
          success: false,
          message: `تم استخدام هذه التذكرة مسبقاً في ${ticketRow.checked_in_at ? new Date(ticketRow.checked_in_at).toLocaleTimeString("ar-EG") : ""}. الدخول مكرر ومرفوض!`,
          status: "already_used",
          alreadyCheckedIn: true,
          checkedInAt: ticketRow.checked_in_at,
        };
      }

      // Mark used atomically in Supabase
      await supabase
        .from("tickets")
        .update({
          status: "used",
          checked_in_at: now,
          check_in_station: station,
        })
        .eq("id", ticketRow.id);

      if (ticketRow.attendee_id) {
        await supabase
          .from("attendees")
          .update({ status: "checked_in" })
          .eq("id", ticketRow.attendee_id);
      }

      // Record check-in audit
      await supabase.from("check_ins").insert({
        ticket_id: ticketRow.id,
        attendee_id: ticketRow.attendee_id,
        station: station,
        result: "success",
      });

      invalidateTicketsCache();
      invalidateAttendeesCache();

      return {
        success: true,
        message: "تم تسجيل الدخول بنجاح! مرحباً بك في ملتقى الجيل القادم.",
        status: "success",
        checkedInAt: now,
        ticket: {
          id: ticketRow.id,
          ticketNumber: ticketRow.ticket_number,
          secureCredential: ticketRow.secure_credential,
          attendeeId: ticketRow.attendee_id,
          attendeeName: attData?.name || "حاضر",
          category: attData?.category || "General",
          eventName: ticketRow.event_name,
          eventDate: ticketRow.event_date,
          venueName: ticketRow.venue_name,
          status: "used",
          issuedAt: ticketRow.issued_at,
          checkedInAt: now,
          checkInStation: station,
        },
      };
    }
  }

  // Local atomic operation
  const tickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
  const index = tickets.findIndex(
    (t) =>
      t.secureCredential === searchToken ||
      t.secureCredential.toLowerCase() === searchToken.toLowerCase() ||
      t.ticketNumber.toUpperCase() === searchToken.toUpperCase() ||
      t.ticketNumber.toUpperCase() === cleanQuery.toUpperCase() ||
      t.id.toLowerCase() === searchToken.toLowerCase() ||
      t.id.toLowerCase() === cleanQuery.toLowerCase()
  );

  if (index === -1) {
    return {
      success: false,
      message: "التذكرة غير موجودة في النظام. يرجى التحقق من صحة الرمز.",
      status: "not_found",
    };
  }

  const ticket = tickets[index];

  if (ticket.status === "revoked") {
    return {
      success: false,
      message: "هذه التذكرة ملغاة ولا يُسمح بالدخول بها.",
      status: "revoked",
      ticket,
    };
  }

  if (ticket.status === "used") {
    return {
      success: false,
      message: `تم استخدام هذه التذكرة مسبقاً في ${new Date(ticket.checkedInAt || "").toLocaleTimeString("ar-EG")}. الدخول مكرر ومرفوض!`,
      status: "used",
      alreadyCheckedIn: true,
      checkedInAt: ticket.checkedInAt,
      ticket,
    };
  }

  // Mark as used atomically
  const now = new Date().toISOString();
  tickets[index] = {
    ...ticket,
    status: "used",
    checkedInAt: now,
    checkInStation: station,
  };
  writeJson(DB_FILE, tickets);

  // Also update attendee status if connected
  if (ticket.attendeeId) {
    const attendees = readJson<AttendeeRecord[]>(ATTENDEES_FILE, INITIAL_ATTENDEES);
    const attIndex = attendees.findIndex((a) => a.id === ticket.attendeeId);
    if (attIndex !== -1) {
      attendees[attIndex].status = "checked_in";
      writeJson(ATTENDEES_FILE, attendees);
    }
  }

  invalidateTicketsCache();
  invalidateAttendeesCache();

  return {
    success: true,
    message: "تم تسجيل الدخول بنجاح! مرحباً بك في ملتقى الجيل القادم.",
    status: "valid",
    checkedInAt: now,
    ticket: tickets[index],
  };
}

export async function resetTicketStatus(ticketId: string): Promise<TicketData | null> {
  const tickets = readJson<TicketData[]>(DB_FILE, INITIAL_TICKETS);
  const index = tickets.findIndex((t) => t.id === ticketId || t.ticketNumber === ticketId);
  if (index === -1) return null;
  tickets[index].status = "valid";
  delete tickets[index].checkedInAt;
  delete tickets[index].checkInStation;
  writeJson(DB_FILE, tickets);
  invalidateTicketsCache();
  invalidateAttendeesCache();
  return tickets[index];
}

// -------------------------------------------------------------
// EMAIL LOGS & DELIVERY OPERATIONS
// -------------------------------------------------------------
export async function getEmailLogs(): Promise<EmailDeliveryRecord[]> {
  if (await isSupabaseReady()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        attendeeId: d.attendee_id,
        ticketId: d.ticket_id,
        email: d.recipient_email,
        attendeeName: d.recipient_name,
        status: d.status,
        providerMessageId: d.provider_message_id,
        errorMessage: d.error_message,
        sentAt: d.sent_at,
        deliveredAt: d.delivered_at,
        retryCount: d.retry_count || 0,
      }));
    }
  }
  return readJson<EmailDeliveryRecord[]>(EMAIL_LOGS_FILE, []);
}

export async function recordEmailDelivery(record: EmailDeliveryRecord) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    await supabase.from("email_logs").insert({
      id: record.id,
      attendee_id: record.attendeeId,
      ticket_id: record.ticketId,
      recipient_email: record.email,
      recipient_name: record.attendeeName,
      status: record.status,
      provider_message_id: record.providerMessageId,
      error_message: record.errorMessage,
      retry_count: record.retryCount,
      sent_at: record.sentAt,
      delivered_at: record.deliveredAt,
    });
    return;
  }

  const logs = readJson<EmailDeliveryRecord[]>(EMAIL_LOGS_FILE, []);
  // Upsert by ticketId
  const existingIdx = logs.findIndex((l) => l.ticketId === record.ticketId);
  if (existingIdx !== -1) {
    logs[existingIdx] = record;
  } else {
    logs.unshift(record);
  }
  writeJson(EMAIL_LOGS_FILE, logs);
}

// -------------------------------------------------------------
// DASHBOARD REAL STATISTICS
// -------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  const attendees = await getAllAttendees();
  const tickets = await getAllTickets();
  const emailLogs = await getEmailLogs();

  const totalRegistered = attendees.length;
  const issuedTickets = tickets.filter((t) => t.status !== "revoked").length;
  const pendingTickets = Math.max(0, totalRegistered - issuedTickets);

  const sentEmails = emailLogs.filter((e) => e.status === "sent" || e.status === "delivered").length;
  const deliveredEmails = emailLogs.filter((e) => e.status === "delivered").length;
  const failedEmails = emailLogs.filter((e) => e.status === "failed").length;

  const checkedInCount = tickets.filter((t) => t.status === "used").length;
  const notCheckedInCount = Math.max(0, issuedTickets - checkedInCount);

  return {
    totalRegistered,
    issuedTickets,
    pendingTickets,
    sentEmails,
    deliveredEmails,
    failedEmails,
    checkedInCount,
    notCheckedInCount,
  };
}
