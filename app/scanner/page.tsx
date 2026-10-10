"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  QrCode,
  Scan,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  DoorOpen,
  LogOut,
  RefreshCw,
  Camera,
  Volume2,
  VolumeX,
  History,
  Sparkles,
} from "lucide-react";
import { Button, Input, Chip } from "@heroui/react";
import { CheckInResult } from "@/types/ticket";

// Web Audio API Synthesized Audio Feedback
function playSound(type: "success" | "error") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "success") {
      // High pleasant two-tone chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);
    } else {
      // Low alert buzzer
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch {}
}

export default function GateScannerPage() {
  const router = useRouter();

  // Auth / Staff state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [staff, setStaff] = useState<{ id: string; name: string; gate: string; totalScans: number } | null>(null);

  // Scan state
  const [manualCode, setManualCode] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [sessionScans, setSessionScans] = useState(0);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const html5QrCodeRef = useRef<any>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  // 1. Verify Scanner Session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/scanner/session");
        const data = await res.json();
        if (data.authenticated && data.staff) {
          setStaff(data.staff);
          setSessionScans(data.staff.totalScans || 0);
        } else {
          router.replace("/scanner/login");
        }
      } catch {
        router.replace("/scanner/login");
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, [router]);

  // Clean and extract token from any QR code payload
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

  // Perform Check-in
  const handleVerify = async (credentialOrToken: string) => {
    const cleanToken = extractTokenFromScan(credentialOrToken);
    if (!cleanToken) return;

    try {
      setLoading(true);
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: cleanToken,
          station: staff?.gate || "بوابة الدخول",
          operator: staff?.name || "منظم البوابة",
        }),
      });

      const data: CheckInResult = await res.json();
      setResult(data);
      setManualCode("");

      if (data.status === "success") {
        if (soundEnabled) playSound("success");
        setSessionScans((prev) => prev + 1);
      } else {
        if (soundEnabled) playSound("error");
      }
    } catch {
      setResult({
        success: false,
        status: "invalid",
        message: "حدث خطأ في الاتصال بالشبكة. حاول مرة أخرى.",
      });
      if (soundEnabled) playSound("error");
    } finally {
      setLoading(false);
    }
  };

  // Start live camera QR scanner
  const startCamera = async () => {
    setCameraError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const qrScanner = new Html5Qrcode("gate-qr-reader");
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          if (
            lastScannedRef.current.code === decodedText &&
            now - lastScannedRef.current.time < 3000
          ) {
            return;
          }
          lastScannedRef.current = { code: decodedText, time: now };
          handleVerify(decodedText);
        },
        () => {}
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      setCameraError("تعذر تشغيل الكاميرا. يرجى التأكد من إعطاء صلاحية الكاميرا للمتصفح.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch {}
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/scanner/session", { method: "POST" });
    router.replace("/scanner/login");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col justify-between selection:bg-purple-500">
      {/* Top Gate Bar */}
      <header className="p-3 sm:p-4 bg-[#111218]/90 border-b border-white/10 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Scan className="h-5 w-5" />
          </div>
          <div className="text-right">
            <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>{staff?.gate || "بوابة الدخول"}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-[10px] sm:text-[11px] text-neutral-400">
              المنظم: <span className="text-neutral-200 font-semibold">{staff?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs flex items-center gap-1 border border-white/5"
            title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-neutral-500" />}
          </button>

          {/* Session counter chip */}
          <Chip size="sm" color="secondary" variant="flat" className="font-mono text-xs font-bold">
            {sessionScans} تم فحصهم
          </Chip>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
            title="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Scanner Section */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-center space-y-4">
        {/* Verification Result Card Popup / Overlay */}
        {result && (
          <div
            className={`p-5 rounded-3xl border shadow-2xl transition-all animate-scale-in text-center space-y-3 ${
              result.status === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50"
                : result.status === "already_used"
                ? "bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/50"
                : "bg-red-950/90 border-red-500/40 text-red-100 shadow-red-950/50"
            }`}
          >
            <div className="flex justify-center">
              {result.status === "success" ? (
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 animate-bounce">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
              ) : result.status === "already_used" ? (
                <div className="h-16 w-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                  <AlertTriangle className="h-10 w-10" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-500/20 border border-red-400 flex items-center justify-center text-red-300">
                  <XCircle className="h-10 w-10" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black">
                {result.status === "success"
                  ? "مسموح بالدخول ✅"
                  : result.status === "already_used"
                  ? "مكررة! تم الدخول بها مسبقاً ⚠️"
                  : "تذكرة غير صالحة ❌"}
              </h2>
              <p className="text-xs sm:text-sm mt-1 opacity-90">{result.message}</p>
            </div>

            {/* Attendee Data Details */}
            {result.ticket && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-right space-y-1.5 font-sans">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span className="text-xs text-neutral-400">الاسم:</span>
                  <span className="text-sm font-bold text-white">{result.ticket.attendeeName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span className="text-xs text-neutral-400">الفئة:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {result.ticket.category || "General"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400">رقم التذكرة:</span>
                  <span className="font-mono text-xs font-bold text-neutral-200">{result.ticket.ticketNumber}</span>
                </div>
                {result.ticket.checkedInAt && (
                  <div className="flex justify-between items-center pt-1 text-[11px] text-amber-300">
                    <span>وقت الفحص السابق:</span>
                    <span className="font-mono">{new Date(result.ticket.checkedInAt).toLocaleTimeString("ar-EG")}</span>
                  </div>
                )}
              </div>
            )}

            <Button
              color={result.status === "success" ? "success" : "default"}
              onClick={() => setResult(null)}
              className="w-full h-11 rounded-2xl font-bold text-sm bg-white text-black hover:bg-neutral-200 mt-2"
            >
              جاهز لفحص التذكرة التالية
            </Button>
          </div>
        )}

        {/* Live Camera Scanner Box */}
        <div className="relative rounded-3xl overflow-hidden bg-[#12131a] border border-white/10 shadow-2xl">
          <div
            id="gate-qr-reader"
            className="w-full aspect-square max-h-[340px] flex items-center justify-center bg-black/60 relative"
          >
            {!isCameraActive && (
              <div className="text-center p-6 space-y-3">
                <div className="h-16 w-16 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <Camera className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">الكاميرا متوقفة</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    اضغط الزر بالأسفل لتشغيل ماسح الكاميرا الفوري
                  </p>
                </div>
                <Button
                  color="secondary"
                  onClick={startCamera}
                  className="rounded-2xl font-bold text-xs bg-purple-600 text-white shadow-lg shadow-purple-500/25 px-6"
                >
                  تشغيل الكاميرا
                </Button>
              </div>
            )}
          </div>

          {/* Camera controls toolbar */}
          {isCameraActive && (
            <div className="p-3 bg-black/80 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                الكاميرا تقرأ الآن... وجّه نحو الباركود
              </span>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onClick={stopCamera}
                className="rounded-xl text-xs font-semibold"
              >
                إيقاف الكاميرا
              </Button>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs text-center">
              {cameraError}
            </div>
          )}
        </div>

        {/* Manual Code Input Fallback */}
        <div className="p-4 rounded-3xl bg-[#12131a] border border-white/10 space-y-2">
          <label className="block text-xs font-semibold text-neutral-400 text-right">
            أو أدخل رقم التذكرة يدوياً (في حال تعذر قراءة الباركود)
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="مثال: NG-7K4P9X2M"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              dir="ltr"
              className="font-mono text-center text-sm font-bold flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  handleVerify(manualCode);
                }
              }}
            />
            <Button
              color="secondary"
              isLoading={loading}
              onClick={() => handleVerify(manualCode)}
              className="rounded-2xl font-bold text-xs bg-purple-600 text-white shrink-0 px-5"
            >
              تحقق
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-3 text-center text-[10px] text-neutral-500">
        نظام مسح بوابات ملتقى الجيل القادم • Next Gen 2026
      </footer>
    </div>
  );
}
