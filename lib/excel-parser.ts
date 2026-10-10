import * as XLSX from "xlsx";
import { ImportColumnMapping, ImportValidationRecord } from "@/types/ticket";

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  suggestedMapping: ImportColumnMapping;
}

const NAME_KEYWORDS = [
  "الاسم بالكامل",
  "الاسم",
  "اسم الحضور",
  "اسم المشارك",
  "اسم الطالب",
  "full name",
  "name",
  "attendee name",
  "participant name",
  "fullname",
];

const EMAIL_KEYWORDS = [
  "البريد الإلكتروني",
  "البريد الالكتروني",
  "الإيميل",
  "الايميل",
  "البريد",
  "email",
  "e-mail",
  "email address",
  "mail",
];

const PHONE_KEYWORDS = [
  "رقم الهاتف",
  "رقم الموبايل",
  "الهاتف",
  "الموبايل",
  "الجوال",
  "phone",
  "phone number",
  "mobile",
  "mobile number",
  "tel",
  "whatsapp",
];

const ID_KEYWORDS = [
  "رقم التسجيل",
  "كود التسجيل",
  "معرف التسجيل",
  "رقم الطلب",
  "id",
  "reg id",
  "registration id",
  "submission id",
  "ticket number",
];

const CATEGORY_KEYWORDS = [
  "الفئة",
  "نوع التذكرة",
  "فئة الحضور",
  "الصفة",
  "category",
  "ticket type",
  "role",
  "type",
];

const JOB_KEYWORDS = [
  "الوظيفة",
  "المهنة",
  "العمل",
  "المسمى الوظيفي",
  "job",
  "occupation",
  "title",
];

const CITY_KEYWORDS = [
  "العنوان",
  "المحافظة",
  "المدينة",
  "محل الإقامة",
  "address",
  "city",
  "location",
];

const WHATSAPP_KEYWORDS = [
  "رقم الواتساب",
  "واتساب",
  "الواتس",
  "رقم الواتس",
  "whatsapp",
  "wa",
];

const FACULTY_KEYWORDS = [
  "اسم الجهه / الكلية",
  "اسم الجهه",
  "اسم الجهة",
  "الكلية",
  "الجامعة",
  "الجهة",
  "المعهد",
  "faculty",
  "university",
  "college",
  "school",
];

const REFERRAL_KEYWORDS = [
  "عرفت الايفنت منين",
  "مصدر المعرفة",
  "كيف عرفت عنا",
  "referral",
  "source",
];

const TIMESTAMP_KEYWORDS = [
  "طابع زمني",
  "وقت التسجيل",
  "تاريخ التسجيل",
  "timestamp",
  "date",
];

const APPROVAL_KEYWORDS = [
  "حالة القبول",
  "القبول",
  "حالة التسجيل",
  "مقبول",
  "approval",
  "accepted",
  "status",
];

function findBestColumn(headers: string[], keywords: string[]): string {
  for (const h of headers) {
    const cleanHeader = h.trim().toLowerCase();
    for (const kw of keywords) {
      if (cleanHeader === kw.toLowerCase() || cleanHeader.includes(kw.toLowerCase())) {
        return h;
      }
    }
  }
  return "";
}

/**
 * Parses raw ArrayBuffer or Buffer of .xlsx, .xls, or .csv
 */
export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Buffer): ParsedSheetData {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with raw header row
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      suggestedMapping: { nameColumn: "", emailColumn: "" },
    };
  }

  const headers = Object.keys(rawRows[0]);

  const suggestedMapping: ImportColumnMapping = {
    nameColumn: findBestColumn(headers, NAME_KEYWORDS) || headers[0] || "",
    emailColumn: findBestColumn(headers, EMAIL_KEYWORDS) || (headers.length > 1 ? headers[1] : ""),
    phoneColumn: findBestColumn(headers, PHONE_KEYWORDS) || undefined,
    registrationIdColumn: findBestColumn(headers, ID_KEYWORDS) || undefined,
    categoryColumn: findBestColumn(headers, CATEGORY_KEYWORDS) || undefined,
    jobColumn: findBestColumn(headers, JOB_KEYWORDS) || undefined,
    cityColumn: findBestColumn(headers, CITY_KEYWORDS) || undefined,
    whatsappColumn: findBestColumn(headers, WHATSAPP_KEYWORDS) || undefined,
    facultyColumn: findBestColumn(headers, FACULTY_KEYWORDS) || undefined,
    referralColumn: findBestColumn(headers, REFERRAL_KEYWORDS) || undefined,
    approvalStatusColumn: findBestColumn(headers, APPROVAL_KEYWORDS) || undefined,
  };

  return {
    headers,
    rows: rawRows,
    totalRows: rawRows.length,
    suggestedMapping,
  };
}

/**
 * Maps rows using chosen column mapping into normalized attendee records
 */
export function mapRowsToAttendees(
  rows: Record<string, any>[],
  mapping: ImportColumnMapping
): ImportValidationRecord[] {
  return rows.map((row, idx) => {
    const name = String(row[mapping.nameColumn] || "").trim();
    const email = String(row[mapping.emailColumn] || "").trim();
    const phone = mapping.phoneColumn ? String(row[mapping.phoneColumn] || "").trim() : undefined;
    const registrationId = mapping.registrationIdColumn
      ? String(row[mapping.registrationIdColumn] || "").trim()
      : undefined;

    let category: any = "General";
    if (mapping.categoryColumn && row[mapping.categoryColumn]) {
      const val = String(row[mapping.categoryColumn]).trim().toLowerCase();
      if (val.includes("vip") || val.includes("خاص")) category = "VIP";
      else if (val.includes("متحدث") || val.includes("speaker")) category = "Speaker";
      else if (val.includes("منظم") || val.includes("organizer")) category = "Organizer";
      else if (val.includes("إعلام") || val.includes("media")) category = "Media";
    }

    const job = mapping.jobColumn ? String(row[mapping.jobColumn] || "").trim() : undefined;
    const city = mapping.cityColumn ? String(row[mapping.cityColumn] || "").trim() : undefined;
    const whatsapp = mapping.whatsappColumn ? String(row[mapping.whatsappColumn] || "").trim() : undefined;
    const faculty = mapping.facultyColumn ? String(row[mapping.facultyColumn] || "").trim() : undefined;
    const referralSource = mapping.referralColumn ? String(row[mapping.referralColumn] || "").trim() : undefined;

    let approvalStatus: any = "accepted";
    if (mapping.approvalStatusColumn && row[mapping.approvalStatusColumn]) {
      const st = String(row[mapping.approvalStatusColumn]).trim().toLowerCase();
      if (st.includes("مرفوض") || st.includes("reject")) approvalStatus = "rejected";
      else if (st.includes("معلق") || st.includes("pending") || st.includes("مراجعة")) approvalStatus = "pending";
      else approvalStatus = "accepted";
    }

    return {
      rowNumber: idx + 2, // 1-based index plus header row
      name,
      email,
      phone: phone || whatsapp || undefined,
      registrationId: registrationId || undefined,
      category,
      job,
      city,
      whatsapp,
      faculty,
      referralSource,
      approvalStatus,
      customFields: row,
    };
  });
}
