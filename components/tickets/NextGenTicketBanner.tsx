"use client";

import React from "react";
import Image from "next/image";

interface NextGenTicketBannerProps {
  className?: string;
  category?: string;
}

export function NextGenTicketBanner({ className = "", category }: NextGenTicketBannerProps) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-[#8a38f5] shadow-sm select-none ${className}`}
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 75% 40%, rgba(184, 115, 255, 0.45), transparent 70%),
          radial-gradient(ellipse 60% 80% at 20% 80%, rgba(98, 16, 214, 0.7), transparent 60%),
          linear-gradient(135deg, #7c22e8 0%, #8a38f5 45%, #6917c9 100%)
        `,
      }}
    >
      {/* Decorative Satin Folds Effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%),
            linear-gradient(-35deg, transparent 40%, rgba(0,0,0,0.3) 60%, transparent 80%)
          `,
        }}
      />

      {/* Geometric Pattern Overlay on Left (matching Figma node 110:2084) */}
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-28 overflow-hidden opacity-90 pointer-events-none">
        <svg
          viewBox="0 0 120 90"
          preserveAspectRatio="none"
          className="h-full w-full"
          fill="none"
        >
          <g opacity="0.6">
            <rect x="0" y="0" width="30" height="30" fill="#5814b3" />
            <path d="M 0 30 A 30 30 0 0 1 30 0 L 30 30 Z" fill="#9d4edd" />
            <rect x="30" y="0" width="30" height="30" fill="#7b2cbf" />
            <path d="M 30 0 A 30 30 0 0 1 60 30 L 30 30 Z" fill="#5814b3" />
            <rect x="60" y="0" width="30" height="30" fill="#5814b3" />
            <path d="M 60 30 A 30 30 0 0 1 90 0 L 90 30 Z" fill="#c77dff" />

            <rect x="0" y="30" width="30" height="30" fill="#7b2cbf" />
            <path d="M 30 30 A 30 30 0 0 1 0 60 L 0 30 Z" fill="#9d4edd" />
            <rect x="30" y="30" width="30" height="30" fill="#5814b3" />
            <path d="M 60 30 A 30 30 0 0 1 30 60 L 30 30 Z" fill="#c77dff" />
            <rect x="60" y="30" width="30" height="30" fill="#7b2cbf" />
            <path d="M 90 30 A 30 30 0 0 1 60 60 L 60 30 Z" fill="#9d4edd" />

            <rect x="0" y="60" width="30" height="30" fill="#5814b3" />
            <path d="M 0 90 A 30 30 0 0 1 30 60 L 30 90 Z" fill="#9d4edd" />
            <rect x="30" y="60" width="30" height="30" fill="#7b2cbf" />
            <path d="M 30 60 A 30 30 0 0 1 60 90 L 30 90 Z" fill="#5814b3" />
            <rect x="60" y="60" width="30" height="30" fill="#5814b3" />
            <path d="M 60 90 A 30 30 0 0 1 90 60 L 90 90 Z" fill="#c77dff" />
          </g>
        </svg>
      </div>

      {/* Main Banner Content - Compact and refined */}
      <div className="relative z-10 flex flex-col justify-between p-3 sm:p-3.5 text-white">
        {/* Category badge if applicable */}
        {category && category !== "General" && (
          <div className="self-end mb-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm border border-white/30 tracking-wider">
              {category}
            </span>
          </div>
        )}

        {/* Central Logo & Arabic Title Row */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 pl-12 sm:pl-16">
          {/* NEXT GEN Vector Logo */}
          <div className="relative h-3.5 sm:h-4 w-18 sm:w-22 shrink-0">
            <Image
              src="/images/nextgen_logo.svg"
              alt="NEXT GEN"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Thin Vertical White Divider */}
          <div className="h-4 sm:h-5 w-[1px] bg-white/70 shrink-0" />

          {/* Arabic Event Name */}
          <div className="text-right">
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap font-arabic">
              ملتقى الجيل القادم
            </h2>
          </div>
        </div>

        {/* Bottom Sub-bar: Primex Agency branding & Event Hashtag */}
        <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-1.5 pl-12 sm:pl-16 text-[9.5px] sm:text-[11px]">
          {/* Primex Agency */}
          <div className="flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity">
            <div className="relative h-2 w-2.5 shrink-0">
              <Image
                src="/images/primex_icon.svg"
                alt="Primex"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative h-1.5 w-12 sm:w-14 shrink-0">
              <Image
                src="/images/primex_text.svg"
                alt="Primex Agency"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Hashtag */}
          <div className="flex items-center gap-0.5 text-[9.5px] sm:text-[10.5px] font-medium text-white/95" dir="rtl">
            <span className="font-bold text-white/60">#</span>
            <span className="font-arabic tracking-wide">جيل_جديد_عالم_جديد</span>
          </div>
        </div>
      </div>
    </div>
  );
}
