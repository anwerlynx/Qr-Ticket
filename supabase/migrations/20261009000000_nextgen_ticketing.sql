-- Next Gen 2026 Ticketing & Attendance System
-- Supabase PostgreSQL Schema Migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ATTENDEES TABLE
CREATE TABLE IF NOT EXISTS public.attendees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    registration_id TEXT,
    category TEXT DEFAULT 'General',
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered',
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rapid lookups and search
CREATE INDEX IF NOT EXISTS idx_attendees_email ON public.attendees (email);
CREATE INDEX IF NOT EXISTS idx_attendees_name ON public.attendees (name);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON public.attendees (status);

-- 2. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attendee_id TEXT NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL UNIQUE,
    secure_credential TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'valid',
    event_name TEXT NOT NULL DEFAULT 'ملتقى الجيل القادم | NEXT GEN',
    event_tagline TEXT DEFAULT '#جيل_جديد_عالم_جديد',
    event_date TEXT NOT NULL DEFAULT '13 أكتوبر 2026',
    event_time TEXT DEFAULT '05:00 مساءً',
    venue_name TEXT NOT NULL DEFAULT 'المسرح المدرسي كفر الشيخ ، القوات المسلحه',
    venue_address TEXT DEFAULT 'كفر الشيخ، جمهورية مصر العربية',
    map_url TEXT DEFAULT 'https://maps.google.com/?q=31.1107,30.9388',
    entry_instructions JSONB DEFAULT '["يرجى إبراز هذا الرمز (QR Code) عند بوابة الدخول للتحقق.", "التذكرة مخصصة لشخص واحد فقط وغير قابلة لإعادة الاستخدام.", "تفتح الأبواب قبل بدء الفعالية بساعة واحدة."]'::jsonb,
    organizer_name TEXT DEFAULT 'Primex Agency & Millala Inc.',
    contact_email TEXT DEFAULT 'info@primexagency.com',
    contact_phone TEXT DEFAULT '+20 100 000 0000',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_at TIMESTAMPTZ,
    check_in_station TEXT,
    check_in_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_attendee_active_ticket UNIQUE (attendee_id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_secure_credential ON public.tickets (secure_credential);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);

-- 3. CHECK-INS AUDIT LOG
CREATE TABLE IF NOT EXISTS public.check_ins (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
    attendee_id TEXT REFERENCES public.attendees(id) ON DELETE CASCADE,
    station TEXT NOT NULL DEFAULT 'Terminal 1',
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    operator_id TEXT,
    result TEXT NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_check_ins_ticket_id ON public.check_ins (ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_scanned_at ON public.check_ins (scanned_at);

-- 4. EMAIL LOGS (DELIVERY TRACKING)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attendee_id TEXT REFERENCES public.attendees(id) ON DELETE CASCADE,
    ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    provider_message_id TEXT,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_ticket_id ON public.email_logs (ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs (recipient_email);

-- 5. EVENT SETTINGS
CREATE TABLE IF NOT EXISTS public.event_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    event_name TEXT NOT NULL DEFAULT 'ملتقى الجيل القادم | NEXT GEN',
    event_date TEXT NOT NULL DEFAULT '13 أكتوبر 2026',
    event_time TEXT DEFAULT '05:00 مساءً',
    venue_name TEXT NOT NULL DEFAULT 'المسرح المدرسي كفر الشيخ ، القوات المسلحه',
    venue_address TEXT DEFAULT 'كفر الشيخ، جمهورية مصر العربية',
    map_url TEXT DEFAULT 'https://maps.google.com/?q=31.1107,30.9388',
    organizer_name TEXT DEFAULT 'Primex Agency & Millala Inc.',
    contact_email TEXT DEFAULT 'info@primexagency.com',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default event settings
INSERT INTO public.event_settings (id, event_name, event_date, event_time, venue_name, venue_address, map_url)
VALUES (
    'default',
    'ملتقى الجيل القادم | NEXT GEN',
    '13 أكتوبر 2026',
    '05:00 مساءً',
    'المسرح المدرسي كفر الشيخ ، القوات المسلحه',
    'كفر الشيخ، جمهورية مصر العربية',
    'https://maps.google.com/?q=31.1107,30.9388'
)
ON CONFLICT (id) DO NOTHING;

-- 6. ATOMIC CHECK-IN STORED FUNCTION (Concurrency safe, prevents race conditions)
CREATE OR REPLACE FUNCTION public.process_atomic_check_in(
    p_credential TEXT,
    p_station TEXT DEFAULT 'Terminal 1'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_ticket RECORD;
    v_attendee RECORD;
BEGIN
    -- Lock row exclusively to prevent race conditions from simultaneous scans
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE (secure_credential = p_credential OR ticket_number = p_credential)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'التذكرة غير موجودة في النظام.',
            'status', 'not_found'
        );
    END IF;

    SELECT * INTO v_attendee
    FROM public.attendees
    WHERE id = v_ticket.attendee_id;

    IF v_ticket.status = 'revoked' THEN
        INSERT INTO public.check_ins (ticket_id, attendee_id, station, result, notes)
        VALUES (v_ticket.id, v_ticket.attendee_id, p_station, 'rejected', 'Ticket revoked');

        RETURN jsonb_build_object(
            'success', false,
            'message', 'هذه التذكرة ملغاة ولا يُسمح بالدخول بها.',
            'status', 'revoked',
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    IF v_ticket.status = 'used' THEN
        INSERT INTO public.check_ins (ticket_id, attendee_id, station, result, notes)
        VALUES (v_ticket.id, v_ticket.attendee_id, p_station, 'duplicate', 'Already checked in');

        RETURN jsonb_build_object(
            'success', false,
            'message', 'تم استخدام هذه التذكرة مسبقاً! الدخول مكرر ومرفوض.',
            'status', 'used',
            'alreadyCheckedIn', true,
            'checkedInAt', v_ticket.checked_in_at,
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- Update ticket atomically
    UPDATE public.tickets
    SET status = 'used',
        checked_in_at = NOW(),
        check_in_station = p_station,
        updated_at = NOW()
    WHERE id = v_ticket.id;

    -- Update attendee status
    UPDATE public.attendees
    SET status = 'checked_in',
        updated_at = NOW()
    WHERE id = v_ticket.attendee_id;

    -- Record successful check-in
    INSERT INTO public.check_ins (ticket_id, attendee_id, station, result)
    VALUES (v_ticket.id, v_ticket.attendee_id, p_station, 'success');

    -- Re-fetch updated ticket
    SELECT * INTO v_ticket FROM public.tickets WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تسجيل الدخول بنجاح! مرحباً بك في ملتقى الجيل القادم.',
        'status', 'valid',
        'checkedInAt', v_ticket.checked_in_at,
        'ticket', jsonb_build_object(
            'id', v_ticket.id,
            'ticketNumber', v_ticket.ticket_number,
            'attendeeName', v_attendee.name,
            'category', v_attendee.category,
            'status', 'used',
            'checkedInAt', v_ticket.checked_in_at
        )
    );
END;
$$;

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read of ticket by secure credential (for attendees viewing their own ticket web page)
CREATE POLICY "Public read ticket by secure credential"
ON public.tickets
FOR SELECT
USING (true);

-- Allow server service role full access
CREATE POLICY "Service role full access on attendees" ON public.attendees FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on tickets" ON public.tickets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on check_ins" ON public.check_ins FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on email_logs" ON public.email_logs FOR ALL USING (auth.role() = 'service_role');
