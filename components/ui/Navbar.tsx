"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Ticket,
  QrCode,
  LayoutDashboard,
  Upload,
  Layers,
  Mail,
  FileSpreadsheet,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/settings/template", label: "قالب التذكرة العام", icon: SlidersHorizontal },
    { href: "/attendees", label: "جدول المسجلين والقبول", icon: FileSpreadsheet },
    { href: "/import", label: "استيراد المسجلين", icon: Upload },
    { href: "/tickets/bulk-generate", label: "إصدار جماعي", icon: Layers },
    { href: "/campaigns", label: "حملة البريد", icon: Mail },
    { href: "/tickets", label: "دليل التذاكر", icon: Ticket },
    { href: "/check-in", label: "ماسح التحقق", icon: QrCode },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e5e5e7] bg-white/80 backdrop-blur-xl no-print">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        
        {/* Left: Quick Actions & Live Indicator */}
        <div className="flex items-center gap-2">
          <Link
            href="/check-in"
            className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">الماسح المباشر</span>
            <span className="xs:hidden">الماسح</span>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-semibold text-[#1d1d1f] border border-[#e5e5e7]">
            <Sparkles className="h-3 w-3 text-[#8a38f5]" />
            NextGen 2026
          </span>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btn-press flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#1d1d1f] text-white shadow-xs"
                    : "text-[#1d1d1f] hover:bg-[#f5f5f7] hover:text-black"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Next Gen Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="block text-[11px] font-bold text-[#1d1d1f] leading-tight">ملتقى الجيل القادم</span>
            <span className="block text-[9px] text-[#86868b] font-mono">NEXT GEN</span>
          </div>
          <div className="relative h-5 w-12 sm:w-14">
            <Image
              src="/images/nextgen_logo.svg"
              alt="NEXT GEN"
              fill
              className="object-contain"
            />
          </div>
        </Link>

      </div>
    </header>
  );
}
