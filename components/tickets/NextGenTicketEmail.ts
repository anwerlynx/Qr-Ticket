import { TicketData, EventTicketSettings } from "@/types/ticket";
import { formatQRPayload, generateQRCodeDataUrl } from "@/lib/qr";

export interface RenderTicketEmailOptions {
  hostUrl?: string;
  qrImgSrc?: string;
  heroImgSrc?: string;
  isWebPreview?: boolean;
  eventSettings?: Partial<EventTicketSettings>;
}

/**
 * Pixel-Perfect HTML Email matching Figma Node 114:2224 (Template A - Mobile):
 * - Vertical VIP pass format (Max 430px wide, 100% responsive on phones)
 * - Exact royal purple gradient (#7a12eb -> #5805c9 -> #320082 -> #1e0052)
 * - Centered Primex Agency header
 * - Prominent Arabic greeting & attendee name in Lato font
 * - Futuristic 3D visual artwork
 * - Clean RTL event details (date, venue, Google maps link)
 * - Pixel/Silkscreen style ticket number & high-contrast door QR barcode
 * - Social icons and official Millala Inc. / Primex copyright
 * - Maximum deliverability & anti-spam compliance
 */
export async function renderNextGenTicketEmailHtml(
  ticket: TicketData,
  hostUrlOrOptions?: string | RenderTicketEmailOptions
): Promise<string> {
  const options: RenderTicketEmailOptions =
    typeof hostUrlOrOptions === "string"
      ? { hostUrl: hostUrlOrOptions }
      : hostUrlOrOptions || {};

  const hostUrl = options.hostUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const eventSettings = options.eventSettings;
  const qrPayload = formatQRPayload(ticket.secureCredential, hostUrl);

  // Determine QR image source (CID for emails, dataUrl for web previews)
  let qrImgSrc = options.qrImgSrc;
  if (!qrImgSrc) {
    if (options.isWebPreview) {
      qrImgSrc = await generateQRCodeDataUrl(qrPayload, { width: 300 });
    } else {
      qrImgSrc = "cid:ticket_qr_barcode";
    }
  }

  // Hero 3D artwork image src
  const heroImgSrc =
    options.heroImgSrc ||
    (options.isWebPreview ? `${hostUrl}/images/ticket_hero_art1.png` : "cid:ticket_hero_art");

  // Dynamic Content with fallbacks
  const greetingTitle = ticket.greetingTitle || eventSettings?.greetingTitle || "يا مرحب بيك";
  const greetingSubtitle = ticket.greetingSubtitle || eventSettings?.greetingSubtitle || "أنت ضمن القائمة!";
  const greetingDescription =
    ticket.greetingDescription ||
    eventSettings?.greetingDescription ||
    "تذكرتك جاهزة، ونتطلع إلى لقائك في تجربة مليئة بالأفكار الجديدة والتواصل والإلهام.";

  const eventDate = ticket.eventDate || eventSettings?.eventDate || "13 أكتوبر 2026";
  const eventTime = ticket.eventTime || eventSettings?.eventTime || "05:00 مساءً";
  const venueName = ticket.venueName || eventSettings?.venueName || "المسرح المدرسي كفر الشيخ ، القوات المسلحه";
  const mapUrl = ticket.mapUrl ?? eventSettings?.mapUrl;

  // Social Links
  const showFacebook =
    ticket.showFacebook !== undefined
      ? ticket.showFacebook
      : eventSettings?.showFacebook !== undefined
      ? eventSettings.showFacebook
      : true;
  const facebookUrl =
    ticket.facebookUrl !== undefined
      ? ticket.facebookUrl
      : eventSettings?.facebookUrl !== undefined
      ? eventSettings.facebookUrl
      : "https://facebook.com";

  const showTwitter =
    ticket.showTwitter !== undefined
      ? ticket.showTwitter
      : eventSettings?.showTwitter !== undefined
      ? eventSettings.showTwitter
      : true;
  const twitterUrl =
    ticket.twitterUrl !== undefined
      ? ticket.twitterUrl
      : eventSettings?.twitterUrl !== undefined
      ? eventSettings.twitterUrl
      : "https://twitter.com";

  const showInstagram =
    ticket.showInstagram !== undefined
      ? ticket.showInstagram
      : eventSettings?.showInstagram !== undefined
      ? eventSettings.showInstagram
      : true;
  const instagramUrl =
    ticket.instagramUrl !== undefined
      ? ticket.instagramUrl
      : eventSettings?.instagramUrl !== undefined
      ? eventSettings.instagramUrl
      : "https://instagram.com";

  const hasAnySocial =
    (showInstagram && !!instagramUrl) ||
    (showTwitter && !!twitterUrl) ||
    (showFacebook && !!facebookUrl);

  const copyrightText =
    ticket.copyrightText ||
    eventSettings?.copyrightText ||
    "© 2026 Millala Inc. & Primex Agency. All rights reserved.";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="ar">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تذكرتك: ملتقى الجيل القادم - ${ticket.attendeeName}</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@700&family=Lato:wght@400;700;900&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0d0124; font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, Arial, sans-serif; }
    
    @media only screen and (max-width: 480px) {
      .ticket-container { width: 100% !important; max-width: 100% !important; border-radius: 20px !important; }
      .ticket-pad { padding: 26px 18px !important; }
      .attendee-name { font-size: 28px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 25px 10px; background-color: #0d0124;" dir="rtl">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- FIGMA NODE 114:2224 VIP TICKET CARD (Max 420px, perfectly vertical) -->
        <table border="0" cellpadding="0" cellspacing="0" width="420" class="ticket-container" style="max-width: 420px; width: 100%; background: #4a0bb8; background: linear-gradient(180deg, #7a12eb 0%, #5805c9 42%, #320082 82%, #1e0052 100%); border-radius: 28px; border: 1px solid rgba(255, 255, 255, 0.22); overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.55); margin: 0 auto;">
          
          <tr>
            <td style="padding: 34px 24px 28px 24px;" class="ticket-pad">
              
              <!-- 1. Header: Primex Agency Logo (Figma Node 114:2280) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="color: #ffffff; font-size: 14px; font-weight: 900; letter-spacing: 2.5px; font-family: 'Lato', sans-serif;">
                          PRIMEX AGENCY
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="color: rgba(255,255,255,0.7); font-size: 10.5px; font-weight: 600; padding-top: 2px;">
                          ملتقى الجيل القادم 2026 • NEXT GEN
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 2. Welcome Headline & Attendee Name (Figma Node 114:2248) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 22px; text-align: center;">
                <tr>
                  <td align="center" style="color: #ffffff; font-size: 26px; font-weight: 900; line-height: 1.2;">
                    ${greetingTitle}
                  </td>
                </tr>
                <tr>
                  <td align="center" class="attendee-name" style="color: #ffffff; font-size: 34px; font-weight: 900; line-height: 1.2; padding: 6px 0; word-break: break-word;">
                    ${ticket.attendeeName}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: #e9d5ff; font-size: 22px; font-weight: 800; padding-bottom: 8px;">
                    ${greetingSubtitle}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.6; max-width: 330px; margin: 0 auto;">
                    ${greetingDescription}
                  </td>
                </tr>
              </table>

              <!-- 3. Futuristic 3D Visual Artwork (Figma Node 114:2291) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1b0244; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.25);">
                      <tr>
                        <td align="center" style="padding: 0; line-height: 0;">
                          <img src="${heroImgSrc}" alt="Next Gen Tech Visual" width="372" style="width: 100%; max-width: 372px; height: auto; display: block; border-radius: 13px;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 4. Event Details Section (Figma Node 114:2252 - RTL with Icons) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 26px; text-align: right;" dir="rtl">
                <tr>
                  <td style="color: #ffffff; font-size: 14px; font-weight: bold; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.15);">
                    تفاصيل الفعالية
                  </td>
                </tr>
                
                <!-- Date Row -->
                <tr>
                  <td style="padding-top: 10px; color: #ffffff; font-size: 13.5px; font-weight: 600; line-height: 1.5;">
                    🕒 ${eventDate} ${eventTime ? `• ${eventTime}` : ""}
                  </td>
                </tr>

                <!-- Venue Row -->
                <tr>
                  <td style="padding-top: 8px; color: #ffffff; font-size: 13px; font-weight: 600; line-height: 1.5;">
                    📍 ${venueName}
                  </td>
                </tr>

                <!-- Map Link Row -->
                ${mapUrl ? `
                <tr>
                  <td style="padding-top: 8px;">
                    <a href="${mapUrl}" target="_blank" style="color: #e9d5ff; font-size: 12.5px; font-weight: bold; text-decoration: underline;">
                      🗺️ المكان علي الخريطه
                    </a>
                  </td>
                </tr>
                ` : ""}
              </table>

              <!-- 5. Ticket Number & Integrated Secure QR (Figma Node 114:2264) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; text-align: center;">
                <tr>
                  <td align="center" style="color: #d8b4fe; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px;">
                    رقم التذكرة
                  </td>
                </tr>
                
                <!-- Silkscreen Pixel Font Ticket Number -->
                <tr>
                  <td align="center" style="color: #ffffff; font-family: 'Silkscreen', 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 2px; padding-bottom: 14px;">
                    ${ticket.ticketNumber}
                  </td>
                </tr>

                <!-- Door-Scanner High-Contrast Encrypted QR Code Card -->
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                      <tr>
                        <td align="center" style="line-height: 0;">
                          <img src="${qrImgSrc}" alt="QR Barcode ${ticket.ticketNumber}" width="165" height="165" style="display: block; width: 165px; height: 165px; border-radius: 8px; border: 0;" />
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px; color: #581c87; font-size: 10px; font-weight: bold; font-family: monospace;">
                          ${ticket.secureCredential.slice(0, 8)}••• | رمز دخول رسمي مشفر
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Status Badge -->
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.25); border: 1px solid rgba(52, 211, 153, 0.5); color: #a7f3d0; font-size: 11px; font-weight: bold; padding: 3px 14px; border-radius: 20px;">
                      ● تذكرة صالحة ومؤكدة للدخول
                    </span>
                  </td>
                </tr>
              </table>

              <!-- 6. Social Media Icons (Figma Node 114:2266) -->
              ${hasAnySocial ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 18px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        ${showInstagram && instagramUrl ? `
                        <td style="padding: 0 6px;">
                          <a href="${instagramUrl}" target="_blank" style="display: inline-block; background-color: rgba(255,255,255,0.18); color: #ffffff; text-decoration: none; font-size: 11px; font-weight: bold; padding: 5px 14px; border-radius: 20px;">
                            Instagram
                          </a>
                        </td>` : ""}
                        ${showTwitter && twitterUrl ? `
                        <td style="padding: 0 6px;">
                          <a href="${twitterUrl}" target="_blank" style="display: inline-block; background-color: rgba(255,255,255,0.18); color: #ffffff; text-decoration: none; font-size: 11px; font-weight: bold; padding: 5px 14px; border-radius: 20px;">
                            Twitter / X
                          </a>
                        </td>` : ""}
                        ${showFacebook && facebookUrl ? `
                        <td style="padding: 0 6px;">
                          <a href="${facebookUrl}" target="_blank" style="display: inline-block; background-color: rgba(255,255,255,0.18); color: #ffffff; text-decoration: none; font-size: 11px; font-weight: bold; padding: 5px 14px; border-radius: 20px;">
                            Facebook
                          </a>
                        </td>` : ""}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- 7. Footer & Terms (Figma Node 114:2271) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 16px;">
                <tr>
                  <td align="center" style="color: rgba(255,255,255,0.75); font-size: 10.5px; line-height: 1.6;">
                    ${copyrightText}<br />
                    تعتبر هذه التذكرة وثيقة إلكترونية رسمية صالحة للدخول مرة واحدة فقط. يرجى إبراز رمز QR عند البوابة.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
