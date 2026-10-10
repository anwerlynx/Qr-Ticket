"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Clock, MapPin, Map, ShieldCheck, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { TicketData, EventTicketSettings } from "@/types/ticket";
import { formatQRPayload, generateQRCodeDataUrl } from "@/lib/qr";

export interface NextGenFigmaTicketProps {
  ticket: TicketData;
  hostUrl?: string;
  className?: string;
  eventSettings?: Partial<EventTicketSettings>;
}

/**
 * NextGenFigmaTicket — Pixel-perfect implementation of Figma Node 114:2224 (Template A - Mobile)
 * Rich royal purple gradient (#7a12eb -> #5805c9 -> #320082 -> #1e0052),
 * Primex Agency branding, futuristic 3D hero artwork, Arabic RTL details,
 * Silkscreen/Pixel ticket number, door-scanner QR credential, and Apple-grade responsive finish.
 */
export function NextGenFigmaTicket({
  ticket,
  hostUrl,
  className = "",
  eventSettings,
}: NextGenFigmaTicketProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const payload = formatQRPayload(ticket.secureCredential, hostUrl);
    generateQRCodeDataUrl(payload, { width: 360 })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate ticket QR code:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [ticket.secureCredential, hostUrl]);

  const isUsed = ticket.status === "used";
  const isRevoked = ticket.status === "revoked";

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

  // Social Links logic
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

  return (
    <article
      dir="rtl"
      className={`relative mx-auto w-full max-w-[350px] xs:max-w-[390px] sm:max-w-[420px] overflow-hidden rounded-[24px] sm:rounded-[28px] p-4 xs:p-5 sm:p-6 text-white font-sans shadow-[0_20px_50px_rgba(74,0,176,0.35)] border border-purple-500/30 transition-all select-none ${className}`}
      style={{
        background: "linear-gradient(180deg, #7a12eb 0%, #5805c9 42%, #320082 82%, #1e0052 100%)",
      }}
      data-ticket-id={ticket.id}
      data-node-id="114:2224"
    >
      {/* Background Bottom-Left Geometric Motif (Figma Node 120:2296) */}
      <div className="pointer-events-none absolute bottom-12 -left-12 h-44 w-44 opacity-25 mix-blend-screen">
        <Image
          src="/images/ticket_pattern_bottom.svg"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      {/* 1. Header: Primex Agency Logo (Figma Node 114:2280) */}
      <header className="relative z-10 flex items-center justify-center gap-2 mb-5 pt-1">
        <div className="relative h-6 w-8 shrink-0">
          <Image
            src="/images/primex_mark.svg"
            alt="Primex"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="relative h-3.5 w-36 shrink-0">
          <Image
            src="/images/primex_agency_text.svg"
            alt="PRIMEX AGENCY"
            fill
            className="object-contain"
            priority
          />
        </div>
      </header>

      {/* 2. Welcome Headline & Attendee Name (Figma Node 114:2248) */}
      <section className="relative z-10 text-center mb-5">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white mb-0.5">
          {greetingTitle}
        </h2>
        <h1
          className="text-3xl sm:text-[34px] font-black tracking-tight text-white break-words leading-tight my-1"
          dir="auto"
        >
          {ticket.attendeeName}
        </h1>
        <div className="text-xl sm:text-2xl font-black text-purple-200 tracking-tight mb-2">
          {greetingSubtitle}
        </div>
        <p className="text-xs sm:text-[13px] text-white/85 leading-relaxed max-w-[320px] mx-auto font-normal">
          {greetingDescription}
        </p>
      </section>

      {/* 3. Futuristic 3D Visual Artwork (Figma Node 114:2291) */}
      <div className="relative z-10 mb-5 overflow-hidden rounded-[14px] border border-white/20 shadow-md">
        <div className="relative aspect-[16/9] w-full bg-purple-950/40">
          <Image
            src="/images/ticket_hero_art1.png"
            alt="Next Gen Tech Visual"
            fill
            className="object-cover"
            priority
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/60 via-transparent to-transparent pointer-events-none" />
          
          {/* Badge top-right */}
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2997ff] animate-pulse" />
              <span>Next Gen 2026</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Event Details Section (Figma Node 114:2252 - RTL) */}
      <section className="relative z-10 mb-5 space-y-2 text-right">
        <div className="flex items-center justify-between border-b border-white/15 pb-1.5 mb-2">
          <span className="text-xs font-bold text-white tracking-wide">تفاصيل الفعالية</span>
          {ticket.category && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              فئة {ticket.category}
            </span>
          )}
        </div>

        {/* Date Row */}
        <div className="flex items-center justify-end gap-2 text-xs text-white/95">
          <span className="font-semibold">{eventDate} {eventTime ? `• ${eventTime}` : ""}</span>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Venue Row */}
        <div className="flex items-center justify-end gap-2 text-xs text-white/95">
          <span className="font-semibold leading-tight">{venueName}</span>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
            <MapPin className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Map Link */}
        {mapUrl && (
          <div className="flex items-center justify-end gap-2 pt-0.5 text-xs">
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] font-bold text-purple-200 hover:text-white underline transition-colors"
            >
              المكان علي الخريطه
            </a>
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
              <Map className="h-3.5 w-3.5" />
            </div>
          </div>
        )}
      </section>

      {/* 5. Ticket Number & Integrated Secure QR (Figma Node 114:2264) */}
      <section className="relative z-10 mb-5 text-center flex flex-col items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-1">
          رقم التذكرة
        </span>

        {/* Pixel/Silkscreen Style Monospace Ticket Number Badge */}
        <div className="mb-3">
          <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white drop-shadow-md">
            {ticket.ticketNumber}
          </span>
        </div>

        {/* Door-Scanner High-Contrast Encrypted QR Code Card */}
        <div className="relative p-2.5 rounded-2xl bg-white shadow-xl border border-white/40">
          <div className="relative h-36 w-36 sm:h-40 sm:w-40 overflow-hidden rounded-xl bg-white flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${ticket.ticketNumber}`}
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[10px] text-neutral-400 gap-1.5">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#8a38f5] border-t-transparent" />
                <span>جاري تحميل الرمز...</span>
              </div>
            )}

            {/* Check-in overlays */}
            {isUsed && (
              <div className="absolute inset-0 bg-[#1d1d1f]/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-400 mb-0.5" />
                <span className="text-xs font-bold">تم تسجيل الدخول</span>
                <span className="text-[9.5px] text-neutral-300 mt-0.5">
                  {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString("ar-EG") : ""}
                </span>
              </div>
            )}

            {isRevoked && (
              <div className="absolute inset-0 bg-red-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
                <XCircle className="h-7 w-7 text-red-400 mb-0.5" />
                <span className="text-xs font-bold">تذكرة ملغاة</span>
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-1 text-[9.5px] text-neutral-500 font-medium">
            <ShieldCheck className="h-3 w-3 text-[#8a38f5]" />
            <span className="font-mono">{ticket.secureCredential.slice(0, 8)}•••</span>
            <span>|</span>
            <span>رمز دخول رسمي مشفر</span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="mt-2.5">
          {ticket.status === "valid" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              تذكرة صالحة ومؤكدة للدخول
            </span>
          )}
          {ticket.status === "used" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-sm">
              <CheckCircle2 className="h-3 w-3 text-amber-300" />
              تم استخدامها بالبوابة
            </span>
          )}
          {ticket.status === "revoked" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-red-500/20 text-red-200 border border-red-400/30 backdrop-blur-sm">
              <AlertCircle className="h-3 w-3 text-red-300" />
              ملغاة
            </span>
          )}
        </div>
      </section>

      {/* 6. Social Media & Footer (Figma Node 114:2266) */}
      <footer className="relative z-10 pt-3 border-t border-white/15 text-center">
        {/* Dynamic Social Icons row */}
        {hasAnySocial && (
          <div className="flex items-center justify-center gap-3 mb-2.5">
            {showInstagram && instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors p-1"
                title="إنستغرام"
              >
                <div className="relative h-3.5 w-3.5">
                  <Image src="/images/instagram.png" alt="Instagram" fill className="object-contain" />
                </div>
              </a>
            )}
            {showTwitter && twitterUrl && (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors p-1"
                title="تويتر / X"
              >
                <div className="relative h-3.5 w-3.5">
                  <Image src="/images/twitter.png" alt="Twitter" fill className="object-contain" />
                </div>
              </a>
            )}
            {showFacebook && facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors p-1"
                title="فيسبوك"
              >
                <div className="relative h-3.5 w-3.5">
                  <Image src="/images/facebook.png" alt="Facebook" fill className="object-contain" />
                </div>
              </a>
            )}
          </div>
        )}

        <p className="text-[10px] text-white/75 font-medium mb-1">
          {copyrightText}
        </p>

        <p className="text-[9px] text-white/50 leading-relaxed max-w-[310px] mx-auto">
          تعتبر هذه التذكرة وثيقة إلكترونية رسمية صالحة للدخول مرة واحدة فقط. يرجى إبراز رمز QR عند البوابة.
        </p>
      </footer>
    </article>
  );
}

export default NextGenFigmaTicket;
