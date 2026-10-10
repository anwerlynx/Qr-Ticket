"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { QrCode, Phone, Lock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardBody, Button, Input } from "@heroui/react";

export default function ScannerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!phone.trim() || !pin.trim()) {
      setErrorMsg("يرجى إدخال رقم الهاتف ورمز PIN");
      return;
    }

    if (pin.trim().length !== 4) {
      setErrorMsg("رمز PIN يجب أن يكون 4 أرقام");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/scanner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/scanner");
      } else {
        setErrorMsg(data.error || "فشل تسجيل الدخول");
      }
    } catch {
      setErrorMsg("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 mb-2">
            <QrCode className="h-8 w-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            بوابة ماسحي التذاكر | Gate Scanner
          </h1>
          <p className="text-xs text-neutral-400">
            ملتقى الجيل القادم • دخول المنظمين المعتمدين فقط
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-[#12131a] border border-white/10 shadow-2xl rounded-3xl p-2 sm:p-4">
          <CardBody className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
                  رقم الهاتف المسجل
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    className="text-center text-base font-mono"
                    startContent={<Phone className="h-4 w-4 text-neutral-500" />}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
                  رمز PIN (4 أرقام)
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    dir="ltr"
                    className="text-center text-xl tracking-widest font-mono font-bold"
                    startContent={<Lock className="h-4 w-4 text-neutral-500" />}
                  />
                </div>
              </div>

              <Button
                type="submit"
                color="secondary"
                isLoading={loading}
                className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 mt-2"
              >
                تسجيل الدخول ومسح التذاكر
              </Button>
            </form>

            <div className="pt-2 border-t border-white/5 text-center space-y-3">
              <p className="text-xs text-neutral-400">
                منظم جديد في الفعالية؟{" "}
                <Link
                  href="/scanner/register"
                  className="font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4"
                >
                  سجّل طلبك هنا
                </Link>
              </p>
              <Link
                href="/"
                className="inline-block text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                العودة للوحة الإدارة العامة
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
