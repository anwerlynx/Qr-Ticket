"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Phone, Lock, User, DoorOpen, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@heroui/react";

const GATES = [
  "البوابة 1 - المدخل الرئيسي",
  "البوابة 2 - مدخل كبار الزوار (VIP)",
  "البوابة 3 - مدخل المتحدثين والإعلام",
  "البوابة 4 - المدخل الجانبي",
];

export default function ScannerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [gate, setGate] = useState(GATES[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanName || !cleanPhone || !cleanPin) {
      setErrorMsg("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (cleanPin.length !== 4) {
      setErrorMsg("رمز PIN يجب أن يتكون من 4 أرقام بالضبط");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/scanner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          pin: cleanPin,
          gate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        // Automatically redirect to scanner after short pause or user click
        setTimeout(() => {
          router.push("/scanner");
        }, 1500);
      } else {
        setErrorMsg(data.error || "فشل تسجيل المنظم، حاول مرة أخرى");
      }
    } catch {
      setErrorMsg("تعذر الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-[430px] space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-900/20 mb-1">
            <UserPlus className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            إنشاء حساب مسؤول بوابة
          </h1>
          <p className="text-xs text-neutral-400 font-medium">
            ملتقى الجيل القادم 2026 • تفعيل حساب فحص التذاكر
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#11131c] border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-7 space-y-5">
          {success ? (
            <div className="text-center py-6 space-y-4 animate-scale-in">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/30 animate-bounce">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-white">تم إنشاء حسابك وتفعيله بنجاح!</h2>
                <p className="text-xs text-neutral-300 leading-relaxed px-2">
                  تم اعتمادك لمنظومة فحص البوابات. جاري تحويلك الآن لشاشة الفحص المباشرة...
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => router.push("/scanner")}
                  className="w-full h-12 rounded-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  بدء مسح التذاكر الآن
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 text-right">
                  الاسم بالكامل
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="مثال: أحمد محمد علي"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full h-12 px-4 pr-10 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white text-sm font-semibold placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-right"
                  />
                  <User className="absolute right-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 text-right">
                  رقم الهاتف / الواتساب
                </label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    required
                    className="w-full h-12 px-4 pl-10 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white text-base font-mono font-semibold placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-center"
                  />
                  <Phone className="absolute left-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              {/* PIN */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-indigo-400 font-semibold">احفظه لتسجيل الدخول السريع</span>
                  <label className="text-xs font-bold text-neutral-300 text-right">
                    رمز PIN (4 أرقام)
                  </label>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    dir="ltr"
                    required
                    className="w-full h-12 px-4 pl-10 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white text-xl font-mono font-bold tracking-[0.4em] placeholder:text-neutral-500 placeholder:tracking-normal focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-center"
                  />
                  <Lock className="absolute left-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              {/* Gate Select */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 text-right">
                  البوابة المكلّف بها
                </label>
                <div className="relative flex items-center">
                  <select
                    value={gate}
                    onChange={(e) => setGate(e.target.value)}
                    className="w-full h-12 px-4 pr-10 rounded-2xl bg-[#171a26] border border-[#2b3046] text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-right appearance-none cursor-pointer"
                  >
                    {GATES.map((g) => (
                      <option key={g} value={g} className="bg-[#171a26] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                  <DoorOpen className="absolute right-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                isLoading={loading}
                className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer mt-1"
              >
                تأكيد الحساب وبدء المسح
              </Button>
            </form>
          )}

          {/* Login Link Only - NO links to admin */}
          {!success && (
            <div className="pt-3 border-t border-white/10 text-center">
              <p className="text-xs text-neutral-400">
                لديك حساب بالفعل؟{" "}
                <Link
                  href="/scanner/login"
                  className="font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                >
                  تسجيل الدخول من هنا
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Next Gen Forum 2026 • بوابة المنظمين المعتمدين</span>
        </div>
      </div>
    </div>
  );
}
