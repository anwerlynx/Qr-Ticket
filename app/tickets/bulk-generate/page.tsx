"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Ticket,
  Users,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { BulkIssuanceResult, AttendeeRecord } from "@/types/ticket";

export default function BulkTicketGenerationPage() {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [result, setResult] = useState<BulkIssuanceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attendees");
      const data = await res.json();
      if (data.attendees) setAttendees(data.attendees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  const totalRegistered = attendees.length;
  const alreadyIssued = attendees.filter((a) => a.hasTicket).length;
  const eligibleAttendees = attendees.filter((a) => !a.hasTicket);
  const eligibleCount = eligibleAttendees.length;

  const handleExecuteGeneration = async () => {
    setShowConfirmModal(false);
    setIsGenerating(true);
    setErrorMsg("");
    setResult(null);

    try {
      const res = await fetch("/api/tickets/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إصدار التذاكر الجماعي");
      }

      setResult(data.result);
      fetchAttendees();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء إصدار التذاكر");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-neutral-400">
            <Link href="/" className="hover:text-neutral-700">الرئيسية</Link>
            <span>/</span>
            <span className="text-[#8a38f5] font-bold">إصدار التذاكر الجماعي</span>
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
            <Layers className="h-8 w-8 text-[#8a38f5]" />
            <span>إصدار التذاكر الجماعي (Bulk Ticket Generation)</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            إنشاء تذاكر فريدة مؤمنة ورموز QR مشفرة لكل المسجلين المؤهلين دفعة واحدة.
          </p>
        </div>

        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 border border-purple-200 px-4 py-2.5 text-xs font-bold text-[#8a38f5] hover:bg-purple-100 transition-colors"
        >
          <Mail className="h-4 w-4" />
          <span>الانتقال لحملة البريد</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Status & Generation Dashboard Card */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-purple-100 mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              حالة الأهلية للإصدار
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              يقوم النظام بتخطي المسجلين الذين يملكون تذاكر صالحة بالفعل لتجنب التكرار.
            </p>
          </div>
          <button
            onClick={fetchAttendees}
            disabled={loading}
            className="p-2 rounded-xl text-neutral-400 hover:text-purple-700 hover:bg-purple-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-xs font-bold text-neutral-500 block">إجمالي المسجلين</span>
            <span className="text-3xl font-black text-neutral-900 mt-1 block">
              {totalRegistered}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5 block">في قاعدة البيانات</span>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-xs font-bold text-blue-700 block">تذاكر مصدرة مسبقاً</span>
            <span className="text-3xl font-black text-blue-900 mt-1 block">
              {alreadyIssued}
            </span>
            <span className="text-[11px] text-blue-600/70 mt-0.5 block">سيتم استثناؤها بأمان</span>
          </div>

          <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200">
            <span className="text-xs font-bold text-[#8a38f5] block">مؤهلين لإصدار تذكرة جديدة</span>
            <span className="text-3xl font-black text-purple-900 mt-1 block">
              {eligibleCount}
            </span>
            <span className="text-[11px] text-purple-600/70 mt-0.5 block">بانتظار الإصدار</span>
          </div>
        </div>

        {/* Ticket Format & Security Info */}
        <div className="rounded-2xl bg-neutral-900 p-5 text-white mb-8 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300">
            <span>Ticket Pattern: NG-XXXXXXXX</span>
            <span>Cryptographic Hashed Tokens</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              كل تذكرة ستحصل على رقم تذكرة عشوائي فريد غير قابل للتخمين (مثل{" "}
              <span className="font-mono text-purple-300 font-bold">NG-7K4P9X2M</span>) بالإضافة إلى رمز أمان سري منفصل خاص بمسح الـ QR ومحمي بقيود قاعدة البيانات.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
          <div className="text-xs text-neutral-500">
            {eligibleCount > 0 ? (
              <span>جاهز لإصدار {eligibleCount} تذكرة جديدة.</span>
            ) : (
              <span className="text-emerald-600 font-semibold">
                ✓ جميع المسجلين لديهم تذاكر سارية حالياً.
              </span>
            )}
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={eligibleCount === 0 || isGenerating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a38f5] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:bg-[#7826e3] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري توليد التذاكر وحفظها...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>إصدار التذاكر للمسجلين المؤهلين ({eligibleCount})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-[#8a38f5] mb-4">
              <Layers className="h-7 w-7" />
            </div>

            <h3 className="text-xl font-black text-neutral-900 text-center mb-2">
              تأكيد إصدار التذاكر الجماعي
            </h3>
            <p className="text-sm text-neutral-600 text-center mb-6 leading-relaxed">
              سيتم إصدار <strong className="text-purple-700 font-bold">{eligibleCount} تذكرة</strong> للمسجلين المؤهلين وربط كل تذكرة برمز QR مشفر فريد. هل تريد المتابعة؟
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl bg-neutral-100 px-4 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteGeneration}
                className="flex-1 rounded-xl bg-[#8a38f5] px-4 py-3 text-xs font-bold text-white hover:bg-[#7826e3] shadow-md shadow-purple-500/20"
              >
                نعم، ابدأ الإصدار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Issuance Results Card */}
      {result && (
        <div className="rounded-3xl bg-emerald-50/80 p-6 sm:p-8 border border-emerald-300 shadow-md animate-in fade-in zoom-in-95">
          <div className="flex items-start gap-4 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-950">
                اكتملت عملية إصدار التذاكر بنجاح!
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                تم حفظ التذاكر في قاعدة البيانات وربطها بسجلات الحضور بأمان.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200">
              <span className="text-[11px] text-neutral-500 block">تم إنشاؤها</span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                {result.createdCount}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200">
              <span className="text-[11px] text-neutral-500 block">تم تخطيها (مسبقة)</span>
              <span className="text-xl font-black text-blue-700 mt-0.5 block">
                {result.skippedCount}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200">
              <span className="text-[11px] text-neutral-500 block">حالات الفشل</span>
              <span className="text-xl font-black text-neutral-700 mt-0.5 block">
                {result.failedCount}
              </span>
            </div>
          </div>

          {/* Sample Created Tickets */}
          {result.tickets.length > 0 && (
            <div className="mb-6 rounded-2xl bg-white p-4 border border-emerald-200">
              <h4 className="text-xs font-bold text-neutral-700 mb-2">عينة من التذاكر المصدرة حديثاً:</h4>
              <div className="flex flex-wrap gap-2">
                {result.tickets.slice(0, 6).map((t) => (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold hover:bg-purple-100"
                  >
                    <span>{t.attendeeName}</span>
                    <span className="font-mono text-xs opacity-75">({t.ticketNumber})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-200">
            <Link
              href="/tickets"
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-white"
            >
              عرض دليل التذاكر
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#8a38f5] px-6 py-3 text-xs font-bold text-white shadow hover:bg-[#7826e3]"
            >
              <Mail className="h-4 w-4" />
              <span>الانتقال لإرسال التذاكر بالبريد الإلكتروني ←</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
