"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckInResult, TicketData } from "@/types/ticket";
import {
  QrCode,
  Scan,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  ArrowRight,
  Volume2,
  VolumeX,
  History,
  Camera,
  RefreshCw,
  Upload,
} from "lucide-react";

// Web Audio API Synthesized Audio Feedback (zero external assets needed)
function playAudioTone(type: "success" | "error") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "success") {
      // Pleasant two-tone chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);
    } else {
      // Low buzz for alert / duplicate
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // Audio context may be restricted before user interaction
  }
}

function CheckInTerminal() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [inputCode, setInputCode] = useState(initialToken);
  const [station, setStation] = useState("بوابة 1 - المدخل الرئيسي");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{ time: string; result: CheckInResult }>>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const html5QrCodeRef = useRef<any>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean and extract token from any QR output
  const extractTokenFromScan = (rawText: string): string => {
    let clean = rawText.trim();
    if (clean.includes("NEXTGEN:SEC:")) {
      return clean.replace("NEXTGEN:SEC:", "").trim();
    }
    if (clean.includes("token=")) {
      const match = clean.match(/[?&]token=([^&#\s]+)/);
      if (match) return decodeURIComponent(match[1]).trim();
    }
    if (clean.includes("/tickets/")) {
      const match = clean.match(/\/tickets\/([^/?#\s]+)/);
      if (match) return decodeURIComponent(match[1]).trim();
    }
    return clean;
  };

  // Automatically execute verification if token is in query params
  useEffect(() => {
    if (initialToken) {
      handleCheckIn(initialToken);
    }
    inputRef.current?.focus();
  }, [initialToken]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
      }
    };
  }, []);

  const handleCheckIn = async (codeToVerify?: string) => {
    const raw = codeToVerify || inputCode;
    const code = extractTokenFromScan(raw);
    if (!code) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code, station }),
      });

      const data: CheckInResult = await res.json();
      setResult(data);

      if (data.success) {
        if (soundEnabled) playAudioTone("success");
      } else {
        if (soundEnabled) playAudioTone("error");
      }

      setRecentScans((prev) => [
        { time: new Date().toLocaleTimeString("ar-EG"), result: data },
        ...prev.slice(0, 9),
      ]);

      // Clear input and refocus for rapid consecutive scanning
      setInputCode("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      const errResult: CheckInResult = {
        success: false,
        message: "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الشبكة.",
        status: "not_found",
      };
      setResult(errResult);
      if (soundEnabled) playAudioTone("error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCheckIn();
    }
  };

  // Real-time camera scanner via Html5Qrcode
  const startCamera = async () => {
    setCameraError("");
    setIsCameraActive(true);

    try {
      // Dynamic import to prevent SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");

      // Give DOM time to mount container
      setTimeout(async () => {
        try {
          const scannerElement = document.getElementById("qr-interactive-scanner-view");
          if (!scannerElement) return;

          if (html5QrCodeRef.current) {
            try {
              await html5QrCodeRef.current.stop();
              html5QrCodeRef.current.clear();
            } catch {}
          }

          const qrScanner = new Html5Qrcode("qr-interactive-scanner-view");
          html5QrCodeRef.current = qrScanner;

          await qrScanner.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText: string) => {
              const now = Date.now();
              const cleanToken = extractTokenFromScan(decodedText);

              // 2.5 second debounce for duplicate scan prevention
              if (
                lastScannedRef.current.code === cleanToken &&
                now - lastScannedRef.current.time < 2500
              ) {
                return;
              }

              lastScannedRef.current = { code: cleanToken, time: now };
              handleCheckIn(cleanToken);
            },
            () => {
              // Routine frame scan progress (no barcode in frame)
            }
          );
        } catch (err: any) {
          console.error("Camera startup error:", err);
          setCameraError("تعذر تشغيل الكاميرا. يرجى التأكد من إعطاء إذن الكاميرا للمتصفح.");
          setIsCameraActive(false);
        }
      }, 150);
    } catch (err: any) {
      console.error("Module import error:", err);
      setCameraError("تعذر تحميل مشغل الكاميرا.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Camera stop error:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Scan QR from image file
  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode("temp-file-scan-holder");
      const text = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      const token = extractTokenFromScan(text);
      await handleCheckIn(token);
    } catch (err) {
      alert("لم يتم التعرف على رمز QR صالح في هذه الصورة. يرجى التأكد من وضوح الصورة.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-[#0066cc]">Next Gen 2026 • محطة فحص التذاكر</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2.5">
            <Scan className="h-7 w-7 text-[#0066cc]" />
            <span>نظام المسح والتحقق الذري (Check-in Scanner)</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7a7a] mt-0.5">
            تحقق فوري من بيانات التذكرة، كشف التكرار، وتسجيل الدخول الذري لملتقى الجيل القادم.
          </p>
        </div>

        {/* Station Settings & Audio Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 border border-[#e5e5e7] text-xs">
            <span className="text-[#7a7a7a] font-medium">المحطة:</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="bg-transparent font-semibold text-[#1d1d1f] focus:outline-none"
            >
              <option value="بوابة 1 - المدخل الرئيسي">بوابة 1 - المدخل الرئيسي</option>
              <option value="بوابة 2 - كبار الزوار (VIP)">بوابة 2 - كبار الزوار (VIP)</option>
              <option value="بوابة 3 - الكواليس والمتحدثين">بوابة 3 - الكواليس والمتحدثين</option>
            </select>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-press flex items-center justify-center rounded-full bg-white p-2 border border-[#e5e5e7] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
            title={soundEnabled ? "كتم الصوت" : "تفعيل التنبيه الصوتي"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-[#0066cc]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#7a7a7a]" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Scanner Terminal Input & Result Card (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Main Scan Input Card */}
          <div className="rounded-[18px] bg-white p-5 sm:p-6 border border-[#e5e5e7] shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-[#0066cc]" />
                <span>إدخال رمز الـ QR أو رقم التذكرة</span>
              </label>
              <span className="text-[11px] text-[#7a7a7a]">
                يدعم قارئات الباركود اليدوية والكاميرا
              </span>
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="امسح الرمز أو اكتب مثل: A125 أو الصق رابط التذكرة..."
                className="flex-1 rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-2.5 text-xs sm:text-sm font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
              />
              <button
                onClick={() => handleCheckIn()}
                disabled={loading || !inputCode.trim()}
                className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-6 py-2.5 text-xs sm:text-sm font-medium text-white shadow-2xs transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                <span>فحص</span>
              </button>
            </div>

            {/* Camera Scanner Toggle & Upload */}
            <div className="mt-4 pt-3.5 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (isCameraActive ? stopCamera() : startCamera())}
                  className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isCameraActive
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-[#0066cc]/10 text-[#0066cc] hover:bg-[#0066cc]/20"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{isCameraActive ? "إيقاف الكاميرا" : "تشغيل كاميرا الهاتف / اللابتوب"}</span>
                </button>

                <label className="btn-press cursor-pointer inline-flex items-center gap-1 text-xs text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  <span>مسح من صورة</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScanImageFile}
                    className="hidden"
                  />
                </label>
              </div>

              <span className="text-[11px] text-[#7a7a7a]">
                توجيه الكاميرا يمسح الرمز تلقائياً وبسرعة فائقة
              </span>
            </div>

            {/* Hidden holder for file scan processing */}
            <div id="temp-file-scan-holder" className="hidden" />

            {/* Camera error message */}
            {cameraError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Real Interactive Camera Scanner View */}
            {isCameraActive && (
              <div className="mt-4 relative rounded-2xl overflow-hidden bg-black shadow-lg border border-[#333]">
                <div
                  id="qr-interactive-scanner-view"
                  className="w-full min-h-[280px] max-h-[360px] overflow-hidden"
                />
                <div className="p-2.5 bg-[#1d1d1f] text-center text-white/80 text-[11px] flex items-center justify-center gap-2 border-t border-white/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>الكاميرا تعمل: وجّه الرمز المربع داخل المربع للتحقق الفوري</span>
                </div>
              </div>
            )}
          </div>

          {/* Validation Result Display Card */}
          {result && (
            <div
              className={`rounded-3xl p-6 shadow-md border transition-all animate-in fade-in zoom-in-95 ${
                result.success
                  ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                  : result.alreadyCheckedIn
                  ? "bg-amber-50/90 border-amber-300 text-amber-950"
                  : "bg-red-50/90 border-red-300 text-red-950"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {result.success ? (
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                  ) : result.alreadyCheckedIn ? (
                    <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                      <AlertTriangle className="h-7 w-7" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md">
                      <XCircle className="h-7 w-7" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {result.success
                        ? "دخول مصرح به (ACCESS GRANTED)"
                        : result.alreadyCheckedIn
                        ? "دخول مكرر مرفوض (DUPLICATE ENTRY)"
                        : "تذكرة غير صالحة (INVALID TICKET)"}
                    </span>
                    <span className="text-xs font-mono opacity-60">
                      {new Date().toLocaleTimeString("ar-EG")}
                    </span>
                  </div>

                  <h3 className="text-xl font-black mb-2">{result.message}</h3>

                  {result.ticket && (
                    <div className="mt-3 rounded-2xl bg-white/80 p-4 border border-black/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-black/5 pb-2">
                        <span className="text-neutral-500 flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>اسم الحضور:</span>
                        </span>
                        <strong className="text-sm font-bold text-neutral-900">
                          {result.ticket.attendeeName}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between border-b border-black/5 pb-2">
                        <span className="text-neutral-500">رقم التذكرة:</span>
                        <span className="font-mono font-bold text-[#8a38f5] text-sm">
                          {result.ticket.ticketNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-black/5 pb-2">
                        <span className="text-neutral-500">فئة الحضور:</span>
                        <span className="font-semibold text-neutral-800">
                          {result.ticket.category || "General"}
                        </span>
                      </div>

                      {result.alreadyCheckedIn && result.checkedInAt && (
                        <div className="flex items-center justify-between text-amber-800 font-semibold pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>تاريخ أول تسجيل دخول:</span>
                          </span>
                          <span>
                            {new Date(result.checkedInAt).toLocaleTimeString("ar-EG")} (
                            {result.ticket.checkInStation || "نقطة سابقة"})
                          </span>
                        </div>
                      )}

                      {result.success && (
                        <div className="pt-2 flex justify-end">
                          <Link
                            href={`/tickets/${result.ticket.id}`}
                            className="text-xs font-bold text-[#8a38f5] hover:underline"
                          >
                            عرض التذكرة بالكامل ←
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Scans Log & Live Stats (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-purple-100">
            <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#8a38f5]" />
                <span>سجل عمليات المسح الأخيرة</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono">Live Log</span>
            </h2>

            {recentScans.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-400">
                لم يتم تسجيل أي عمليات مسح بعد في هذه الجلسة.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-3 border text-xs flex items-center justify-between ${
                      scan.result.success
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                        : scan.result.alreadyCheckedIn
                        ? "bg-amber-50/50 border-amber-200 text-amber-900"
                        : "bg-red-50/50 border-red-200 text-red-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {scan.result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : scan.result.alreadyCheckedIn ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold">
                          {scan.result.ticket?.attendeeName || "رمز غير معرّف"}
                        </div>
                        <div className="text-[10px] opacity-75 font-mono">
                          {scan.result.ticket?.ticketNumber || "N/A"}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] opacity-70 font-mono">{scan.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>

      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-neutral-500">جاري التحميل...</div>}>
      <CheckInTerminal />
    </Suspense>
  );
}
