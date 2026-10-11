import fs from "fs";
import path from "path";
import { EventTicketSettings } from "@/types/ticket";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase";

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

let inMemoryEventSettings: EventTicketSettings = { ...DEFAULT_EVENT_SETTINGS };
let lastSettingsFetchTime = 0;
const SETTINGS_CACHE_TTL = 3000;

/**
 * Get current event and ticket settings from Supabase database with fallback to disk/defaults
 */
export async function getEventSettings(): Promise<EventTicketSettings> {
  const now = Date.now();
  if (inMemoryEventSettings && now - lastSettingsFetchTime < SETTINGS_CACHE_TTL) {
    return inMemoryEventSettings;
  }

  // 1. Primary Source: Supabase public.event_settings
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase
          .from("event_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();

        if (!error && data) {
          const dbSettings: EventTicketSettings = {
            eventName: data.event_name || DEFAULT_EVENT_SETTINGS.eventName,
            eventTagline: data.event_tagline || DEFAULT_EVENT_SETTINGS.eventTagline,
            eventDate: data.event_date || DEFAULT_EVENT_SETTINGS.eventDate,
            eventTime: data.event_time || DEFAULT_EVENT_SETTINGS.eventTime,
            venueName: data.venue_name || DEFAULT_EVENT_SETTINGS.venueName,
            venueAddress: data.venue_address || DEFAULT_EVENT_SETTINGS.venueAddress,
            mapUrl: data.map_url || DEFAULT_EVENT_SETTINGS.mapUrl,
            greetingTitle: data.greeting_title || DEFAULT_EVENT_SETTINGS.greetingTitle,
            greetingSubtitle: data.greeting_subtitle || DEFAULT_EVENT_SETTINGS.greetingSubtitle,
            greetingDescription: data.greeting_description || DEFAULT_EVENT_SETTINGS.greetingDescription,
            facebookUrl: data.facebook_url || DEFAULT_EVENT_SETTINGS.facebookUrl,
            twitterUrl: data.twitter_url || DEFAULT_EVENT_SETTINGS.twitterUrl,
            instagramUrl: data.instagram_url || DEFAULT_EVENT_SETTINGS.instagramUrl,
            showFacebook: data.show_facebook ?? DEFAULT_EVENT_SETTINGS.showFacebook,
            showTwitter: data.show_twitter ?? DEFAULT_EVENT_SETTINGS.showTwitter,
            showInstagram: data.show_instagram ?? DEFAULT_EVENT_SETTINGS.showInstagram,
            organizerName: data.organizer_name || DEFAULT_EVENT_SETTINGS.organizerName,
            copyrightText: data.copyright_text || DEFAULT_EVENT_SETTINGS.copyrightText,
          };
          inMemoryEventSettings = dbSettings;
          lastSettingsFetchTime = now;
          return dbSettings;
        }
      }
    } catch (err) {
      console.warn("Could not query Supabase event_settings, using fallback:", err);
    }
  }

  // 2. Secondary Source: Local JSON disk
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
      inMemoryEventSettings = { ...DEFAULT_EVENT_SETTINGS, ...JSON.parse(content) };
      lastSettingsFetchTime = now;
      return inMemoryEventSettings;
    }
  } catch (err) {
    // Read-only or file missing
  }

  return inMemoryEventSettings;
}

/**
 * Synchronous accessor for in-memory event settings
 */
export function getEventSettingsSync(): EventTicketSettings {
  return inMemoryEventSettings || DEFAULT_EVENT_SETTINGS;
}

/**
 * Save event and ticket settings to Supabase database (and local disk/in-memory fallback)
 */
export async function saveEventSettings(
  settings: Partial<EventTicketSettings>
): Promise<EventTicketSettings> {
  const current = await getEventSettings();
  const updated: EventTicketSettings = {
    ...current,
    ...settings,
  };
  inMemoryEventSettings = updated;
  lastSettingsFetchTime = Date.now();

  // 1. Primary persistence: Supabase public.event_settings
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from("event_settings").upsert({
          id: "default",
          event_name: updated.eventName,
          event_tagline: updated.eventTagline,
          event_date: updated.eventDate,
          event_time: updated.eventTime,
          venue_name: updated.venueName,
          venue_address: updated.venueAddress,
          map_url: updated.mapUrl,
          greeting_title: updated.greetingTitle,
          greeting_subtitle: updated.greetingSubtitle,
          greeting_description: updated.greetingDescription,
          facebook_url: updated.facebookUrl,
          twitter_url: updated.twitterUrl,
          instagram_url: updated.instagramUrl,
          show_facebook: updated.showFacebook,
          show_twitter: updated.showTwitter,
          show_instagram: updated.showInstagram,
          organizer_name: updated.organizerName,
          copyright_text: updated.copyrightText,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to save event settings in Supabase:", err);
    }
  }

  // 2. Local file disk fallback
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
