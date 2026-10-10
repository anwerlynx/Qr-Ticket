"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TicketData, DashboardStats, AttendeeRecord, EventTicketSettings } from "@/types/ticket";
import { NextGenTicket } from "@/components/tickets/NextGenTicket";
import {
  Ticket,
  QrCode,
  Sparkles,
  ExternalLink,
  Printer,
  Mail,
  CheckCircle2,
  Calendar,
  MapPin,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  Upload,
  Layers,
  Users,
  Send,
  AlertTriangle,
  UserCheck,
  UserX,
  Search,
  ArrowUpRight,
  ShieldCheck,
  ChevronLeft,
  Share2,
  Globe,
  Trash2,
  Settings,
} from "lucide-react";

const DEFAULT_FALLBACK_TICKET: TicketData = {
  id: "ng-sample-preview",
  ticketNumber: "A125",
  secureCredential: "ngsec_f84b391a029c8e1704e678a1bc4029df",
  attendeeName: "عمرو خالد داود",
  category: "VIP",
  eventName: "ملتقى الجيل القادم | NEXT GEN",
  eventTagline: "#جيل_جديد_عالم_جديد",
  eventDate: "13 أكتوبر 2026",
  eventTime: "05:00 مساءً",
  venueName: "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
  venueAddress: "كفر الشيخ، جمهورية مصر العربية",
  mapUrl: "https://maps.google.com/?q=31.1107,30.9388",
  entryInstructions: [
    "يرجى إبراز هذا الرمز (QR Code) عند بوابة الدخول للتحقق.",
    "التذكرة مخصصة لشخص واحد فقط وغير قابلة لإعادة الاستخدام.",
    "تفتح الأبواب قبل بدء الفعالية بساعة واحدة.",
  ],
  organizerName: "Primex Agency & Millala Inc.",
  contactEmail: "info@primexagency.com",
  contactPhone: "+20 100 000 0000",
  status: "valid",
  issuedAt: "2026-10-01T10:00:00.000Z",
};

export interface HomePageClientProps {
  initialStats?: DashboardStats;
  initialEventSettings?: EventTicketSettings;
  initialTickets?: TicketData[];
  initialTotalTickets?: number;
  initialTotalAttendees?: number;
}

