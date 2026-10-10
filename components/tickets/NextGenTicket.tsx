"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Clock, MapPin, Map, ShieldCheck, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { TicketData, EventTicketSettings } from "@/types/ticket";
import { NextGenTicketBanner } from "./NextGenTicketBanner";
import { formatQRPayload, generateQRCodeDataUrl } from "@/lib/qr";

import { NextGenFigmaTicket } from "./NextGenFigmaTicket";

interface NextGenTicketProps {
  ticket: TicketData;
  hostUrl?: string;
  className?: string;
  variant?: "figma_new" | "classic_satin";
  eventSettings?: Partial<EventTicketSettings>;
}

export function NextGenTicket({
  ticket,
  hostUrl,
  className = "",
  variant = "figma_new",
  eventSettings,
}: NextGenTicketProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const payload = formatQRPayload(ticket.secureCredential, hostUrl);
    generateQRCodeDataUrl(payload, { width: 280 })
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

  // Render the new Figma Template A Mobile (Node 114:2224) by default
  if (variant === "figma_new") {
    return (
      <NextGenFigmaTicket
        ticket={ticket}
        hostUrl={hostUrl}
        className={className}
        eventSettings={eventSettings}
      />
    );
  }

  return (
    <article
      dir="rtl"
      className={`relative mx-auto w-full max-w-[360px] sm:max-w-[380px] rounded-[18px] bg-white p-3.5 sm:p-4 shadow-[0_10px_35px_rgba(0,0,0,0.07)] border border-[#e5e5e7] font-arabic text-neutral-900 transition-all ${className}`}
      data-ticket-id={ticket.id}
    >
      {/* 1. Official Next Gen Event Banner */}
      <div className="mb-3">
        <NextGenTicketBanner category={ticket.category} />
      </div>

      {/* 2. Welcome Headline & Attendee Name */}
      <section className="mb-3 text-right">
        <div className="text-[11px] sm:text-xs font-bold text-neutral-400">
          يا مرحب بيك
        </div>
        <h1
          className="text-xl sm:text-[23px] font-black text-[#8a38f5] tracking-tight leading-tight my-0.5 break-words"
          dir="auto"
        >
          {ticket.attendeeName}
        </h1>
        <div className="text-xs sm:text-sm font-black text-[#8a38f5]">
          أنت ضمن القائمة!
        </div>
        <p className="mt-1 text-[11px] sm:text-xs text-neutral-500 leading-relaxed font-normal">
          تذكرتك جاهزة، ونتطلع إلى لقائك في تجربة مليئة بالأفكار الجديدة والتواصل والإلهام.
        </p>
      </section>

      {/* 3. Event Details (Apple Utility Card) */}
      <section className="mb-3 rounded-xl bg-[#f5f5f7] p-2.5 sm:p-3 border border-[#e5e5e7] text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-neutral-900 text-[11px]">تفاصيل الفعالية</span>
          {ticket.category && (
            <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#8a38f5] text-white font-bold">
              فئة {ticket.category}
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-neutral-700">
          {/* Date & Time */}
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#8a38f5] shadow-xs">
              <Clock className="h-3 w-3" />
            </div>
            <div className="flex items-baseline gap-1.5 font-medium text-[11px]">
              <span className="text-neutral-900 font-semibold">{ticket.eventDate}</span>
              {ticket.eventTime && (
                <span className="text-[10.5px] text-neutral-500">• {ticket.eventTime}</span>
              )}
            </div>
          </div>

          {/* Venue & Location */}
          <div className="flex items-start gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#8a38f5] shadow-xs mt-0.5">
              <MapPin className="h-3 w-3" />
            </div>
            <div className="flex-1 leading-snug text-[11px]">
              <span className="text-neutral-900 font-medium">{ticket.venueName}</span>
              {ticket.venueAddress && (
                <span className="block text-[10px] text-neutral-400 mt-0.5">{ticket.venueAddress}</span>
              )}
            </div>
          </div>

          {/* Location Map Link */}
          {ticket.mapUrl && (
            <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/60">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#8a38f5] shadow-xs">
                <Map className="h-3 w-3" />
              </div>
              <a
                href={ticket.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] font-bold text-[#0066cc] hover:underline transition-colors"
              >
                المكان على الخريطة
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 4. Ticket Code & QR Section (Crisp Apple Gallery Style) */}
      <section className="mb-3 flex flex-col items-center justify-center text-center">
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
          رقم التذكرة
        </span>

        {/* Monospace Ticket Number Badge */}
        <div className="mb-2 inline-block rounded-lg bg-[#1d1d1f] px-3 py-1 text-white shadow-xs">
          <span className="font-mono text-lg sm:text-xl font-bold tracking-wider">
            {ticket.ticketNumber}
          </span>
        </div>

        {/* High-Resolution QR Code */}
        <div className="relative p-1.5 rounded-xl bg-white shadow-xs border border-[#e5e5e7]">
          <div className="relative h-32 w-32 sm:h-36 sm:w-36 overflow-hidden rounded-lg bg-[#fafafc] flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ticket ${ticket.ticketNumber}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[10px] text-neutral-400 gap-1.5">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#8a38f5] border-t-transparent" />
                <span>جاري توليد الرمز...</span>
              </div>
            )}

            {/* Overlays if used or revoked */}
            {isUsed && (
              <div className="absolute inset-0 bg-[#1d1d1f]/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-400 mb-0.5" />
                <span className="text-xs font-bold">تم تسجيل الدخول</span>
                <span className="text-[9.5px] text-neutral-300 mt-0.5">
                  {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString("ar-EG") : ""}
                </span>
              </div>
            )}

            {isRevoked && (
              <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
                <XCircle className="h-8 w-8 text-red-400 mb-1" />
                <span className="text-xs font-bold">تذكرة ملغاة</span>
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-neutral-400">
            <ShieldCheck className="h-3 w-3 text-[#8a38f5]" />
            <span className="font-mono text-[9px]">{ticket.secureCredential.slice(0, 10)}•••</span>
            <span>|</span>
            <span>رمز دخول مشفر</span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="mt-2">
          {ticket.status === "valid" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              تذكرة صالحة للدخول
            </span>
          )}
          {ticket.status === "used" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <CheckCircle2 className="h-3 w-3 text-amber-600" />
              مستخدمة مسبقاً
            </span>
          )}
          {ticket.status === "revoked" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="h-3 w-3 text-red-600" />
              ملغاة
            </span>
          )}
        </div>
      </section>

      {/* 5. Entry Instructions (Compact & Clean) */}
      <section className="mb-3 rounded-lg bg-[#f5f5f7] p-2.5 border border-[#e5e5e7] text-right text-[10.5px] leading-relaxed text-neutral-600">
        <h4 className="font-bold text-neutral-800 mb-1">تعليمات الدخول:</h4>
        <ul className="space-y-0.5 list-disc list-inside text-neutral-500">
          {ticket.entryInstructions && ticket.entryInstructions.length > 0 ? (
            ticket.entryInstructions.slice(0, 2).map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))
          ) : (
            <>
              <li>يرجى إبراز رمز QR عند البوابة للتحقق السريع.</li>
              <li>التذكرة صالحة لشخص واحد فقط وتلغى بعد أول مسح.</li>
            </>
          )}
        </ul>
      </section>

      {/* 6. Footer (Minimalist Apple Fine-print) */}
      <footer className="border-t border-[#f0f0f0] pt-2 text-center text-[10px] text-neutral-400">
        <div className="flex items-center justify-center gap-2.5 mb-1.5 opacity-75">
          <div className="relative h-4 w-4">
            <Image src="/images/instagram.png" alt="Instagram" fill className="object-contain" />
          </div>
          <div className="relative h-4 w-4">
            <Image src="/images/twitter.png" alt="Twitter" fill className="object-contain" />
          </div>
          <div className="relative h-4 w-4">
            <Image src="/images/facebook.png" alt="Facebook" fill className="object-contain" />
          </div>
        </div>
        <p>© 2026 Millala Inc. & Primex Agency.</p>
      </footer>
    </article>
  );
}
export default NextGenTicket;
