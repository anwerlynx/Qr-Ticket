"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { EventTicketSettings, TicketData } from "@/types/ticket";
import { NextGenFigmaTicket } from "@/components/tickets/NextGenFigmaTicket";
import {
  Calendar,
  Clock,
  MapPin,
  Map,
  Globe,
  Share2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Mail,
  SlidersHorizontal,
  Info,
} from "lucide-react";

export default function TicketTemplateSettingsPage() {
  const [settings, setSettings] = useState<EventTicketSettings>({
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncExistingTickets, setSyncExistingTickets] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"event" | "greetings" | "social">("event");

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/settings/event");
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load event settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/settings/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          syncExistingTickets,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل حفظ الإعدادات");
        return;
      }

      setSuccessMessage(
        `✓ تم حفظ القالب العام بنجاح! تم تحديث إعدادات التذاكر والإيميلات${
          data.updatedTicketsCount ? ` وتحديث ${data.updatedTicketsCount} تذكرة في قاعدة البيانات` : ""
        }.`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: any) {
      alert("خطأ أثناء الحفظ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Mock sample ticket to preview with live template settings
  const sampleTicketPreview: TicketData = {
    id: "sample-preview",
    ticketNumber: "A125",
    secureCredential: "PREVIEW_SAMPLE_CREDENTIAL_2026",
    attendeeName: "أحمد محمد علي (نموذج)",
    category: "VIP",
    eventName: settings.eventName,
    eventTagline: settings.eventTagline,
    eventDate: settings.eventDate,
    eventTime: settings.eventTime,
    venueName: settings.venueName,
    venueAddress: settings.venueAddress,
    mapUrl: settings.mapUrl,
    greetingTitle: settings.greetingTitle,
    greetingSubtitle: settings.greetingSubtitle,
    greetingDescription: settings.greetingDescription,
    facebookUrl: settings.facebookUrl,
    twitterUrl: settings.twitterUrl,
    instagramUrl: settings.instagramUrl,
    showFacebook: settings.showFacebook,
    showTwitter: settings.showTwitter,
    showInstagram: settings.showInstagram,
    copyrightText: settings.copyrightText,
    organizerName: settings.organizerName,
    status: "valid",
    issuedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-8 text-[#1d1d1f] font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#7a7a7a]">
            <Link href="/" className="hover:text-[#1d1d1f] flex items-center gap-1 transition-colors">
              <ArrowRight className="h-3 w-3" />
              <span>الرئيسية</span>
            </Link>
            <span>/</span>
            <span className="text-[#6c12e8] font-semibold">تعديل قالب التذكرة العام</span>
          </div>

          <Link
            href="/tickets"
            className="text-xs text-[#0066cc] font-medium hover:underline flex items-center gap-1"
          >
            <span>دليل التذاكر الصادرة</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6 rounded-[22px] bg-white p-6 border border-[#e5e5e7] shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[#6c12e8] mb-2 border border-purple-200">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>إعدادات القالب العام للفعالية</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1d1d1f]">
                تعديل قالب التذكرة العام (البيانات الثابتة)
              </h1>
              <p className="text-xs sm:text-sm text-[#7a7a7a] mt-1 max-w-3xl leading-relaxed">
                هنا يمكنك تعديل البيانات الأساسية المشتركة في جميع التذاكر (التاريخ، الوقت، المسرح، رابط خرائط جوجل، الرسائل الترحيبية، وحسابات التواصل).
              </p>
            </div>

            {/* Smart Distinction Pill */}
            <div className="rounded-2xl bg-[#fafafc] p-3.5 border border-[#e5e5e7] text-xs max-w-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-950">
                <Info className="h-4 w-4 text-[#6c12e8]" />
                <span>البيانات المتغيرة لكل شخص:</span>
              </div>
              <p className="text-[11px] text-[#7a7a7a] leading-relaxed">
                الاسم، كود التذكرة الفريد، وباركود QR يتم توليدهم وتخصيصهم تلقائياً لكل مشارك على حدة عند استيراد الملف أو إصدار التذكرة.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Form on Right, Live Preview on Left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Right Column: Template Settings Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            <form onSubmit={handleSave} className="rounded-[22px] bg-white p-5 sm:p-6 border border-[#e5e5e7] shadow-2xs space-y-5">
              
              {/* Tabs */}
              <div className="flex items-center rounded-xl bg-[#f5f5f7] p-1 gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("event")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    activeTab === "event"
                      ? "bg-white text-[#1d1d1f] shadow-xs font-bold"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  📅 موعد ومكان الفعالية
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("greetings")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    activeTab === "greetings"
                      ? "bg-white text-[#6c12e8] shadow-xs font-bold"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  ✍️ النصوص والترحيب
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("social")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    activeTab === "social"
                      ? "bg-white text-[#1d1d1f] shadow-xs font-bold"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  🌐 السوشيال ميديا
                </button>
              </div>

              {successMessage && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 font-bold border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* TAB 1: EVENT DATE, TIME, LOCATION & MAP */}
              {activeTab === "event" && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#6c12e8]" />
                        <span>تاريخ الفعالية:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.eventDate}
                        onChange={(e) => setSettings({ ...settings, eventDate: e.target.value })}
                        placeholder="مثال: 13 أكتوبر 2026"
                        className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                      />
                      <span className="text-[10.5px] text-[#7a7a7a] mt-1 block">يظهر بجانب أيقونة التاريخ على التذكرة</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#6c12e8]" />
                        <span>وقت بدء الفعالية:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.eventTime}
                        onChange={(e) => setSettings({ ...settings, eventTime: e.target.value })}
                        placeholder="مثال: 05:00 مساءً"
                        className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                      />
                      <span className="text-[10.5px] text-[#7a7a7a] mt-1 block">يظهر بجانب أيقونة الساعة</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#6c12e8]" />
                      <span>مكان الفعالية (المسرح / القاعة):</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.venueName}
                      onChange={(e) => setSettings({ ...settings, venueName: e.target.value })}
                      placeholder="مثال: المسرح المدرسي كفر الشيخ ، القوات المسلحه"
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5 flex items-center gap-1.5">
                      <Map className="h-3.5 w-3.5 text-[#6c12e8]" />
                      <span>رابط خرائط جوجل (Google Maps URL):</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={settings.mapUrl || ""}
                        onChange={(e) => setSettings({ ...settings, mapUrl: e.target.value })}
                        placeholder="https://maps.google.com/?q=31.1107,30.9388"
                        className="flex-1 rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs font-mono text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                        dir="ltr"
                      />
                      {settings.mapUrl && (
                        <a
                          href={settings.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-press rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 px-3 flex items-center justify-center text-xs text-[#0066cc]"
                          title="تجربة فتح الرابط في نافذة جديدة"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <span className="text-[10.5px] text-[#7a7a7a] mt-1 block">
                      عندما يضغط الحاضر على زر الخريطة أو رابط المكان في التذكرة والإيميل، يفتح هذا الرابط مباشرة في خرائط جوجل.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                        اسم الفعالية الرسمي:
                      </label>
                      <input
                        type="text"
                        value={settings.eventName}
                        onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
                        className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                        شعار الفعالية (الهشتاج):
                      </label>
                      <input
                        type="text"
                        value={settings.eventTagline}
                        onChange={(e) => setSettings({ ...settings, eventTagline: e.target.value })}
                        className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GREETINGS & TEXTS */}
              {activeTab === "greetings" && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                      عنوان الترحيب الرئيسي:
                    </label>
                    <input
                      type="text"
                      value={settings.greetingTitle || ""}
                      onChange={(e) => setSettings({ ...settings, greetingTitle: e.target.value })}
                      placeholder="يا مرحب بيك"
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                    <span className="text-[10.5px] text-[#7a7a7a] mt-1 block">يظهر كأول سطر ترحيبي فوق اسم المشارك</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                      عنوان الترحيب الفرعي:
                    </label>
                    <input
                      type="text"
                      value={settings.greetingSubtitle || ""}
                      onChange={(e) => setSettings({ ...settings, greetingSubtitle: e.target.value })}
                      placeholder="أنت ضمن القائمة!"
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#6c12e8] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                    <span className="text-[10.5px] text-[#7a7a7a] mt-1 block">يظهر تحت اسم المشارك</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                      الرسالة والوصف الترحيبي:
                    </label>
                    <textarea
                      rows={3}
                      value={settings.greetingDescription || ""}
                      onChange={(e) => setSettings({ ...settings, greetingDescription: e.target.value })}
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2.5 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none leading-relaxed"
                    />
                    <span className="text-[10.5px] text-[#7a7a7a] mt-1 block">الفقرة التوضيحية المكتوبة أعلى صورة التذكرة</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      نص حقوق الملكية (Footer Copyright):
                    </label>
                    <input
                      type="text"
                      value={settings.copyrightText || ""}
                      onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] focus:border-[#6c12e8] focus:bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SOCIAL MEDIA */}
              {activeTab === "social" && (
                <div className="space-y-4 pt-1">
                  <p className="text-xs text-[#7a7a7a] leading-relaxed">
                    يمكنك تعديل روابط منصات التواصل الاجتماعي الثابتة المعروضة أسفل التذكرة أو إخفاء أي منصة نهائياً بحيث تختفي أيقونتها تماماً:
                  </p>

                  {/* Facebook */}
                  <div className="rounded-xl border border-neutral-200 p-3.5 bg-[#fafafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showFacebook !== false && !!settings.facebookUrl}
                          onChange={(e) =>
                            setSettings({ ...settings, showFacebook: e.target.checked })
                          }
                          className="rounded text-[#6c12e8] cursor-pointer"
                        />
                        <span>فيسبوك (Facebook)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
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
                      value={settings.facebookUrl || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          facebookUrl: e.target.value,
                          showFacebook: !!e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#6c12e8] outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Twitter / X */}
                  <div className="rounded-xl border border-neutral-200 p-3.5 bg-[#fafafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showTwitter !== false && !!settings.twitterUrl}
                          onChange={(e) =>
                            setSettings({ ...settings, showTwitter: e.target.checked })
                          }
                          className="rounded text-[#6c12e8] cursor-pointer"
                        />
                        <span>تويتر / X (Twitter)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
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
                      value={settings.twitterUrl || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          twitterUrl: e.target.value,
                          showTwitter: !!e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#6c12e8] outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Instagram */}
                  <div className="rounded-xl border border-neutral-200 p-3.5 bg-[#fafafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showInstagram !== false && !!settings.instagramUrl}
                          onChange={(e) =>
                            setSettings({ ...settings, showInstagram: e.target.checked })
                          }
                          className="rounded text-[#6c12e8] cursor-pointer"
                        />
                        <span>إنستغرام (Instagram)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
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
                      value={settings.instagramUrl || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          instagramUrl: e.target.value,
                          showInstagram: !!e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-[#1d1d1f] font-mono text-left focus:border-[#6c12e8] outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Sync existing tickets checkbox */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="flex items-start gap-2.5 text-xs text-[#1d1d1f] cursor-pointer p-3 rounded-xl bg-purple-50/70 border border-purple-100">
                  <input
                    type="checkbox"
                    checked={syncExistingTickets}
                    onChange={(e) => setSyncExistingTickets(e.target.checked)}
                    className="mt-0.5 rounded text-[#6c12e8] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold block">تحديث جميع التذاكر الصادرة مسبقاً في قاعدة البيانات</span>
                    <span className="text-[11px] text-[#7a7a7a] block mt-0.5">
                      عند التفعيل، يتم تطبيق التاريخ والمكان الجديد وروابط التواصل فوراً على كل التذاكر الموجودة، مع الحفاظ على اسم كل شخص والباركود الخاص به.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-press w-full rounded-full bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] hover:opacity-95 text-white py-3 text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري حفظ وتحديث القالب العام...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>حفظ وتطبيق القالب العام لجميع التذاكر والإيميلات</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Left Column: Live Figma Ticket Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            <div className="rounded-[22px] bg-white p-5 border border-[#e5e5e7] shadow-2xs">
              <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold text-[#1d1d1f]">معاينة مباشرة للتصميم المعتمد</h3>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                  Figma 114:2224
                </span>
              </div>

              {/* The Live Rendered Ticket */}
              <div className="flex justify-center">
                <NextGenFigmaTicket
                  ticket={sampleTicketPreview}
                  eventSettings={settings}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 text-center text-[11px] text-[#7a7a7a]">
                <span>التغييرات التي تقوم بها على اليمين تظهر فورياً هنا في المعاينة.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
