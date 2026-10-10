"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Scan,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  History,
  ShieldCheck,
  User,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@heroui/react";
import jsQR from "jsqr";
import { CheckInResult } from "@/types/ticket";

// Web Audio API Synthesized Audio Feedback
function playSound(type: "success" | "error") {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "success") {
      // Pleasant two-tone chime (D5 -> A5)
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

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
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

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([300]);
      }
    }
  } catch {}
}

interface ScannedRecord {
  id: string;
  name: string;
  ticketNumber: string;
  category: string;
  status: "success" | "already_used" | "invalid";
  time: string;
}

export default function GateScannerPage() {
  const router = useRouter();

  // Auth / Staff state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [staff, setStaff] = useState<{
    id: string;
    name: string;
    gate: string;
    totalScans: number;
  } | null>(null);

  // Scan state
  const [manualCode, setManualCode] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [sessionScans, setSessionScans] = useState(0);

  // Scanned Attendees Feed
  const [recentScans, setRecentScans] = useState<ScannedRecord[]>([]);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({
    code: "",
    time: 0,
  });

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

      const nowFormatted = new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      if (data.status === "success") {
        if (soundEnabled) playSound("success");
        setSessionScans((prev) => prev + 1);

        if (data.ticket) {
          setRecentScans((prev) => [
            {
              id: `${data.ticket?.id}-${Date.now()}`,
              name: data.ticket?.attendeeName || "مشارك",
              ticketNumber: data.ticket?.ticketNumber || cleanToken,
              category: data.ticket?.category || "General",
              status: "success",
              time: nowFormatted,
            },
            ...prev,
          ]);
        }
      } else if (data.status === "already_used") {
        if (soundEnabled) playSound("error");
        if (data.ticket) {
          setRecentScans((prev) => [
            {
              id: `${data.ticket?.id}-${Date.now()}`,
              name: data.ticket?.attendeeName || "مشارك",
              ticketNumber: data.ticket?.ticketNumber || cleanToken,
              category: data.ticket?.category || "General",
              status: "already_used",
              time: nowFormatted,
            },
            ...prev,
          ]);
        }
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

  // Frame scanner loop (Native BarcodeDetector with jsQR fallback)
  const scanLoop = async () => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        let detectedText: string | null = null;

        // 1. Try Hardware-Accelerated BarcodeDetector (Chrome/Edge/Safari 17+)
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ["qr_code"],
            });
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedText = barcodes[0].rawValue;
            }
          } catch {}
        }

        // 2. High-performance jsQR Fallback (Works on every browser without DOM manipulation)
        if (!detectedText) {
          try {
            if (!canvasRef.current) {
              canvasRef.current = document.createElement("canvas");
            }
            const canvas = canvasRef.current;
            // Downscale to 640 max width for 60fps performance if camera is 4K/1080p
            const scale = Math.min(1, 640 / width);
            const sw = Math.floor(width * scale);
            const sh = Math.floor(height * scale);

            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, sw, sh);
              const imgData = ctx.getImageData(0, 0, sw, sh);
              const qr = jsQR(imgData.data, sw, sh);
              if (qr && qr.data) {
                detectedText = qr.data;
              }
            }
          } catch {}
        }

        // 3. Process detection with debounce
        if (detectedText) {
          const now = Date.now();
          if (
            lastScannedRef.current.code !== detectedText ||
            now - lastScannedRef.current.time > 3000
          ) {
            lastScannedRef.current = { code: detectedText, time: now };
            handleVerify(detectedText);
          }
        }
      }
    }

    if (isScanningRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }
  };

  // Start Crash-proof Native Camera
  const startCamera = async () => {
    setCameraError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "المتصفح لا يدعم الوصول المباشر للكاميرا. يرجى التأكد من فتح الموقع برابط آمن HTTPS."
      );
      return;
    }

    try {
      // Request rear/back camera with environment facing mode
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      isScanningRef.current = true;
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsCameraActive(false);
      isScanningRef.current = false;

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "تم رفض صلاحية الكاميرا. يرجى منح الإذن للمتصفح بالوصول للكاميرا من إعدادات الهاتف."
        );
      } else if (err.name === "NotReadableError") {
        setCameraError(
          "الكاميرا قيد الاستخدام بواسطة تطبيق آخر في الهاتف. أغلق التطبيقات الأخرى وحاول ثانية."
        );
      } else {
        setCameraError(
          "تعذر تشغيل الكاميرا. يرجى إعادة تحميل الصفحة أو التأكد من إعدادات المتصفح."
        );
      }
    }
  };

  // Stop camera cleanly
  const stopCamera = () => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleLogout = async () => {
    stopCamera();
    await fetch("/api/scanner/session", { method: "POST" });
    router.replace("/scanner/login");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-between selection:bg-purple-500 font-sans pb-10">
      {/* Top Gate Bar - 100% Isolated, Zero Admin Links */}
      <header className="sticky top-0 z-30 px-4 py-3.5 bg-[#0f111a]/95 border-b border-white/10 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Scan className="h-5 w-5" />
          </div>
          <div className="text-right">
            <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <span>{staff?.gate || "بوابة الدخول"}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-[11px] text-neutral-400">
              المنظم: <span className="text-neutral-200 font-bold">{staff?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-[#171a26] hover:bg-[#202436] text-neutral-300 text-xs flex items-center gap-1.5 border border-[#2b3046] transition-colors cursor-pointer"
            title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-neutral-500" />
            )}
          </button>

          {/* Session Counter Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-purple-600/15 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
            {sessionScans} تم فحصهم
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 space-y-4">
        {/* Verification Result Modal / Card */}
        {result && (
          <div
            className={`p-5 rounded-3xl border shadow-2xl transition-all animate-scale-in text-center space-y-3.5 ${
              result.status === "success"
                ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/70"
                : result.status === "already_used"
                ? "bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/70"
                : "bg-red-950/95 border-red-500/50 text-red-100 shadow-red-950/70"
            }`}
          >
            <div className="flex justify-center">
              {result.status === "success" ? (
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-900/50">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" />
                </div>
              ) : result.status === "already_used" ? (
                <div className="h-16 w-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-900/50">
                  <AlertTriangle className="h-10 w-10" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-red-300 shadow-lg shadow-red-900/50">
                  <XCircle className="h-10 w-10" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {result.status === "success"
                  ? "مسموح بالدخول ✅"
                  : result.status === "already_used"
                  ? "تذكرة مكررة! تم الدخول بها مسبقاً ⚠️"
                  : "تذكرة غير صالحة ❌"}
              </h2>
              <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
                {result.message}
              </p>
            </div>

            {/* Attendee Details Card */}
            {result.ticket && (
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-right space-y-2">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs text-neutral-400">الاسم:</span>
                  <span className="text-base font-black text-white">
                    {result.ticket.attendeeName}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs text-neutral-400">الفئة:</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-500/40">
                    {result.ticket.category || "General"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400">رقم التذكرة:</span>
                  <span className="font-mono text-sm font-bold text-neutral-100">
                    {result.ticket.ticketNumber}
                  </span>
                </div>
                {result.ticket.checkedInAt && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-white/10 text-xs text-amber-300 font-semibold">
                    <span>وقت الفحص الأول:</span>
                    <span className="font-mono">
                      {new Date(result.ticket.checkedInAt).toLocaleTimeString("ar-EG")}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => setResult(null)}
              className="w-full h-12 rounded-2xl font-black text-sm bg-white text-black hover:bg-neutral-200 mt-2 cursor-pointer shadow-lg"
            >
              جاهز لفحص التذكرة التالية
            </Button>
          </div>
        )}

        {/* 100% Native Crash-Proof Camera Scanner Viewport */}
        <div className="relative rounded-3xl overflow-hidden bg-[#11131c] border border-white/10 shadow-2xl">
          <div className="w-full aspect-square max-h-[350px] flex items-center justify-center bg-black relative overflow-hidden">
            {/* The Native Video Element (zero third-party DOM mutation) */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${
                isCameraActive ? "block" : "hidden"
              }`}
            />

            {/* Neon Scanner Overlay Frame when active */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-60 rounded-2xl border-2 border-purple-500/60 relative shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                  {/* Neon Corners */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
                  {/* Laser Beam Animation */}
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_rgba(192,132,252,0.9)] animate-pulse mt-28" />
                </div>
              </div>
            )}

            {/* Stopped Placeholder */}
            {!isCameraActive && (
              <div className="text-center p-6 space-y-3.5">
                <div className="h-16 w-16 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/30">
                  <Camera className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">الكاميرا متوقفة</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    اضغط الزر لتشغيل الكاميرا ومسح رموز QR فورياً
                  </p>
                </div>
                <Button
                  onClick={startCamera}
                  className="rounded-2xl font-black text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-purple-600/30 px-7 h-11 cursor-pointer"
                >
                  تشغيل الكاميرا الآن
                </Button>
              </div>
            )}
          </div>

          {/* Camera controls toolbar */}
          {isCameraActive && (
            <div className="p-3 bg-[#0c0d14] border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-emerald-400 flex items-center gap-2 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                الكاميرا تقرأ الآن... وجّه نحو التذكرة
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold text-xs border border-red-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CameraOff className="h-3.5 w-3.5" />
                <span>إيقاف</span>
              </button>
            </div>
          )}

          {cameraError && (
            <div className="p-3.5 bg-red-500/15 border-t border-red-500/30 text-red-300 text-xs text-center font-medium">
              {cameraError}
            </div>
          )}
        </div>

        {/* Manual Code Input Fallback */}
        <div className="p-5 rounded-3xl bg-[#11131c] border border-white/10 shadow-xl space-y-3">
          <label className="block text-xs font-bold text-neutral-300 text-right flex items-center justify-between">
            <span>إدخال كود التذكرة يدوياً</span>
            <span className="text-[10px] text-neutral-400 font-normal">في حال تعذر قراءة الباركود</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="مثال: NG-7P335A6T أو 7P335A6T"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              dir="ltr"
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  handleVerify(manualCode);
                }
              }}
              className="flex-1 h-12 px-4 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white font-mono text-center text-sm font-bold placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all uppercase"
            />
            <Button
              isLoading={loading}
              onClick={() => handleVerify(manualCode)}
              className="h-12 px-5 rounded-2xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 shrink-0 cursor-pointer"
            >
              تحقق
            </Button>
          </div>
        </div>

        {/* Scanned Attendees Feed - "مين اللي هو سجله" */}
        <div className="p-5 rounded-3xl bg-[#11131c] border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" />
              <span>الأشخاص الذين قمت بفحصهم ({recentScans.length})</span>
            </h3>
            {recentScans.length > 0 && (
              <span className="text-[10px] text-neutral-400 font-mono">جلسة اليوم</span>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div className="py-6 text-center space-y-1.5 text-neutral-400">
              <User className="h-6 w-6 mx-auto text-neutral-500" />
              <p className="text-xs font-medium">لم تقم بفحص أي تذكرة بعد</p>
              <p className="text-[11px] text-neutral-500">
                سيظهر هنا سجل بأسماء الحضور وتذاكرهم فور قيامك بمسحها
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {recentScans.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    rec.status === "success"
                      ? "bg-emerald-950/30 border-emerald-500/30 text-white"
                      : rec.status === "already_used"
                      ? "bg-amber-950/30 border-amber-500/30 text-white"
                      : "bg-red-950/30 border-red-500/30 text-white"
                  }`}
                >
                  <div className="text-right">
                    <div className="font-black text-sm text-white flex items-center gap-1.5">
                      <span>{rec.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/10 text-purple-200">
                        {rec.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      رقم: <span className="text-neutral-200 font-semibold">{rec.ticketNumber}</span>
                    </div>
                  </div>

                  <div className="text-left space-y-1">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.status === "success"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : rec.status === "already_used"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                          : "bg-red-500/20 text-red-300 border border-red-400/30"
                      }`}
                    >
                      {rec.status === "success"
                        ? "دخول مقبول ✓"
                        : rec.status === "already_used"
                        ? "مكرر ⚠️"
                        : "مرفوض ✕"}
                    </span>
                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{rec.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 text-center text-[11px] text-neutral-500">
        Next Gen Forum 2026 • نظام البوابات المشفرة
      </footer>
    </div>
  );
}