export default function HomePageClient({
  initialStats,
  initialEventSettings,
  initialTickets,
  initialTotalTickets,
  initialTotalAttendees,
}: HomePageClientProps) {
  const [stats, setStats] = useState<DashboardStats>(
    initialStats || {
      totalRegistered: 0,
      issuedTickets: 0,
      pendingTickets: 0,
      sentEmails: 0,
      deliveredEmails: 0,
      failedEmails: 0,
      checkedInCount: 0,
      notCheckedInCount: 0,
    }
  );
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const firstTicket = (initialTickets && initialTickets.length > 0 ? initialTickets[0] : DEFAULT_FALLBACK_TICKET);
  const [tickets, setTickets] = useState<TicketData[]>(
    initialTickets && initialTickets.length > 0 ? initialTickets : [DEFAULT_FALLBACK_TICKET]
  );
  const [selectedTicket, setSelectedTicket] = useState<TicketData>(firstTicket);
  const [loading, setLoading] = useState(false);

  // Live customizer state
  const [customName, setCustomName] = useState(firstTicket.attendeeName);
  const [customNumber, setCustomNumber] = useState(firstTicket.ticketNumber);
  const [customCategory, setCustomCategory] = useState<TicketData["category"]>(firstTicket.category);

  // Dynamic Event and Social Media Settings
  const [eventSettings, setEventSettings] = useState<EventTicketSettings>(initialEventSettings || {
    eventName: "ملتقى الجيل القادم | NEXT GEN",
    eventTagline: "#جيل_جديد_عالم_جديد",
    eventDate: "13 أكتوبر 2026",
    eventTime: "05:00 مساءً",
    venueName: "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
    venueAddress: "كفر الشيخ، جمهورية مصر العربية",
    mapUrl: "https://maps.google.com/?q=31.1107,30.9388",
    greetingTitle: "يا مرحب بيك",
    greetingSubtitle: "أنت ضمن القائمة!",
    greetingDescription: "تذكرتك جاهزة، ونتطلع إلى لقائك في تجربة مليئة بالأفكار الجديدة والتواصل والإلهام.",
    facebookUrl: "https://facebook.com",
    twitterUrl: "https://twitter.com",
    instagramUrl: "https://instagram.com",
    showFacebook: true,
    showTwitter: true,
    showInstagram: true,
    organizerName: "Primex Agency & Millala Inc.",
    copyrightText: "© 2026 Millala Inc. & Primex Agency. All rights reserved.",
  });

  const [activeTab, setActiveTab] = useState<"attendee" | "social" | "event">("attendee");
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);
  const [updatingCurrentTicket, setUpdatingCurrentTicket] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/bootstrap");
      const data = await res.json();

      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.eventSettings) setEventSettings(data.eventSettings);
        if (data.ticketsPreview && data.ticketsPreview.length > 0) {
          setTickets(data.ticketsPreview);
          if (!selectedTicket || selectedTicket.id === "ng-sample-preview") {
            const first = data.ticketsPreview[0];
            setSelectedTicket(first);
            setCustomName(first.attendeeName);
            setCustomNumber(first.ticketNumber);
            setCustomCategory(first.category);
          }
        }
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSelectTicket = (t: TicketData) => {
    setSelectedTicket(t);
    setCustomName(t.attendeeName);
    setCustomNumber(t.ticketNumber);
    setCustomCategory(t.category);
  };

  // Save changes as global template for all tickets and emails
  const handleSaveGlobalSettings = async () => {
    try {
      setSavingGlobalSettings(true);
      const res = await fetch("/api/settings/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventSettings),
      });
      const data = await res.json();
      if (data.success) {
        setNoticeMessage("✓ تم حفظ الإعدادات وروابط التواصل كافتراضية لجميع التذاكر والإيميلات!");
        setTimeout(() => setNoticeMessage(""), 4000);
      }
    } catch (err: any) {
      alert("فشل حفظ الإعدادات: " + err.message);
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  // Save changes to the currently selected ticket in database
  const handleUpdateCurrentTicketInDb = async () => {
    if (!selectedTicket) return;
    try {
      setUpdatingCurrentTicket(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: customName,
          category: customCategory,
          eventDate: eventSettings.eventDate,
          eventTime: eventSettings.eventTime,
          venueName: eventSettings.venueName,
          mapUrl: eventSettings.mapUrl,
          greetingTitle: eventSettings.greetingTitle,
          greetingSubtitle: eventSettings.greetingSubtitle,
          greetingDescription: eventSettings.greetingDescription,
          showFacebook: eventSettings.showFacebook,
          facebookUrl: eventSettings.facebookUrl,
          showTwitter: eventSettings.showTwitter,
          twitterUrl: eventSettings.twitterUrl,
          showInstagram: eventSettings.showInstagram,
          instagramUrl: eventSettings.instagramUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
        setNoticeMessage(`✓ تم حفظ وتحديث بيانات تذكرة ${customName} في قاعدة البيانات!`);
        setTimeout(() => setNoticeMessage(""), 4000);
      }
    } catch (err: any) {
      alert("فشل تحديث التذكرة: " + err.message);
    } finally {
      setUpdatingCurrentTicket(false);
    }
  };

  const activeTicket: TicketData | null = selectedTicket
    ? {
        ...selectedTicket,
        attendeeName: customName || selectedTicket.attendeeName,
        ticketNumber: customNumber || selectedTicket.ticketNumber,
        category: customCategory || selectedTicket.category,
        eventDate: eventSettings.eventDate,
        eventTime: eventSettings.eventTime,
        venueName: eventSettings.venueName,
        mapUrl: eventSettings.mapUrl,
        greetingTitle: eventSettings.greetingTitle,
        greetingSubtitle: eventSettings.greetingSubtitle,
        greetingDescription: eventSettings.greetingDescription,
        showFacebook: eventSettings.showFacebook,
        facebookUrl: eventSettings.facebookUrl,
        showTwitter: eventSettings.showTwitter,
        twitterUrl: eventSettings.twitterUrl,
        showInstagram: eventSettings.showInstagram,
        instagramUrl: eventSettings.instagramUrl,
        copyrightText: eventSettings.copyrightText,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans">
      
      {/* SECTION 1: APPLE HERO SHOWCASE (Light Canvas & Editorial Typography) */}
      <section className="bg-white border-b border-[#e5e5e7] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-right">
          
          {/* Subtle Category Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3.5 py-1 text-xs font-semibold text-[#1d1d1f] border border-[#e5e5e7] mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0066cc]" />
            <span>Next Gen Forum 2026 • ملتقى الجيل القادم</span>
          </div>

          {/* SF Pro Tight Display Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-[#1d1d1f] leading-[1.08] max-w-4xl">
            نظام إدارة التذاكر والتحقق الذكي
          </h1>

          <p className="mt-3 text-base sm:text-lg text-[#7a7a7a] max-w-2xl font-normal leading-relaxed">
            منظومة متكاملة مصممة بدقة عالية: استيراد ملفات المسجلين، توليد تذاكر رقمية مشفرة، إرسال الدفعات بالبريد، والتحقق الذري السريع يوم الفعالية.
          </p>

          {/* Primary 1-2-3 Navigation (Fast & Direct) */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/attendees"
              className="btn-press inline-flex items-center justify-center gap-2 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>1. كشف المسجلين والجدول (Excel)</span>
            </Link>

            <Link
              href="/tickets"
              className="btn-press inline-flex items-center justify-center gap-2 rounded-full bg-[#8a38f5] hover:bg-[#7828e0] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors"
            >
              <Ticket className="h-4 w-4" />
              <span>2. دليل التذاكر الصادرة</span>
            </Link>

            <Link
              href="/check-in"
              className="btn-press inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] hover:bg-black px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors"
            >
              <QrCode className="h-4 w-4" />
              <span>3. ماسح البوابة (Check-in)</span>
            </Link>

            <Link
              href="/import"
              className="btn-press inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#f5f5f7] border border-[#e5e5e7] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#1d1d1f] transition-colors"
            >
              <Upload className="h-4 w-4 text-[#0066cc]" />
              <span>استيراد ملف Excel</span>
            </Link>
          </div>

          {/* Event Metadata Chips */}
          <div className="mt-8 pt-6 border-t border-[#f0f0f0] flex flex-wrap items-center gap-4 text-xs text-[#7a7a7a]">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 border border-[#e5e5e7]">
              <Calendar className="h-3.5 w-3.5 text-[#0066cc]" />
              <span className="font-medium text-[#1d1d1f]">13 أكتوبر 2026</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 border border-[#e5e5e7]">
              <MapPin className="h-3.5 w-3.5 text-[#0066cc]" />
              <span className="font-medium text-[#1d1d1f]">المسرح المدرسي كفر الشيخ • القوات المسلحة</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 border border-[#e5e5e7]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium text-[#1d1d1f]">قاعدة بيانات حية ومشفرة</span>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: 8-STATISTIC LIVE DASHBOARD (Apple Clean Utility Cards) */}
      <section className="py-10 sm:py-12 border-b border-[#e5e5e7] bg-[#f5f5f7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-[#1d1d1f] flex items-center gap-2">
                <span>إحصائيات الفعالية الحية</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-xs sm:text-sm text-[#7a7a7a] mt-0.5">
                مؤشرات دقيقة ومتزامنة في الوقت الفعلي لكل خطوة في دورة حياة التذكرة.
              </p>
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e5e7] px-4 py-1.5 text-xs font-medium text-[#1d1d1f] hover:bg-[#fafafc] transition-colors shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0066cc] ${loading ? "animate-spin" : ""}`} />
              <span>تحديث الأرقام</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* 1. Total Registered */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block">إجمالي المسجلين</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] font-mono tracking-tight mt-1.5 block">
                {stats.totalRegistered}
              </span>
              <span className="text-[11px] text-[#7a7a7a] mt-1 block">في قاعدة البيانات</span>
            </div>

            {/* 2. Issued Tickets */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block">التذاكر الصادرة</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#8a38f5] font-mono tracking-tight mt-1.5 block">
                {stats.issuedTickets}
              </span>
              <span className="text-[11px] text-purple-600/80 mt-1 block">برمز QR مشفر</span>
            </div>

            {/* 3. Pending Tickets */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block">المتبقي للإصدار</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] font-mono tracking-tight mt-1.5 block">
                {stats.pendingTickets}
              </span>
              <span className="text-[11px] text-[#7a7a7a] mt-1 block">بانتظار الإنشاء</span>
            </div>

            {/* 4. Sent Emails */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block">الإيميلات المرسلة</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#0066cc] font-mono tracking-tight mt-1.5 block">
                {stats.sentEmails}
              </span>
              <span className="text-[11px] text-[#0066cc] mt-1 block">عبر Resend</span>
            </div>

            {/* 5. Delivered Emails */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block">الإيميلات المسلمة</span>
              <span className="text-2xl sm:text-3xl font-semibold text-emerald-600 font-mono tracking-tight mt-1.5 block">
                {stats.deliveredEmails || stats.sentEmails}
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">وصلت صناديق الوارد</span>
            </div>

            {/* 6. Failed Emails */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block">الإيميلات المتعثرة</span>
              <span className="text-2xl sm:text-3xl font-semibold text-red-600 font-mono tracking-tight mt-1.5 block">
                {stats.failedEmails}
              </span>
              <span className="text-[11px] text-red-500 mt-1 block">تحتاج إعادة محاولة</span>
            </div>

            {/* 7. Checked In Count */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>حضور الفعالية (دخول)</span>
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-emerald-600 font-mono tracking-tight mt-1.5 block">
                {stats.checkedInCount}
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">تم مسح تذاكرهم بالبوابة</span>
            </div>

            {/* 8. Not Checked In Count */}
            <div className="rounded-[18px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs transition-all hover:border-[#0066cc]/40">
              <span className="text-xs font-normal text-[#7a7a7a] block flex items-center gap-1">
                <UserX className="h-3.5 w-3.5 text-[#7a7a7a]" />
                <span>لم يحضروا بعد</span>
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] font-mono tracking-tight mt-1.5 block">
                {stats.notCheckedInCount}
              </span>
              <span className="text-[11px] text-[#7a7a7a] mt-1 block">بانتظار الوصول</span>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: ORGANIZER WORKFLOW PIPELINE (Clear & Uncluttered UX) */}
      <section className="py-10 bg-white border-b border-[#e5e5e7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[#1d1d1f] tracking-tight">
              مسار العمل المنظم لإدارة الفعالية (Event Organizer Workflow):
            </h3>
            <p className="text-xs text-[#7a7a7a] mt-0.5">
              خطوات متسلسلة تضمن معالجة تسجيلات ~400 مشارك وإرسال تذاكرهم بأمان تام.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            
            <Link
              href="/import"
              className="p-3 rounded-xl bg-[#f5f5f7] hover:bg-neutral-200/70 border border-[#e5e5e7] transition-all group"
            >
              <span className="text-[10px] font-mono text-[#0066cc] block">01</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5 group-hover:text-[#0066cc]">
                رفع Excel / CSV
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">تحميل ملف المسجلين</span>
            </Link>

            <div className="p-3 rounded-xl bg-[#f5f5f7] border border-[#e5e5e7]">
              <span className="text-[10px] font-mono text-[#7a7a7a] block">02</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5">
                تعيين الأعمدة
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">عربي وإنجليزي تلقائياً</span>
            </div>

            <Link
              href="/import"
              className="p-3 rounded-xl bg-[#f5f5f7] hover:bg-neutral-200/70 border border-[#e5e5e7] transition-all group"
            >
              <span className="text-[10px] font-mono text-[#0066cc] block">03</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5 group-hover:text-[#0066cc]">
                حفظ المسجلين
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">منع التكرار الآمن</span>
            </Link>

            <Link
              href="/tickets/bulk-generate"
              className="p-3 rounded-xl bg-[#f5f5f7] hover:bg-neutral-200/70 border border-[#e5e5e7] transition-all group"
            >
              <span className="text-[10px] font-mono text-[#0066cc] block">04</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5 group-hover:text-[#0066cc]">
                إصدار التذاكر
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">أرقام ورموز مشفرة</span>
            </Link>

            <Link
              href="/campaigns"
              className="p-3 rounded-xl bg-[#f5f5f7] hover:bg-neutral-200/70 border border-[#e5e5e7] transition-all group"
            >
              <span className="text-[10px] font-mono text-[#0066cc] block">05</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5 group-hover:text-[#0066cc]">
                معاينة الإيميل
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">اختبار شاشة وجوال</span>
            </Link>

            <Link
              href="/campaigns"
              className="p-3 rounded-xl bg-[#f5f5f7] hover:bg-neutral-200/70 border border-[#e5e5e7] transition-all group"
            >
              <span className="text-[10px] font-mono text-[#0066cc] block">06</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5 group-hover:text-[#0066cc]">
                إرسال بالدفعات
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">عبر Resend بذكاء</span>
            </Link>

            <div className="p-3 rounded-xl bg-[#f5f5f7] border border-[#e5e5e7]">
              <span className="text-[10px] font-mono text-[#7a7a7a] block">07</span>
              <span className="text-xs font-semibold text-[#1d1d1f] block mt-0.5">
                متابعة التسليم
              </span>
              <span className="text-[10px] text-[#7a7a7a] mt-0.5 block">سجل الإرسال والإعادة</span>
            </div>

            <Link
              href="/check-in"
              className="p-3 rounded-xl bg-[#1d1d1f] text-white hover:bg-black transition-all group"
            >
              <span className="text-[10px] font-mono text-purple-300 block">08</span>
              <span className="text-xs font-semibold text-white block mt-0.5 group-hover:text-purple-200">
                ماسح البوابة
              </span>
              <span className="text-[10px] text-neutral-300 mt-0.5 block">فحص ذري سريع</span>
            </Link>

          </div>
        </div>
      </section>

      {/* SECTION 4: THE INTERACTIVE TICKET GALLERY & STUDIO (Centered Pedestal) */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-right mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              استوديو التذكرة ومعاينة التصميم الحي
            </h2>
            <p className="text-xs sm:text-sm text-[#7a7a7a] mt-1">
              التصميم المعتمد لملتقى الجيل القادم (Next Gen) متجاوب تماماً مع الشاشات ومهيأ للإرسال والطباعة.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Preset Switcher, Live Editor, Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Presets Card */}
              <div className="rounded-[18px] bg-white p-5 border border-[#e5e5e7] shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[#1d1d1f]">نماذج التذاكر المحفوظة</h3>
                  <span className="text-[11px] text-[#7a7a7a]">اختر لمعاينة التذكرة فورياً</span>
                </div>

                <div className="space-y-2">
                  {tickets.slice(0, 4).map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTicket(t)}
                        className={`btn-press w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[#f5f5f7] border-[#0066cc] shadow-2xs ring-1 ring-[#0066cc]/20"
                            : "bg-white border-[#e5e5e7] hover:border-neutral-300 hover:bg-[#fafafc]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-[#1d1d1f]">
                              {t.attendeeName}
                            </span>
                            {t.ticketNumber === "A125" && (
                              <span className="text-[9.5px] bg-[#8a38f5] text-white px-2 py-0.5 rounded-full font-bold">
                                نموذج Figma
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#7a7a7a] mt-0.5">
                            رقم: <span className="font-mono font-medium">{t.ticketNumber}</span> • فئة {t.category}
                          </div>
                        </div>

                        <div>
                          {t.status === "used" ? (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              مستخدمة
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              صالحة
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comprehensive Live Ticket & Social Media Customizer */}
              <div className="rounded-[18px] bg-white p-5 border border-[#e5e5e7] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[#8a38f5]" />
                    <h3 className="text-xs font-bold text-[#1d1d1f]">
                      تخصيص بيانات التذكرة والسوشيال ميديا
                    </h3>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    معاينة حية فورية
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center rounded-xl bg-[#f5f5f7] p-1 gap-1 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab("attendee")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === "attendee"
                        ? "bg-white text-[#1d1d1f] shadow-xs"
                        : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                    }`}
                  >
                    بيانات المشارك
                  </button>
                  <button
                    onClick={() => setActiveTab("social")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === "social"
                        ? "bg-white text-[#8a38f5] shadow-xs"
                        : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                    }`}
                  >
                    السوشيال ميديا
                  </button>
                  <button
                    onClick={() => setActiveTab("event")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === "event"
                        ? "bg-white text-[#1d1d1f] shadow-xs"
                        : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                    }`}
                  >
                    بيانات الفعالية
                  </button>
                </div>

                {noticeMessage && (
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium border border-emerald-200">
                    {noticeMessage}
                  </div>
                )}

                {/* TAB 1: ATTENDEE */}
                {activeTab === "attendee" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                        اسم المشارك:
                      </label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                          رقم التذكرة:
                        </label>
                        <input
                          type="text"
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value)}
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-2 text-xs sm:text-sm font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                          الفئة:
                        </label>
                        <select
                          value={customCategory}
                          onChange={(e) =>
                            setCustomCategory(e.target.value as TicketData["category"])
                          }
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                        >
                          <option value="General">عامة (General)</option>
                          <option value="VIP">كبار الزوار (VIP)</option>
                          <option value="Speaker">متحدث (Speaker)</option>
                          <option value="Organizer">تنظيم (Organizer)</option>
                          <option value="Media">إعلام (Media)</option>
                        </select>
                      </div>
                    </div>

                    {selectedTicket && (
                      <button
                        onClick={handleUpdateCurrentTicketInDb}
                        disabled={updatingCurrentTicket}
                        className="btn-press w-full rounded-xl bg-[#0066cc] hover:bg-[#0071e3] text-white py-2 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {updatingCurrentTicket ? "جاري الحفظ في قاعدة البيانات..." : "حفظ بيانات هذا المشارك في قاعدة البيانات"}
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 2: SOCIAL LINKS */}
                {activeTab === "social" && (
                  <div className="space-y-3.5 pt-1">
                    <p className="text-[11px] text-[#7a7a7a]">
                      يمكنك تعديل روابط السوشيال ميديا المعروضة أسفل التذكرة، أو تعطيلها / حذفها نهائياً لتختفي الأيقونة من التذكرة تلقائياً.
                    </p>

                    {/* Facebook */}
                    <div className="rounded-xl border border-[#e5e5e7] p-3 bg-[#fafafc] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eventSettings.showFacebook !== false && !!eventSettings.facebookUrl}
                            onChange={(e) =>
                              setEventSettings({
                                ...eventSettings,
                                showFacebook: e.target.checked,
                              })
                            }
                            className="rounded text-[#0066cc] cursor-pointer"
                          />
                          <span>فيسبوك (Facebook)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEventSettings({
                              ...eventSettings,
                              facebookUrl: "",
                              showFacebook: false,
                            })
                          }
                          className="text-[10px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>إزالة من التذكرة</span>
                        </button>
                      </div>
                      <input
                        type="url"
                        placeholder="https://facebook.com/yourpage"
                        value={eventSettings.facebookUrl || ""}
                        onChange={(e) =>
                          setEventSettings({
                            ...eventSettings,
                            facebookUrl: e.target.value,
                            showFacebook: !!e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-[#e5e5e7] bg-white px-3 py-1.5 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#0066cc] outline-none"
                        dir="ltr"
                      />
                    </div>

                    {/* Twitter / X */}
                    <div className="rounded-xl border border-[#e5e5e7] p-3 bg-[#fafafc] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eventSettings.showTwitter !== false && !!eventSettings.twitterUrl}
                            onChange={(e) =>
                              setEventSettings({
                                ...eventSettings,
                                showTwitter: e.target.checked,
                              })
                            }
                            className="rounded text-[#0066cc] cursor-pointer"
                          />
                          <span>تويتر / X (Twitter)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEventSettings({
                              ...eventSettings,
                              twitterUrl: "",
                              showTwitter: false,
                            })
                          }
                          className="text-[10px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>إزالة من التذكرة</span>
                        </button>
                      </div>
                      <input
                        type="url"
                        placeholder="https://twitter.com/yourhandle"
                        value={eventSettings.twitterUrl || ""}
                        onChange={(e) =>
                          setEventSettings({
                            ...eventSettings,
                            twitterUrl: e.target.value,
                            showTwitter: !!e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-[#e5e5e7] bg-white px-3 py-1.5 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#0066cc] outline-none"
                        dir="ltr"
                      />
                    </div>

                    {/* Instagram */}
                    <div className="rounded-xl border border-[#e5e5e7] p-3 bg-[#fafafc] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eventSettings.showInstagram !== false && !!eventSettings.instagramUrl}
                            onChange={(e) =>
                              setEventSettings({
                                ...eventSettings,
                                showInstagram: e.target.checked,
                              })
                            }
                            className="rounded text-[#0066cc] cursor-pointer"
                          />
                          <span>إنستغرام (Instagram)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEventSettings({
                              ...eventSettings,
                              instagramUrl: "",
                              showInstagram: false,
                            })
                          }
                          className="text-[10px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>إزالة من التذكرة</span>
                        </button>
                      </div>
                      <input
                        type="url"
                        placeholder="https://instagram.com/youraccount"
                        value={eventSettings.instagramUrl || ""}
                        onChange={(e) =>
                          setEventSettings({
                            ...eventSettings,
                            instagramUrl: e.target.value,
                            showInstagram: !!e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-[#e5e5e7] bg-white px-3 py-1.5 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#0066cc] outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: EVENT DETAILS */}
                {activeTab === "event" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                        عنوان الترحيب الرئيسي:
                      </label>
                      <input
                        type="text"
                        value={eventSettings.greetingTitle || ""}
                        onChange={(e) =>
                          setEventSettings({ ...eventSettings, greetingTitle: e.target.value })
                        }
                        placeholder="يا مرحب بيك"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                        عنوان الترحيب الفرعي:
                      </label>
                      <input
                        type="text"
                        value={eventSettings.greetingSubtitle || ""}
                        onChange={(e) =>
                          setEventSettings({ ...eventSettings, greetingSubtitle: e.target.value })
                        }
                        placeholder="أنت ضمن القائمة!"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                        الوصف الترحيبي:
                      </label>
                      <textarea
                        rows={2}
                        value={eventSettings.greetingDescription || ""}
                        onChange={(e) =>
                          setEventSettings({ ...eventSettings, greetingDescription: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                          تاريخ الفعالية:
                        </label>
                        <input
                          type="text"
                          value={eventSettings.eventDate || ""}
                          onChange={(e) =>
                            setEventSettings({ ...eventSettings, eventDate: e.target.value })
                          }
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                          الوقت:
                        </label>
                        <input
                          type="text"
                          value={eventSettings.eventTime || ""}
                          onChange={(e) =>
                            setEventSettings({ ...eventSettings, eventTime: e.target.value })
                          }
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                        مكان الفعالية (المسرح / العنوان):
                      </label>
                      <input
                        type="text"
                        value={eventSettings.venueName || ""}
                        onChange={(e) =>
                          setEventSettings({ ...eventSettings, venueName: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                        رابط الموقع على الخريطة (Google Maps):
                      </label>
                      <input
                        type="url"
                        value={eventSettings.mapUrl || ""}
                        onChange={(e) =>
                          setEventSettings({ ...eventSettings, mapUrl: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white outline-none text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {/* Primary Global Save Button */}
                <div className="pt-2 border-t border-[#f0f0f0]">
                  <button
                    onClick={handleSaveGlobalSettings}
                    disabled={savingGlobalSettings}
                    className="btn-press w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#8a38f5] hover:bg-[#7826e3] text-white py-2.5 text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingGlobalSettings ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري حفظ الإعدادات...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                        <span>حفظ كإعدادات افتراضية لجميع التذاكر والإيميلات</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-[#7a7a7a] mt-1.5">
                    سيتم تطبيق أي تعديلات في السوشيال ميديا والتفاصيل على التذاكر والبريد تلقائياً.
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              {selectedTicket && (
                <div className="rounded-[18px] bg-white p-5 border border-[#e5e5e7] shadow-2xs space-y-3">
                  <h3 className="text-xs font-semibold text-[#1d1d1f]">
                    إجراءات التذكرة المحددة
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/tickets/${selectedTicket.id}`}
                      className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-4 py-2 text-xs font-medium text-white shadow-2xs transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>صفحة الويب</span>
                    </Link>

                    <Link
                      href={`/tickets/${selectedTicket.id}/email`}
                      className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-white hover:bg-[#f5f5f7] border border-[#e5e5e7] px-4 py-2 text-xs font-medium text-[#1d1d1f] transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 text-neutral-500" />
                      <span>معاينة البريد</span>
                    </Link>

                    <button
                      onClick={() => window.print()}
                      className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-white hover:bg-[#f5f5f7] border border-[#e5e5e7] px-4 py-2 text-xs font-medium text-[#1d1d1f] transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5 text-neutral-500" />
                      <span>طباعة / PDF</span>
                    </button>

                    <Link
                      href={`/check-in?token=${encodeURIComponent(selectedTicket.secureCredential)}`}
                      className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-[#1d1d1f] hover:bg-black px-4 py-2 text-xs font-medium text-white transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>فحص بالماسح</span>
                    </Link>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Museum Gallery Pedestal for NextGenTicket (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              
              {/* Pedestal Header */}
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-[#1d1d1f]">
                    المعاينة الحية للتذكرة (Figma Approved Template)
                  </span>
                </div>
                <span className="text-[11px] text-[#7a7a7a] font-mono">
                  NextGenTicket.tsx
                </span>
              </div>

              {/* Pedestal Surface (Apple Museum Style) */}
              <div className="w-full rounded-[24px] bg-white p-4 sm:p-8 lg:p-10 border border-[#e5e5e7] flex items-center justify-center shadow-2xs">
                {activeTicket ? (
                  <div className="w-full flex justify-center">
                    <NextGenTicket ticket={activeTicket} eventSettings={eventSettings} />
                  </div>
                ) : (
                  <div className="py-24 text-xs text-[#7a7a7a] flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
                    <span>جاري تحميل التذكرة...</span>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* APPLE PARCHMENT FOOTER */}
      <footer className="bg-[#f5f5f7] border-t border-[#e5e5e7] py-8 text-center text-xs text-[#7a7a7a]">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Next Gen Forum • Millala Inc. & Primex Agency.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/tickets" className="hover:text-[#1d1d1f] transition-colors">
              دليل التذاكر
            </Link>
            <Link href="/import" className="hover:text-[#1d1d1f] transition-colors">
              استيراد المسجلين
            </Link>
            <Link href="/check-in" className="hover:text-[#1d1d1f] transition-colors">
              ماسح التحقق
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
