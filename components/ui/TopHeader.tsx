"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, Ticket, Scan, QrCode } from "lucide-react";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e7]/80 bg-white/85 backdrop-blur-xl no-print">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Right side: Branding & System Name */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="relative h-7 w-14 sm:w-16">
            <Image
              src="/images/nextgen_logo.svg"
              alt="System Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="border-r border-neutral-300 pr-3 text-right">
            <span className="block text-xs sm:text-sm font-bold text-[#1d1d1f] leading-none">
              منظومة إدارة التذاكر والتحقق
            </span>
            <span className="block text-[10px] text-[#86868b] font-mono mt-0.5">
              Ticket & Check-in System
            </span>
          </div>
        </Link>

        {/* Left side: Clean Direct Navigation */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/attendees"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-[#0066cc]" />
            <span>جدول الحضور</span>
          </Link>

          <Link
            href="/tickets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <Ticket className="h-3.5 w-3.5 text-purple-600" />
            <span>دليل التذاكر</span>
          </Link>

          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-neutral-900 hover:bg-black transition-colors shadow-2xs"
          >
            <Scan className="h-3.5 w-3.5 text-purple-300" />
            <span>ماسح البوابة</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
