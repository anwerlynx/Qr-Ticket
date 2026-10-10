"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TicketData } from "@/types/ticket";
import {
  Ticket,
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  QrCode,
  Mail,
  RefreshCw,
  UserCheck,
  Shield,
  Trash2,
} from "lucide-react";

export default function TicketsDirectoryClient({ initialTickets }: { initialTickets?: TicketData[] }) {
  const [tickets, setTickets] = useState<TicketData[]>(initialTickets || []);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  // New Ticket Form State
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCategory, setNewCategory] = useState<TicketData["category"]>("General");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialTickets || initialTickets.length === 0) {
      fetchTickets();
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: newName,
          attendeeEmail: newEmail || undefined,
          category: newCategory,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setNewName("");
        setNewEmail("");
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (ticketId: string) => {
    try {
      await fetch(`/api/tickets/${ticketId}/reset`, { method: "POST" });
      fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTicket = async (ticketId: string, ticketNumber: string) => {
    if (!confirm(`هل أنت متأكد من حذف التذكرة "${ticketNumber}" نهائياً من قاعدة البيانات و Supabase؟`)) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      } else {
        alert(data.error || "فشل حذف التذكرة");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      t.attendeeName.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">
            دليل التذاكر والحضور
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7a7a] mt-1">
            إدارة التذاكر الصادرة لملتقى الجيل القادم، ومراقبة حالة تسجيل الدخول لكل مشارك.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-press inline-flex items-center gap-2 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-2xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>إصدار تذكرة جديدة</span>
        </button>
      </div>

      {/* Filters Bar (Apple Pill Style) */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-6 relative">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم التذكرة (مثل A125)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-[#e5e5e7] bg-white py-2.5 pr-10 pl-4 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-full border border-[#e5e5e7] bg-white py-2.5 px-4 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none transition-colors"
          >
            <option value="all">كل الفئات</option>
            <option value="General">عامة (General)</option>
            <option value="VIP">كبار الزوار (VIP)</option>
            <option value="Speaker">متحدث (Speaker)</option>
            <option value="Organizer">تنظيم (Organizer)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-full border border-[#e5e5e7] bg-white py-2.5 px-4 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none transition-colors"
          >
            <option value="all">كل الحالات</option>
            <option value="valid">صالحة للدخول</option>
            <option value="used">مستخدمة (Checked-in)</option>
            <option value="revoked">ملغاة</option>
          </select>
        </div>
      </div>

      {/* Tickets Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#7a7a7a]">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent mb-2.5" />
          جاري تحميل التذاكر...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-[18px] bg-white p-12 text-center border border-[#e5e5e7]">
          <Ticket className="mx-auto h-10 w-10 text-neutral-300 mb-2.5" />
          <h3 className="text-sm font-semibold text-[#1d1d1f]">لا توجد نتائج مطابقة</h3>
          <p className="text-xs text-[#7a7a7a] mt-1">جرب تغيير كلمات البحث أو الفلاتر المختارة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-[18px] bg-white p-4 sm:p-5 shadow-2xs border border-[#e5e5e7] hover:border-[#0066cc]/40 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-xs font-bold text-white bg-[#1d1d1f] px-2.5 py-0.5 rounded-lg tracking-wider">
                    {t.ticketNumber}
                  </span>
                  <div>
                    {t.status === "valid" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        صالحة
                      </span>
                    ) : t.status === "used" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <CheckCircle2 className="h-3 w-3 text-amber-600" />
                        مستخدمة
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        ملغاة
                      </span>
                    )}
                  </div>
                </div>

                {/* Attendee Name */}
                <h3 className="text-base font-bold text-[#1d1d1f] group-hover:text-[#8a38f5] transition-colors line-clamp-1">
                  {t.attendeeName}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#7a7a7a]">
                  <span>فئة: {t.category || "General"}</span>
                  {t.attendeeEmail && (
                    <>
                      <span>•</span>
                      <span className="truncate">{t.attendeeEmail}</span>
                    </>
                  )}
                </div>

                {/* Check-in info if used */}
                {t.status === "used" && t.checkedInAt && (
                  <div className="mt-2.5 rounded-lg bg-amber-50/70 p-2 text-[10.5px] text-amber-800 border border-amber-200/50 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>تم المسح: {new Date(t.checkedInAt).toLocaleTimeString("ar-EG")}</span>
                    {t.checkInStation && <span className="opacity-75">({t.checkInStation})</span>}
                  </div>
                )}
              </div>

              {/* Action buttons (Apple Clean Pill) */}
              <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                <Link
                  href={`/tickets/${t.id}`}
                  className="btn-press flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>عرض التذكرة</span>
                </Link>

                <Link
                  href={`/tickets/${t.id}/email`}
                  className="btn-press inline-flex items-center justify-center p-2 rounded-full bg-[#f5f5f7] text-[#1d1d1f] hover:bg-neutral-200 transition-colors border border-[#e5e5e7]"
                  title="معاينة البريد"
                >
                  <Mail className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href={`/check-in?token=${encodeURIComponent(t.secureCredential)}`}
                  className="btn-press inline-flex items-center justify-center p-2 rounded-full bg-[#1d1d1f] text-white hover:bg-black transition-colors"
                  title="فحص مباشر في الماسح"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </Link>

                {t.status === "used" && (
                  <button
                    onClick={() => handleReset(t.id)}
                    className="btn-press inline-flex items-center justify-center p-2 rounded-full bg-[#f5f5f7] text-[#7a7a7a] hover:text-[#0066cc] transition-colors border border-[#e5e5e7]"
                    title="إعادة تفعيل"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDeleteTicket(t.id, t.ticketNumber)}
                  className="btn-press inline-flex items-center justify-center p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                  title="حذف التذكرة نهائياً من قاعدة البيانات و Supabase"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Issue New Ticket (Apple Sheet Style) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl border border-[#e5e5e7] animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
              إصدار تذكرة جديدة لحضور الفعالية
            </h3>
            <p className="text-xs text-[#7a7a7a] mb-4">
              سيتم إنشاء رمز تشفير آمن فريد لكل تذكرة مع رمز QR مرتبط بقاعدة البيانات.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  الاسم الكامل للحضور *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: أحمد مصطفى أو Sarah Jenkins"
                  className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="attendee@example.com"
                  className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  فئة التذكرة
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TicketData["category"])}
                  className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                >
                  <option value="General">عامة (General)</option>
                  <option value="VIP">كبار الزوار (VIP)</option>
                  <option value="Speaker">متحدث (Speaker)</option>
                  <option value="Organizer">تنظيم (Organizer)</option>
                  <option value="Media">إعلام (Media)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-5 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? "جاري الإصدار..." : "تأكيد وإصدار"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
