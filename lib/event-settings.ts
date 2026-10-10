import fs from "fs";
import path from "path";
import { EventTicketSettings } from "@/types/ticket";

const SETTINGS_FILE = path.join(process.cwd(), "data", "event_settings.json");

export const DEFAULT_EVENT_SETTINGS: EventTicketSettings = {
  eventName: "ملتقى الجيل القادم | NEXT GEN",
  eventTagline: "#جيل_جديد_عالم_جديد",
  eventDate: "13 أكتوبر 2026",
  eventTime: "05:00 مساءً",
  venueName: "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
  venueAddress: "كفر الشيخ، جمهورية مصر العربية",
  mapUrl: "https://maps.google.com/?q=31.1107,30.9388",
  greetingTitle: "يا مرحب بيك",
  greetingSubtitle: "أنت ضمن القائمة!",
  greetingDescription: "تذكرتك جاهزة، ونتطلع إلى لقائك في تجربة مليئة بالأفكار الجديدة والتواصل والإلهام.",
  facebookUrl: "https://facebook.com",
  twitterUrl: "https://twitter.com",
  instagramUrl: "https://instagram.com",
  showFacebook: true,
  showTwitter: true,
  showInstagram: true,
  organizerName: "Primex Agency & Millala Inc.",
  copyrightText: "© 2026 Millala Inc. & Primex Agency. All rights reserved.",
};

/**
 * Get current event and ticket settings from disk with fallback to defaults
 */
let inMemoryEventSettings: EventTicketSettings = { ...DEFAULT_EVENT_SETTINGS };

/**
 * Get current event and ticket settings from disk with fallback to defaults
 */
export function getEventSettings(): EventTicketSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
      inMemoryEventSettings = { ...DEFAULT_EVENT_SETTINGS, ...JSON.parse(content) };
      return inMemoryEventSettings;
    }
  } catch (err) {
    // Read-only or file missing
  }
  return inMemoryEventSettings;
}

/**
 * Save event and ticket settings to disk with in-memory fallback
 */
export function saveEventSettings(settings: Partial<EventTicketSettings>): EventTicketSettings {
  const current = getEventSettings();
  const updated: EventTicketSettings = {
    ...current,
    ...settings,
  };
  inMemoryEventSettings = updated;

  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    // Read-only filesystem on Vercel
  }

  return updated;
}
