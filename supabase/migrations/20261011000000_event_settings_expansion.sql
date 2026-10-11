-- Next Gen 2026 Ticketing System
-- Migration: Event Settings Schema Expansion & Dynamic Ticket Data

ALTER TABLE public.event_settings
  ADD COLUMN IF NOT EXISTS event_tagline TEXT,
  ADD COLUMN IF NOT EXISTS greeting_title TEXT DEFAULT 'يا مرحب بيك',
  ADD COLUMN IF NOT EXISTS greeting_subtitle TEXT DEFAULT 'أنت ضمن القائمة!',
  ADD COLUMN IF NOT EXISTS greeting_description TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS show_facebook BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_twitter BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_instagram BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS copyright_text TEXT;

-- Update default settings record with event details
UPDATE public.event_settings
SET
  event_name = COALESCE(event_name, 'ملتقى الجيل القادم | NEXT GEN'),
  event_date = '13 أكتوبر 2026',
  event_time = '05:00 مساءً',
  venue_name = 'المسرح المدرسي كفر الشيخ ، القوات المسلحه',
  venue_address = 'كفر الشيخ، جمهورية مصر العربية',
  map_url = 'https://maps.google.com/?q=31.1107,30.9388'
WHERE id = 'default';
