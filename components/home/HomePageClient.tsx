"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Ticket,
  Scan,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Upload,
  Sparkles,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import { DashboardStats, TicketData } from "@/types/ticket";
import { Button } from "@heroui/react";

export interface HomePageClientProps {
  initialStats?: DashboardStats;
  initialTickets?: TicketData[];
  initialTotalTickets?: number;
  initialTotalAttendees?: number;
}

export default function HomePageClient({
  initialStats,
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
  const [loading, setLoading] = useState(false);

  // Quick Add Attendee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "General" as "General" | "VIP",
    sendEmail: true,
  });
  const [noticeMessage, setNoticeMessage] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) {
      alert("يرجى ملء الاسم والبريد الإلكتروني");
      return;
    }

    try {
      setAddingAttendee(true);
      const res = await fetch("/api/attendees/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim() || undefined,
          category: addForm.category,
          sendEmailImmediately: addForm.sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل تسجيل المشارك");
        return;
      }

      setStats((prev) => ({
        ...prev,
        totalRegistered: prev.totalRegistered + 1,
        issuedTickets: prev.issuedTickets + 1,
        notCheckedInCount: prev.notCheckedInCount + 1,
      }));

      setNoticeMessage(
        addForm.sendEmail
          ? `✓ تم تسجيل ${data.attendee.name} وإصدار التذكرة (${data.ticket.ticketNumber}) وإرسالها إلى إيميله فورياً!`
          : `✓ تم تسجيل ${data.attendee.name} وإصدار التذكرة (${data.ticket.ticketNumber}) بنجاح!`
      );
      setTimeout(() => setNoticeMessage(""), 5000);

      setAddForm({
        name: "",
        email: "",
        phone: "",
        category: "General",
        sendEmail: true,
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert("حدث خطأ أثناء الإضافة: " + err.message);
    } finally {
      setAddingAttendee(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans pb-16">
      {/* Notice Message Toast */}
      {noticeMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-5 py-3 text-xs sm:text-sm font-semibold shadow-2xl animate-fade-in border border-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{noticeMessage}</span>
          <button
            onClick={() => setNoticeMessage("")}
            className="mr-2 hover:opacity-75 text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 space-y-6">
        {/* Clean System Header Banner */}
        <section className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#e5e5e7] shadow-2xs text-right">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
                لوحة تشغيل المنظومة
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#7a7a7a]">
                نظام إدارة التذاكر وقوائم الحضور والتحقق المباشر من التذاكر عبر رمز QR.
              </p>
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] px-4 py-2 text-xs font-semibold text-[#1d1d1f] hover:bg-neutral-200/60 transition-colors cursor-pointer shrink-0"
              title="تحديث البيانات"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#0066cc] ${
                  loading ? "animate-spin" : ""
                }`}
              />
              <span>تحديث الأرقام</span>
            </button>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="mt-6 pt-6 border-t border-[#f0f0f0] grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/attendees"
              className="btn-press p-4 rounded-2xl bg-[#f5f5f7] hover:bg-blue-50/60 border border-[#e5e5e7] hover:border-[#0066cc]/40 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="h-9 w-9 rounded-xl bg-blue-100/70 text-[#0066cc] flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </span>
                <span className="text-[11px] text-[#7a7a7a] font-mono group-hover:text-[#0066cc]">
                  فتح الجدول ↗
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#0066cc]">
                  جدول الحضور
                </h3>
                <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                  كشف المشاركين وحالة الدخول
                </p>
              </div>
            </Link>

            <Link
              href="/tickets"
              className="btn-press p-4 rounded-2xl bg-[#f5f5f7] hover:bg-purple-50/60 border border-[#e5e5e7] hover:border-purple-300 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Ticket className="h-4 w-4" />
                </span>
                <span className="text-[11px] text-[#7a7a7a] font-mono group-hover:text-purple-700">
                  استعراض ↗
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1d1d1f] group-hover:text-purple-700">
                  دليل التذاكر
                </h3>
                <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                  جميع التذاكر الصادرة ورموز QR
                </p>
              </div>
            </Link>

            <Link
              href="/scanner"
              className="btn-press p-4 rounded-2xl bg-neutral-900 hover:bg-black text-white border border-neutral-800 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="h-9 w-9 rounded-xl bg-white/15 text-purple-300 flex items-center justify-center">
                  <Scan className="h-4 w-4 animate-pulse" />
                </span>
                <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">
                  مباشر
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-200">
                  ماسح البوابة
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  فتح الكاميرا وفحص الحضور
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-press p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 transition-all flex flex-col justify-between text-right cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="h-4 w-4" />
                </span>
                <span className="text-[10px] bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-full">
                  إرسال فوري
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 group-hover:text-emerald-950">
                  + إضافة شخص وتذكرة
                </h3>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  إصدار وإرسال التذكرة فورياً
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* 4 Essential Live Stats Capsules */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[20px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs text-right">
            <span className="text-xs font-medium text-[#7a7a7a] block">
              إجمالي المسجلين
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] font-mono tracking-tight mt-1.5 block">
              {stats.totalRegistered}
            </span>
            <span className="text-[11px] text-[#7a7a7a] mt-1 block">
              مسجل في النظام
            </span>
          </div>

          <div className="rounded-[20px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs text-right">
            <span className="text-xs font-medium text-purple-700 block">
              التذاكر الصادرة
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-purple-700 font-mono tracking-tight mt-1.5 block">
              {stats.issuedTickets}
            </span>
            <span className="text-[11px] text-purple-600/80 mt-1 block">
              برمز دخول مشفر
            </span>
          </div>

          <div className="rounded-[20px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs text-right">
            <span className="text-xs font-medium text-emerald-700 block flex items-center gap-1 justify-end">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>الحاضرين في القاعة</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono tracking-tight mt-1.5 block">
              {stats.checkedInCount}
            </span>
            <span className="text-[11px] text-emerald-700 mt-1 block">
              تم مسح تذاكرهم
            </span>
          </div>

          <div className="rounded-[20px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs text-right">
            <span className="text-xs font-medium text-amber-700 block">
              لم يحضروا بعد
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] font-mono tracking-tight mt-1.5 block">
              {stats.notCheckedInCount}
            </span>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              بانتظار الدخول
            </span>
          </div>
        </section>

        {/* Quick Operations Row */}
        <section className="bg-white rounded-[24px] p-5 border border-[#e5e5e7] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-right">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f]">
              العمليات السريعة للنظام:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/import"
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] hover:bg-neutral-200 border border-[#e5e5e7] px-4 py-1.5 text-xs font-semibold text-neutral-800 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-[#0066cc]" />
              <span>استيراد ملف Excel</span>
            </Link>

            <Link
              href="/tickets/bulk-generate"
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-4 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>إصدار التذاكر دفعة واحدة</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Quick Add Modal (Add Attendee & Send Ticket Immediately) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#e5e5e7] space-y-4 animate-scale-in text-right">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1d1d1f]">
                  إضافة شخص وإصدار التذكرة
                </h2>
                <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <UserPlus className="h-4 w-4" />
                </span>
              </div>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1">
                  الاسم بالكامل *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد أحمد علي"
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm({ ...addForm, name: e.target.value })
                    }
                    className="w-full h-11 px-3.5 pr-9 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] text-xs sm:text-sm text-[#1d1d1f] focus:bg-white focus:border-[#0066cc] focus:outline-none transition-all text-right"
                  />
                  <User className="absolute right-3 top-3 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1">
                  البريد الإلكتروني *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, email: e.target.value })
                    }
                    dir="ltr"
                    className="w-full h-11 px-3.5 pr-9 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] text-xs sm:text-sm text-[#1d1d1f] focus:bg-white focus:border-[#0066cc] focus:outline-none transition-all text-left font-mono"
                  />
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1">
                    الهاتف (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="01012345678"
                      value={addForm.phone}
                      onChange={(e) =>
                        setAddForm({ ...addForm, phone: e.target.value })
                      }
                      dir="ltr"
                      className="w-full h-11 px-3 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] text-xs font-mono text-[#1d1d1f] focus:bg-white focus:border-[#0066cc] focus:outline-none transition-all text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1">
                    فئة التذكرة
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] text-xs font-semibold text-[#1d1d1f] focus:bg-white focus:border-[#0066cc] focus:outline-none transition-all text-right cursor-pointer"
                  >
                    <option value="General">عامة (General)</option>
                    <option value="VIP">كبار الزوار (VIP)</option>
                  </select>
                </div>
              </div>

              {/* Instant Email Checkbox */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <input
                  type="checkbox"
                  id="send-email-checkbox"
                  checked={addForm.sendEmail}
                  onChange={(e) =>
                    setAddForm({ ...addForm, sendEmail: e.target.checked })
                  }
                  className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="send-email-checkbox"
                  className="text-xs font-bold text-emerald-900 cursor-pointer"
                >
                  إرسال التذكرة ورمز QR فورياً إلى بريده الإلكتروني
                </label>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="submit"
                  isLoading={addingAttendee}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  حفظ وإصدار التذكرة فورياً
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-11 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
