-- Next Gen 2026 Ticketing System
-- Migration: Gate Scanner Staff & Meta WhatsApp Cloud API Delivery Schema

-- 1. SCANNER STAFF TABLE
CREATE TABLE IF NOT EXISTS public.scanner_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    gate TEXT NOT NULL DEFAULT 'البوابة 1 - المدخل الرئيسي',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    total_scans INT DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scanner_staff_phone ON public.scanner_staff (phone);
CREATE INDEX IF NOT EXISTS idx_scanner_staff_status ON public.scanner_staff (status);

-- 2. WHATSAPP LOGS (DELIVERY TRACKING)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attendee_id TEXT REFERENCES public.attendees(id) ON DELETE SET NULL,
    ticket_id TEXT REFERENCES public.tickets(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
    template_name TEXT,
    wam_id TEXT, -- Meta WhatsApp Message ID
    error_message TEXT,
    retry_count INT DEFAULT 0,
    media_url TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs (status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient_phone ON public.whatsapp_logs (recipient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_ticket_id ON public.whatsapp_logs (ticket_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_wam_id ON public.whatsapp_logs (wam_id);

-- 3. WHATSAPP SETTINGS & CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    mode TEXT NOT NULL DEFAULT 'test', -- 'test' | 'live'
    test_recipient_phone TEXT DEFAULT '+201000000000',
    default_template_name TEXT DEFAULT 'hello_world',
    default_language TEXT DEFAULT 'en_US',
    auto_send_on_issuance BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.whatsapp_settings (id, mode, default_template_name, default_language)
VALUES ('default', 'test', 'hello_world', 'en_US')
ON CONFLICT (id) DO NOTHING;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.scanner_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on scanner_staff" ON public.scanner_staff FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on whatsapp_logs" ON public.whatsapp_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on whatsapp_settings" ON public.whatsapp_settings FOR ALL USING (auth.role() = 'service_role');

-- Allow public read/write for scanner staff gate app (secured by PIN hash at application level)
CREATE POLICY "Public access on scanner_staff" ON public.scanner_staff FOR ALL USING (true);
CREATE POLICY "Public read on whatsapp_logs" ON public.whatsapp_logs FOR SELECT USING (true);
CREATE POLICY "Public read on whatsapp_settings" ON public.whatsapp_settings FOR SELECT USING (true);
