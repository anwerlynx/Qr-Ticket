const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function linkAndUploadTickets() {
  console.log('Fetching attendees from Supabase...');
  const { data: sbAttendees, error: attErr } = await supabase.from('attendees').select('id, email, name');
  if (attErr || !sbAttendees) {
    console.error('Failed to fetch attendees:', attErr);
    return;
  }

  console.log(`Retrieved ${sbAttendees.length} attendees from Supabase.`);
  const attendeeMapByEmail = new Map();
  sbAttendees.forEach(a => attendeeMapByEmail.set(a.email.toLowerCase().trim(), a.id));

  const ticketsFile = path.join(__dirname, '..', 'data', 'tickets.json');
  const localTickets = JSON.parse(fs.readFileSync(ticketsFile, 'utf-8'));
  console.log(`Processing ${localTickets.length} local tickets...`);

  const ticketsToInsert = [];
  for (const t of localTickets) {
    const email = (t.attendeeEmail || '').toLowerCase().trim();
    let attendeeId = attendeeMapByEmail.get(email);

    if (!attendeeId) {
      // Find by attendee name if email didn't match directly
      const byName = sbAttendees.find(a => a.name.trim() === (t.attendeeName || '').trim());
      if (byName) {
        attendeeId = byName.id;
      } else {
        // Create an attendee record in Supabase for this ticket holder
        const newEmail = email || `attendee_${Date.now()}_${Math.random().toString(36).substring(7)}@nextgen.internal`;
        const { data: newAtt, error: createErr } = await supabase.from('attendees').insert({
          name: t.attendeeName || 'حضور',
          email: newEmail,
          category: t.category || 'General',
          status: 'ticket_issued'
        }).select('id').single();

        if (newAtt) {
          attendeeId = newAtt.id;
          attendeeMapByEmail.set(newEmail, attendeeId);
        }
      }
    }

    if (attendeeId) {
      ticketsToInsert.push({
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
  }

  console.log(`Inserting ${ticketsToInsert.length} mapped tickets into Supabase...`);
  const batchSize = 50;
  for (let i = 0; i < ticketsToInsert.length; i += batchSize) {
    const batch = ticketsToInsert.slice(i, i + batchSize);
    const { error: insErr } = await supabase.from('tickets').upsert(batch, { onConflict: 'ticket_number' });
    if (insErr) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} insert error:`, insErr.message);
    } else {
      console.log(`Successfully uploaded tickets ${i + 1} - ${Math.min(i + batchSize, ticketsToInsert.length)}`);
    }
  }

  // Update attendees status to 'ticket_issued'
  console.log('Updating attendees ticket statuses in Supabase...');
  for (const t of ticketsToInsert) {
    await supabase.from('attendees').update({ status: t.status === 'used' ? 'checked_in' : 'ticket_issued' }).eq('id', t.attendee_id);
  }

  console.log('✅ All tickets linked and persisted to Supabase cloud!');
}

linkAndUploadTickets().catch(console.error);
