// Script to sync local JSON data cleanly into Supabase
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and keys are not configured in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function sync() {
  console.log('Connecting to Supabase at:', supabaseUrl);

  // 1. Sync Attendees
  const attendeesFile = path.join(__dirname, '..', 'data', 'attendees.json');
  const validAttendeeIds = new Set();

  if (fs.existsSync(attendeesFile)) {
    const attendees = JSON.parse(fs.readFileSync(attendeesFile, 'utf-8'));
    console.log(`Found ${attendees.length} local attendees. Sanitizing emails...`);

    const seenEmails = new Set();
    const sanitizedAttendees = [];

    attendees.forEach((a, idx) => {
      let email = (a.email || `attendee_${idx + 1}@example.com`).trim().toLowerCase();
      if (seenEmails.has(email)) {
        const [user, domain] = email.split('@');
        email = `${user}+dup${idx}@${domain || 'example.com'}`;
      }
      seenEmails.add(email);
      validAttendeeIds.add(a.id);

      sanitizedAttendees.push({
        id: a.id,
        name: a.name || 'حضور',
        email: email,
        phone: a.phone || a.whatsapp || null,
        registration_id: a.registrationId || null,
        category: a.category || 'General',
        registered_at: a.registeredAt || new Date().toISOString(),
        status: a.status || 'registered',
        custom_fields: {
          job: a.job || null,
          city: a.city || null,
          faculty: a.faculty || null,
          referralSource: a.referralSource || null,
          approvalStatus: a.approvalStatus || 'accepted'
        }
      });
    });

    const batchSize = 50;
    for (let i = 0; i < sanitizedAttendees.length; i += batchSize) {
      const batch = sanitizedAttendees.slice(i, i + batchSize);
      const { error } = await supabase.from('attendees').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error(`Error uploading attendees batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        console.log(`Uploaded attendees ${i + 1} - ${Math.min(i + batchSize, sanitizedAttendees.length)}`);
      }
    }
  }

  // 2. Sync Tickets
  const ticketsFile = path.join(__dirname, '..', 'data', 'tickets.json');
  if (fs.existsSync(ticketsFile)) {
    const tickets = JSON.parse(fs.readFileSync(ticketsFile, 'utf-8'));
    console.log(`Found ${tickets.length} local tickets. Ensuring valid foreign keys...`);

    const sanitizedTickets = [];
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      let attendeeId = t.attendeeId;

      // If attendeeId doesn't exist, link to first or create placeholder attendee
      if (!attendeeId || !validAttendeeIds.has(attendeeId)) {
        const placeholderId = `att-placeholder-${i + 1}`;
        const placeholderEmail = `guest_${i + 1}@nextgen.internal`;
        await supabase.from('attendees').upsert({
          id: placeholderId,
          name: t.attendeeName || `ضيف تذكرة ${t.ticketNumber}`,
          email: placeholderEmail,
          category: t.category || 'General',
          status: 'ticket_issued'
        }, { onConflict: 'id' });
        validAttendeeIds.add(placeholderId);
        attendeeId = placeholderId;
      }

      sanitizedTickets.push({
        id: t.id,
        attendee_id: attendeeId,
        ticket_number: t.ticketNumber,
        secure_credential: t.secureCredential,
        status: t.status || 'valid',
        event_name: t.eventName || 'ملتقى الجيل القادم | NEXT GEN',
        event_tagline: t.eventTagline || '#جيل_جديد_عالم_جديد',
        event_date: t.eventDate || '13 أكتوبر 2026',
        event_time: t.eventTime || '05:00 مساءً',
        venue_name: t.venueName || 'المسرح المدرسي كفر الشيخ ، القوات المسلحه',
        venue_address: t.venueAddress || 'كفر الشيخ، جمهورية مصر العربية',
        map_url: t.mapUrl || 'https://maps.google.com/?q=31.1107,30.9388',
        entry_instructions: t.entryInstructions || [],
        organizer_name: t.organizerName || 'Primex Agency & Millala Inc.',
        contact_email: t.contactEmail || 'info@primexagency.com',
        contact_phone: t.contactPhone || '+20 100 000 0000',
        issued_at: t.issuedAt || new Date().toISOString(),
        checked_in_at: t.checkedInAt || null,
        check_in_station: t.check_in_station || t.checkInStation || null
      });
    }

    const batchSize = 50;
    for (let i = 0; i < sanitizedTickets.length; i += batchSize) {
      const batch = sanitizedTickets.slice(i, i + batchSize);
      const { error } = await supabase.from('tickets').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error(`Error uploading tickets batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        console.log(`Uploaded tickets ${i + 1} - ${Math.min(i + batchSize, sanitizedTickets.length)}`);
      }
    }
  }

  console.log('🎉 Full synchronization to Supabase completed successfully!');
}

sync().catch(err => {
  console.error('Migration execution error:', err);
});
