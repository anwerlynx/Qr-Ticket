"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ShieldCheck } from "lucide-react";
import { Chip } from "@heroui/react";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e7]/80 bg-white/75 backdrop-blur-xl no-print">
      <div className="mx-auto flex h-12 sm:h-13 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Right side: Branding & Event Identity */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative h-6 w-14 sm:w-16">
            <Image
              src="/images/nextgen_logo.svg"
              alt="NEXT GEN"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="border-r border-neutral-300 pr-2.5 text-right hidden xs:block">
            <span className="block text-[11px] sm:text-xs font-bold text-[#1d1d1f] leading-none">
              ملتقى الجيل القادم
            </span>
            <span className="block text-[9px] text-[#86868b] font-mono mt-0.5">
              13 أكتوبر 2026 • كفر الشيخ
            </span>
          </div>
        </Link>

        {/* Left side: HeroUI Status Indicators */}
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            color="secondary"
            variant="flat"
            className="text-[10px] sm:text-[11px] font-semibold border border-purple-200/60"
            startContent={<Sparkles className="h-3 w-3 text-[#8a38f5]" />}
          >
            نظام التذاكر الذكي
          </Chip>

          <Chip
            size="sm"
            color="success"
            variant="flat"
            className="hidden sm:inline-flex text-[10px] sm:text-[11px] font-semibold border border-emerald-200/60"
            startContent={<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />}
          >
            متصل سحابياً (Supabase)
          </Chip>
        </div>
      </div>
    </header>
  );
}
