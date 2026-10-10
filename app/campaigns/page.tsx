"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Monitor,
  Clock,
  XCircle,
  HelpCircle,
  Settings,
  Shield,
  Key,
  Server,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Lock,
} from "lucide-react";
import { TicketData, EmailDeliveryRecord, EmailSettings } from "@/types/ticket";

export default function BulkEmailCampaignPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [emailHtml, setEmailHtml] = useState("");

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState("");

  // Bulk campaign state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);
  const [campaignResultMsg, setCampaignResultMsg] = useState("");

  // Email Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    provider: "mock",
    fromName: "ملتقى الجيل القادم - Next Gen",
    fromEmail: "",
    replyTo: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    resendApiKey: "",
    resendFromEmail: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
        if (data.tickets.length > 0 && !selectedTicket) {
          setSelectedTicket(data.tickets[0]);
          loadEmailPreview(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch("/api/settings/email");
      const data = await res.json();
      if (data.settings) {
        setEmailSettings((prev) => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmailPreview = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/email?format=json`);
      const data = await res.json();
      if (data.html) setEmailHtml(data.html);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchEmailSettings();
  }, []);

  // 1. Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes("@")) return;

    setIsSendingTest(true);
    setTestResultMsg("");

    try {
      const res = await fetch("/api/campaigns/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTest: true,
          testEmailRecipient: testEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.mockMode) {
          setTestResultMsg("✓ تم إرسال التجربة بنجاح (وضع Mock التجريبي). لربط إيميلك الفعلي، اضغط على 'إعدادات ربط البريد'.");
        } else {
          setTestResultMsg(`✓ تم إرسال التذكرة التجريبية بنجاح إلى ${testEmail} عبر ${data.provider?.toUpperCase()}! تفقد صندوق الوارد (Inbox).`);
        }
      } else {
        setTestResultMsg(`✕ خطأ: ${data.error || "فشل إرسال الإيميل"}`);
      }
    } catch (err: any) {
      setTestResultMsg(`✕ خطأ: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // 2. Launch Bulk Campaign in Batches
  const handleLaunchCampaign = async () => {
    setShowConfirmModal(false);
    setIsSendingBulk(true);
    setCampaignResultMsg("");
    setBulkProgress({ sent: 0, failed: 0, total: tickets.length });

    try {
      let remaining = tickets.length;
      let totalSent = 0;
      let totalFailed = 0;

      while (remaining > 0) {
        const res = await fetch("/api/campaigns/send-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 15 }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "توقف الإرسال بسبب خطأ في الخادم");
        }

        totalSent += data.sentCount;
        totalFailed += data.failedCount;
        remaining = data.remainingCount;

        setBulkProgress({
          sent: totalSent,
          failed: totalFailed,
          total: tickets.length,
        });

        if (data.batchSize === 0 || remaining === 0) break;
      }

      setCampaignResultMsg(`✓ اكتملت الحملة بنجاح: تم إرسال ${totalSent} تذكرة بنجاح، وتعثر ${totalFailed} إيميل.`);
    } catch (err: any) {
      setCampaignResultMsg(`✕ توقفت الحملة: ${err.message}`);
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Save Email Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsNotice("");
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsNotice("✓ تم حفظ الإعدادات بنجاح!");
        setTimeout(() => setSettingsNotice(""), 3000);
      } else {
        setSettingsNotice(`✕ خطأ: ${data.error}`);
      }
    } catch (err: any) {
      setSettingsNotice(`✕ خطأ: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Email Settings Connection
  const handleTestConnection = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setSettingsNotice("يرجى كتابة بريدك الإلكتروني في حقل التجربة أولاً لاختبار الاتصال به");
      return;
    }
    setTestingConnection(true);
    setSettingsNotice("");
    try {
      // First save settings
      await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });

      // Then test
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsNotice(`✓ ${data.message}`);
      } else {
        setSettingsNotice(`✕ فشل الاختبار: ${data.error}`);
      }
    } catch (err: any) {
      setSettingsNotice(`✕ فشل الاختبار: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Preset quick fill
  const applyPreset = (preset: "gmail" | "outlook" | "custom") => {
    if (preset === "gmail") {
      setEmailSettings((prev) => ({
        ...prev,
        provider: "smtp",
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        smtpSecure: true,
      }));
    } else if (preset === "outlook") {
      setEmailSettings((prev) => ({
        ...prev,
        provider: "smtp",
        smtpHost: "smtp.office365.com",
        smtpPort: 587,
        smtpSecure: false,
      }));
    } else {
      setEmailSettings((prev) => ({
        ...prev,
        provider: "smtp",
      }));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-[#7a7a7a]">
            <Link href="/" className="hover:text-[#1d1d1f] flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              <span>الرئيسية</span>
            </Link>
            <span>/</span>
            <span className="text-[#0066cc] font-semibold">حملات البريد الإلكتروني</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2.5">
            <Mail className="h-7 w-7 text-[#0066cc]" />
            <span>إرسال التذاكر الجماعية (Bulk Ticket Email Delivery)</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7a7a] mt-0.5">
            إرسال التذاكر الرسمية مع باركود الدخول المشفر إلى صناديق الوارد (Inbox) عبر بريدك الشخصي أو SMTP أو Resend.
          </p>
        </div>

        {/* Current Provider Status Badge & Settings Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e5e7] hover:border-[#0066cc] px-4 py-2 text-xs font-medium text-[#1d1d1f] shadow-2xs transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-[#0066cc]" />
            <span>إعدادات ربط البريد وحماية الـ Spam</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-full border border-[#e5e5e7] text-xs shadow-2xs">
            <span className="text-[#7a7a7a]">المزود النشط:</span>
            {emailSettings.provider === "smtp" ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                SMTP ({emailSettings.smtpUser ? emailSettings.smtpUser.split("@")[0] : "مخصص"})
              </span>
            ) : emailSettings.provider === "resend" ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Resend API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                وضع المحاكاة (Mock Dev)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Email Controls & Test Dispatch (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. Test Email Box */}
          <div className="rounded-[18px] bg-white p-5 sm:p-6 border border-[#e5e5e7] shadow-2xs space-y-3.5">
            <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
              <Send className="h-4 w-4 text-[#0066cc]" />
              <span>إرسال بريد تجريبي (Test Email)</span>
            </h2>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              تأكد من شكل التذكرة ووصولها إلى صندوق الوارد (Inbox) الأساسي قبل إطلاق الحملة الجماعية لجميع الحضور.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                  أدخل بريدك الإلكتروني لتلقي التجربة:
                </label>
                <input
                  type="email"
                  required
                  placeholder="anwar@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingTest || !testEmail}
                className="btn-press w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-4 py-2 text-xs font-medium text-white shadow-2xs transition-colors disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري إرسال التجربة...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>إرسال تذكرة تجريبية الآن</span>
                  </>
                )}
              </button>
            </form>

            {testResultMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${testResultMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {testResultMsg}
              </div>
            )}
          </div>

          {/* 2. Bulk Campaign Dispatch Box */}
          <div className="rounded-[18px] bg-white p-5 sm:p-6 border border-[#e5e5e7] shadow-2xs space-y-3.5">
            <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#0066cc]" />
              <span>إطلاق حملة الإرسال الجماعية</span>
            </h2>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              إرسال منظم في دفعات (15 بريد/دفعة) مع فاصل زمني لتجنب قيود السيرفرات وضمان أعلى نسبة تسليم في الـ Inbox.
            </p>

            <div className="rounded-xl bg-[#f5f5f7] p-3 border border-[#e5e5e7] space-y-1 text-xs">
              <div className="flex justify-between text-[#7a7a7a]">
                <span>التذاكر الجاهزة للإرسال:</span>
                <span className="font-semibold text-[#1d1d1f] font-mono">{tickets.length} تذكرة</span>
              </div>
              <div className="flex justify-between text-[#7a7a7a]">
                <span>نظام الإرسال:</span>
                <span className="font-semibold text-emerald-700">دفعات مجدولة مع حماية من الـ Spam</span>
              </div>
            </div>

            {bulkProgress && (
              <div className="space-y-2 pt-2 border-t border-[#f0f0f0]">
                <div className="flex justify-between text-xs text-[#7a7a7a]">
                  <span>تقدم الإرسال:</span>
                  <span className="font-mono font-semibold text-[#1d1d1f]">
                    {bulkProgress.sent} من {bulkProgress.total}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-[#0066cc] transition-all duration-300"
                    style={{
                      width: `${bulkProgress.total ? (bulkProgress.sent / bulkProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isSendingBulk || tickets.length === 0}
              className="btn-press w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] hover:bg-black px-4 py-2.5 text-xs font-medium text-white shadow-2xs transition-colors disabled:opacity-50"
            >
              {isSendingBulk ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري إرسال الدفعات...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>بدء إرسال تذاكر جميع الحضور ({tickets.length})</span>
                </>
              )}
            </button>

            {campaignResultMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium ${campaignResultMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {campaignResultMsg}
              </div>
            )}
          </div>

          {/* 3. Anti-Spam Deliverability Tips Card */}
          <div className="rounded-[18px] bg-white p-5 border border-[#e5e5e7] shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-[#0066cc]">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-xs font-semibold">دليل ضمان وصول التذاكر إلى Inbox وتجنب الـ Spam</h3>
            </div>
            <ul className="text-[11px] text-[#7a7a7a] space-y-1.5 leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-[#1d1d1f]">استخدام Google App Password:</strong> إذا كنت تستخدم Gmail، قم بإنشاء كلمة مرور تطبيق من حساب Google بدلاً من كلمة مرورك العادية.
              </li>
              <li>
                <strong className="text-[#1d1d1f]">مطابقة عنوان المرسل:</strong> تأكد أن From Email يطابق البريد الإلكتروني الذي تم تسجيل الدخول به.
              </li>
              <li>
                <strong className="text-[#1d1d1f]">النسخة النصية المدمجة:</strong> يقوم نظامنا بتوليد نسخة Plain-Text تلقائياً بجانب الـ HTML لاجتياز فلاتر Microsoft و Gmail بنجاح.
              </li>
              <li>
                <strong className="text-[#1d1d1f]">ترويسة إلغاء الاشتراك:</strong> يضيف النظام ترويسة List-Unsubscribe المعيارية تلقائياً لرفع تقييم الدومين.
              </li>
            </ul>
          </div>

        </div>

        {/* Right Column: Live Email Template Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              معاينة التذكرة داخل بريد المستلم (Live Inbox Preview):
            </span>
            <span className="text-[11px] text-[#7a7a7a]">
              قالب متوافق 100% مع Gmail و Outlook و Apple Mail
            </span>
          </div>

          {/* Frame Container */}
          <div className="rounded-[24px] bg-white p-4 sm:p-6 border border-[#e5e5e7] shadow-2xs flex justify-center">
            {emailHtml ? (
              <div className="w-full max-w-[400px] overflow-hidden rounded-[20px] border border-[#e5e5e7] shadow-md bg-[#f5f5f7]">
                <iframe
                  srcDoc={emailHtml}
                  title="Email Preview"
                  className="w-full h-[720px] border-none"
                />
              </div>
            ) : (
              <div className="py-28 text-center text-xs text-[#7a7a7a] flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
                <span>جاري تحميل قالب البريد...</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: EMAIL SETTINGS & ANTI-SPAM CONFIGURATION */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl border border-[#e5e5e7] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-[#0066cc]" />
                <h3 className="text-base font-semibold text-[#1d1d1f]">
                  إعدادات ربط البريد الإلكتروني (Email Provider Settings)
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[#7a7a7a] hover:text-[#1d1d1f] p-1"
              >
                ✕
              </button>
            </div>

            {/* Provider Switch Tabs */}
            <div className="mb-5 flex rounded-full bg-[#f5f5f7] p-1 border border-[#e5e5e7]">
              <button
                type="button"
                onClick={() => setEmailSettings((prev) => ({ ...prev, provider: "smtp" }))}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  emailSettings.provider === "smtp"
                    ? "bg-white text-[#1d1d1f] shadow-2xs"
                    : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                }`}
              >
                خادم SMTP شخصي (Gmail / Outlook / دومينك)
              </button>
              <button
                type="button"
                onClick={() => setEmailSettings((prev) => ({ ...prev, provider: "resend" }))}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  emailSettings.provider === "resend"
                    ? "bg-white text-[#1d1d1f] shadow-2xs"
                    : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                }`}
              >
                خدمة Resend API
              </button>
              <button
                type="button"
                onClick={() => setEmailSettings((prev) => ({ ...prev, provider: "mock" }))}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  emailSettings.provider === "mock"
                    ? "bg-white text-[#1d1d1f] shadow-2xs"
                    : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                }`}
              >
                وضع Mock (تجريبي)
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              
              {/* If SMTP is selected */}
              {emailSettings.provider === "smtp" && (
                <>
                  {/* Presets */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#7a7a7a]">إعداد سريع:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset("gmail")}
                      className="btn-press text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full hover:bg-red-100"
                    >
                      Gmail (smtp.gmail.com)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("outlook")}
                      className="btn-press text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full hover:bg-blue-100"
                    >
                      Outlook / Office 365
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        خادم SMTP (Host):
                      </label>
                      <input
                        type="text"
                        required
                        value={emailSettings.smtpHost || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        المنفذ (Port):
                      </label>
                      <input
                        type="number"
                        required
                        value={emailSettings.smtpPort || 465}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: Number(e.target.value) })}
                        placeholder="465 أو 587"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        البريد الإلكتروني (Username):
                      </label>
                      <input
                        type="email"
                        required
                        value={emailSettings.smtpUser || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                        placeholder="yourname@gmail.com"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1 flex items-center justify-between">
                        <span>كلمة المرور / App Password:</span>
                        <span className="text-[10px] text-[#0066cc] font-normal">مشفرة بأمان</span>
                      </label>
                      <input
                        type="password"
                        value={emailSettings.smtpPassword || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                        placeholder="كلمة مرور التطبيق (16 حرف)"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        اسم المرسل الظاهر للحضور (From Name):
                      </label>
                      <input
                        type="text"
                        value={emailSettings.fromName || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                        placeholder="ملتقى الجيل القادم - Next Gen"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        بريد المرسل (From Email):
                      </label>
                      <input
                        type="email"
                        value={emailSettings.fromEmail || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                        placeholder="anwar@example.com"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* If Resend is selected */}
              {emailSettings.provider === "resend" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                      مفتاح Resend API Key:
                    </label>
                    <input
                      type="password"
                      value={emailSettings.resendApiKey || ""}
                      onChange={(e) => setEmailSettings({ ...emailSettings, resendApiKey: e.target.value })}
                      placeholder="re_xxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                      بريد الإرسال المعتمد (From Email):
                    </label>
                    <input
                      type="text"
                      value={emailSettings.resendFromEmail || ""}
                      onChange={(e) => setEmailSettings({ ...emailSettings, resendFromEmail: e.target.value })}
                      placeholder="Next Gen Forum <tickets@yourdomain.com>"
                      className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {settingsNotice && (
                <div className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${settingsNotice.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  {settingsNotice}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0066cc] px-4 py-2 text-xs font-medium text-[#0066cc] hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {testingConnection ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>اختبار الاتصال وإرسال تجربة فورية</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="rounded-full px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#f5f5f7]"
                  >
                    إغلاق
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-5 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM BULK DISPATCH */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl border border-[#e5e5e7] animate-in fade-in zoom-in-95 text-center space-y-3">
            <Mail className="mx-auto h-10 w-10 text-[#0066cc] mb-1" />
            <h3 className="text-base font-semibold text-[#1d1d1f]">
              تأكيد إرسال {tickets.length} تذكرة إلكترونية؟
            </h3>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              سيتم إرسال تذكرة كل مشارك مخصصة باسمه مع رمز QR المشفر في دفعات متتالية.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-full px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#f5f5f7]"
              >
                إلغاء
              </button>
              <button
                onClick={handleLaunchCampaign}
                className="btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-6 py-2 text-xs font-medium text-white transition-colors"
              >
                تأكيد وبدء الإرسال
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
