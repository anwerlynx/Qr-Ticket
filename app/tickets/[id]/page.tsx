"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TicketData } from "@/types/ticket";
import { NextGenTicket } from "@/components/tickets/NextGenTicket";
import {
  Printer,
  Mail,
  Share2,
  QrCode,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Download,
  Settings,
  X,
  Trash2,
} from "lucide-react";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Edit Ticket Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState<"attendee" | "social" | "event">("attendee");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editNotice, setEditNotice] = useState("");
  const [editForm, setEditForm] = useState({
    attendeeName: "",
    ticketNumber: "",
    category: "General" as TicketData["category"],
    showFacebook: true,
    facebookUrl: "https://facebook.com",
    showTwitter: true,
    twitterUrl: "https://twitter.com",
    showInstagram: true,
    instagramUrl: "https://instagram.com",
    greetingTitle: "يا مرحب بيك",
    greetingSubtitle: "أنت ضمن القائمة!",
    greetingDescription: "تذكرتك جاهزة، ونتطلع إلى لقائك في تجربة مليئة بالأفكار الجديدة والتواصل والإلهام.",
    eventDate: "13 أكتوبر 2026",
    eventTime: "05:00 مساءً",
    venueName: "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
    mapUrl: "https://maps.google.com/?q=31.1107,30.9388",
  });

  const handleOpenEditModal = () => {
    if (!ticket) return;
    setEditForm({
      attendeeName: ticket.attendeeName || "",
      ticketNumber: ticket.ticketNumber || "",
      category: ticket.category || "General",
      showFacebook: ticket.showFacebook !== undefined ? Boolean(ticket.showFacebook) : true,
      facebookUrl: ticket.facebookUrl || "",
      showTwitter: ticket.showTwitter !== undefined ? Boolean(ticket.showTwitter) : true,
      twitterUrl: ticket.twitterUrl || "",
      showInstagram: ticket.showInstagram !== undefined ? Boolean(ticket.showInstagram) : true,
      instagramUrl: ticket.instagramUrl || "",
      greetingTitle: ticket.greetingTitle || "يا مرحب بيك",
      greetingSubtitle: ticket.greetingSubtitle || "أنت ضمن القائمة!",
      greetingDescription: ticket.greetingDescription || "تذكرتك جاهزة، ونتطلع إلى لقائك في تجربة مليئة بالأفكار الجديدة والتواصل والإلهام.",
      eventDate: ticket.eventDate || "13 أكتوبر 2026",
      eventTime: ticket.eventTime || "05:00 مساءً",
      venueName: ticket.venueName || "المسرح المدرسي كفر الشيخ ، القوات المسلحه",
      mapUrl: ticket.mapUrl || "https://maps.google.com/?q=31.1107,30.9388",
    });
    setEditNotice("");
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: editForm.attendeeName,
          ticketNumber: editForm.ticketNumber,
          category: editForm.category,
          showFacebook: editForm.showFacebook,
          facebookUrl: editForm.facebookUrl,
          showTwitter: editForm.showTwitter,
          twitterUrl: editForm.twitterUrl,
          showInstagram: editForm.showInstagram,
          instagramUrl: editForm.instagramUrl,
          greetingTitle: editForm.greetingTitle,
          greetingSubtitle: editForm.greetingSubtitle,
          greetingDescription: editForm.greetingDescription,
          eventDate: editForm.eventDate,
          eventTime: editForm.eventTime,
          venueName: editForm.venueName,
          mapUrl: editForm.mapUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل تحديث التذكرة");
        return;
      }

      setTicket(data.ticket);
      setEditNotice("✓ تم حفظ وتحديث بيانات التذكرة بنجاح!");
      setTimeout(() => {
        setEditNotice("");
        setShowEditModal(false);
      }, 1200);
    } catch (err: any) {
      alert("حدث خطأ أثناء التحديث: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets/${id}`);
      if (!res.ok) throw new Error("Ticket not found");
      const data = await res.json();
      setTicket(data.ticket);
    } catch (err) {
      console.error(err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `تذكرة ${ticket?.attendeeName} - ملتقى الجيل القادم`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = async () => {
    if (!ticket) return;
    try {
      setResetting(true);
      const res = await fetch(`/api/tickets/${ticket.id}/reset`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2.5 text-xs text-neutral-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
          <span>جاري تحميل بيانات التذكرة...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-[18px] bg-white p-8 shadow-xs border border-[#e5e5e7]">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-2.5" />
          <h2 className="text-base font-bold text-neutral-900">التذكرة غير موجودة</h2>
          <p className="mt-1 text-xs text-neutral-500">
            لم نتمكن من العثور على التذكرة المطلوبة برمز: <span className="font-mono">{id}</span>
          </p>
          <Link
            href="/tickets"
            className="btn-press mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>العودة لقائمة التذاكر</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-3 sm:px-4 py-6 sm:py-8">
      {/* Top Bar Navigation (Hidden in print) */}
      <div className="mb-4 flex items-center justify-between no-print w-full max-w-[420px] mx-auto px-1">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>دليل التذاكر</span>
        </Link>

        {/* Status Badge */}
        <div>
          {ticket.status === "valid" ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              جاهزة للدخول
            </span>
          ) : ticket.status === "used" ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
              تم تسجيل الدخول
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
              ملغاة
            </span>
          )}
        </div>
      </div>

      {/* Main Ticket Render */}
      <div className="flex justify-center mb-5 w-full">
        <NextGenTicket ticket={ticket} />
      </div>

      {/* Action Toolbar Box (Apple Style - Hidden in print) */}
      <div className="mx-auto w-full max-w-[420px] rounded-[20px] bg-white p-3.5 sm:p-4 shadow-xs border border-[#e5e5e7] no-print space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {/* Print / Save PDF */}
          <button
            onClick={() => window.print()}
            className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>طباعة / PDF</span>
          </button>

          {/* Email View */}
          <Link
            href={`/tickets/${ticket.id}/email`}
            className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5e7] border border-[#e5e5e7] px-3.5 py-2.5 text-xs font-semibold text-[#1d1d1f] transition-colors text-center"
          >
            <Mail className="h-3.5 w-3.5 text-neutral-500" />
            <span>صيغة البريد</span>
          </Link>

          {/* Share Link */}
          <button
            onClick={handleShare}
            className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5e7] border border-[#e5e5e7] px-3.5 py-2.5 text-xs font-semibold text-[#1d1d1f] transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-neutral-500" />
            <span>{copied ? "تم النسخ!" : "مشاركة"}</span>
          </button>

          {/* Scanner Check */}
          <Link
            href={`/check-in?token=${encodeURIComponent(ticket.secureCredential)}`}
            className="btn-press flex items-center justify-center gap-1.5 rounded-full bg-[#1d1d1f] hover:bg-black px-3.5 py-2.5 text-xs font-semibold text-white transition-colors text-center"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>فحص بالماسح</span>
          </Link>
        </div>

        {/* Edit Ticket Details Button */}
        <div className="pt-2 border-t border-[#f0f0f0]">
          <button
            onClick={() => handleOpenEditModal()}
            className="btn-press w-full flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] hover:opacity-95 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>تعديل بيانات التذكرة والسوشيال ميديا</span>
          </button>
        </div>

        {/* Reset button if used */}
        {ticket.status === "used" && (
          <div className="pt-2 border-t border-neutral-100 text-center">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex items-center gap-1 text-[11px] text-[#0066cc] hover:underline font-medium"
            >
              <RefreshCw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
              <span>إعادة تفعيل التذكرة (للتجربة)</span>
            </button>
          </div>
        )}
      </div>

      {/* EDIT TICKET MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print overflow-y-auto">
          <div
            dir="rtl"
            className="relative w-full max-w-lg rounded-[22px] bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 text-[#1d1d1f] my-8 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 text-[#6c12e8] flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f]">
                    تعديل بيانات التذكرة والسوشيال ميديا
                  </h3>
                  <p className="text-[11px] text-[#7a7a7a]">
                    تغيير الاسم أو حذف وإخفاء روابط فيسبوك وتويتر من التذكرة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center rounded-xl bg-[#f5f5f7] p-1 gap-1 text-xs font-semibold mb-4">
              <button
                type="button"
                onClick={() => setEditTab("attendee")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editTab === "attendee"
                    ? "bg-white text-[#1d1d1f] shadow-xs"
                    : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                }`}
              >
                بيانات المشارك
              </button>
              <button
                type="button"
                onClick={() => setEditTab("social")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editTab === "social"
                    ? "bg-white text-[#6c12e8] shadow-xs"
                    : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                }`}
              >
                السوشيال ميديا (فيسبوك وتويتر)
              </button>
              <button
                type="button"
                onClick={() => setEditTab("event")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editTab === "event"
                    ? "bg-white text-[#1d1d1f] shadow-xs"
                    : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                }`}
              >
                بيانات الفعالية
              </button>
            </div>

            {editNotice && (
              <div className="mb-3 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium border border-emerald-200">
                {editNotice}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveEdit}>
              {/* TAB 1: Attendee */}
              {editTab === "attendee" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      اسم الحاضر (Attendee Name): <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.attendeeName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, attendeeName: e.target.value })
                      }
                      className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] font-semibold focus:border-[#6c12e8] focus:bg-white focus:outline-none transition-all"
                      placeholder="مثال: يوسف أنور عبد الفتاح"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                        رقم التذكرة:
                      </label>
                      <input
                        type="text"
                        value={editForm.ticketNumber}
                        onChange={(e) =>
                          setEditForm({ ...editForm, ticketNumber: e.target.value })
                        }
                        className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                        الفئة:
                      </label>
                      <select
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            category: e.target.value as TicketData["category"],
                          })
                        }
                        className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3 py-2 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="General">عامة (General)</option>
                        <option value="VIP">كبار الزوار (VIP)</option>
                        <option value="Speaker">متحدث (Speaker)</option>
                        <option value="Organizer">تنظيم (Organizer)</option>
                        <option value="Media">إعلام (Media)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Social Links */}
              {editTab === "social" && (
                <div className="space-y-3.5">
                  <p className="text-[11px] text-[#7a7a7a] leading-relaxed">
                    يمكنك تعديل روابط السوشيال ميديا المعروضة أسفل التذكرة أو حذفها/إخفاؤها نهائياً بحيث تختفي أيقونتها تماماً من التذكرة والإيميل.
                  </p>

                  {/* Facebook */}
                  <div className="rounded-xl border border-neutral-200 p-3 bg-[#fafafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.showFacebook && !!editForm.facebookUrl}
                          onChange={(e) =>
                            setEditForm({ ...editForm, showFacebook: e.target.checked })
                          }
                          className="rounded text-[#6c12e8] cursor-pointer"
                        />
                        <span>فيسبوك (Facebook)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            facebookUrl: "",
                            showFacebook: false,
                          })
                        }
                        className="text-[10.5px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>إزالة من التذكرة</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="https://facebook.com/yourpage"
                      value={editForm.facebookUrl}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          facebookUrl: e.target.value,
                          showFacebook: !!e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#6c12e8] outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Twitter / X */}
                  <div className="rounded-xl border border-neutral-200 p-3 bg-[#fafafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.showTwitter && !!editForm.twitterUrl}
                          onChange={(e) =>
                            setEditForm({ ...editForm, showTwitter: e.target.checked })
                          }
                          className="rounded text-[#6c12e8] cursor-pointer"
                        />
                        <span>تويتر / X (Twitter)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            twitterUrl: "",
                            showTwitter: false,
                          })
                        }
                        className="text-[10.5px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>إزالة من التذكرة</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="https://twitter.com/yourhandle"
                      value={editForm.twitterUrl}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          twitterUrl: e.target.value,
                          showTwitter: !!e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#6c12e8] outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Instagram */}
                  <div className="rounded-xl border border-neutral-200 p-3 bg-[#fafafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.showInstagram && !!editForm.instagramUrl}
                          onChange={(e) =>
                            setEditForm({ ...editForm, showInstagram: e.target.checked })
                          }
                          className="rounded text-[#6c12e8] cursor-pointer"
                        />
                        <span>إنستغرام (Instagram)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            instagramUrl: "",
                            showInstagram: false,
                          })
                        }
                        className="text-[10.5px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>إزالة من التذكرة</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="https://instagram.com/yourhandle"
                      value={editForm.instagramUrl}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          instagramUrl: e.target.value,
                          showInstagram: !!e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#6c12e8] outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Event & Greeting Details */}
              {editTab === "event" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      عنوان الترحيب:
                    </label>
                    <input
                      type="text"
                      value={editForm.greetingTitle}
                      onChange={(e) =>
                        setEditForm({ ...editForm, greetingTitle: e.target.value })
                      }
                      placeholder="يا مرحب بيك"
                      className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      عنوان الترحيب الفرعي:
                    </label>
                    <input
                      type="text"
                      value={editForm.greetingSubtitle}
                      onChange={(e) =>
                        setEditForm({ ...editForm, greetingSubtitle: e.target.value })
                      }
                      placeholder="أنت ضمن القائمة!"
                      className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      الوصف الترحيبي:
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.greetingDescription}
                      onChange={(e) =>
                        setEditForm({ ...editForm, greetingDescription: e.target.value })
                      }
                      className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                        تاريخ الفعالية:
                      </label>
                      <input
                        type="text"
                        value={editForm.eventDate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, eventDate: e.target.value })
                        }
                        className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                        الوقت:
                      </label>
                      <input
                        type="text"
                        value={editForm.eventTime}
                        onChange={(e) =>
                          setEditForm({ ...editForm, eventTime: e.target.value })
                        }
                        className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      مكان الفعالية (المسرح):
                    </label>
                    <input
                      type="text"
                      value={editForm.venueName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, venueName: e.target.value })
                      }
                      className="w-full rounded-xl border border-neutral-300 bg-[#fafafc] px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-full px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-press rounded-full bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] hover:opacity-95 text-white px-5 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "جاري الحفظ..." : "حفظ التغييرات وتحديث التذكرة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
