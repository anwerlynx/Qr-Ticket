"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QrCode, Phone, Lock, AlertCircle, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@heroui/react";

export default function ScannerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone || !cleanPin) {
      setErrorMsg("يرجى إدخال رقم الهاتف ورمز PIN المكون من 4 أرقام");
      return;
    }

    if (cleanPin.length !== 4) {
      setErrorMsg("رمز PIN يجب أن يتكون من 4 أرقام بالضبط");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/scanner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, pin: cleanPin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/scanner");
      } else {
        setErrorMsg(data.error || "فشل تسجيل الدخول، تأكد من صحة البيانات");
      }
    } catch {
      setErrorMsg("تعذر الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-400 shadow-lg shadow-purple-900/20 mb-1">
            <QrCode className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            بوابة فحص التذاكر
          </h1>
          <p className="text-xs text-neutral-400 font-medium">
            ملتقى الجيل القادم 2026 • دخول مسؤولي البوابات
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#11131c] border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-7 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 text-right">
                رقم الهاتف المسجل
              </label>
              <div className="relative flex items-center">
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  autoFocus
                  className="w-full h-12 px-4 pl-10 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white text-base font-mono font-semibold placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-center"
                />
                <Phone className="absolute left-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 text-right">
                رمز PIN السريع (4 أرقام)
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  dir="ltr"
                  className="w-full h-12 px-4 pl-10 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white text-xl font-mono font-bold tracking-[0.4em] placeholder:text-neutral-500 placeholder:tracking-normal focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-center"
                />
                <Lock className="absolute left-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={loading}
              className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer mt-1"
            >
              تسجيل الدخول وفتح الكاميرا
            </Button>
          </form>

          {/* Registration link ONLY - NO link to admin */}
          <div className="pt-3 border-t border-white/10 text-center">
            <p className="text-xs text-neutral-400">
              ليس لديك حساب فحص بعد؟{" "}
              <Link
                href="/scanner/register"
                className="font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4"
              >
                إنشاء حساب منظم جديد
              </Link>
            </p>
          </div>
        </div>

        {/* Secure Gate Footer */}
        <div className="text-center text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>نظام مشفر مخصص لبوابات ملتقى الجيل القادم</span>
        </div>
      </div>
    </div>
  );
}
