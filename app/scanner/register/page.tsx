"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Phone, Lock, User, DoorOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardBody, Button, Input, Select, SelectItem } from "@heroui/react";

export default function ScannerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [gate, setGate] = useState("البوابة 1 - المدخل الرئيسي");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !phone.trim() || !pin.trim()) {
      setErrorMsg("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (pin.trim().length !== 4) {
      setErrorMsg("رمز PIN يجب أن يتكون من 4 أرقام");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/scanner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          pin: pin.trim(),
          gate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setName("");
        setPhone("");
        setPin("");
      } else {
        setErrorMsg(data.error || "فشل تسجيل المنظم");
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
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <UserPlus className="h-8 w-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            تسجيل منظم بوابة جديد
          </h1>
          <p className="text-xs text-neutral-400">
            ملتقى الجيل القادم • نظام مسح التذاكر بالبوابات
          </p>
        </div>

        {/* Card */}
        <Card className="bg-[#12131a] border border-white/10 shadow-2xl rounded-3xl p-2 sm:p-4">
          <CardBody className="space-y-4">
            {successMsg ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">تم استلام طلبك بنجاح!</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed px-4">
                    حسابك الآن قيد المراجعة. سيتم تفعيله والسماح لك بالمسح فور موافقة مسؤول الفعالية من لوحة الإدارة.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/scanner/login">
                    <Button color="secondary" className="w-full rounded-2xl font-bold bg-purple-600 text-white">
                      الذهاب لصفحة تسجيل الدخول
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {errorMsg && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 text-right">
                    الاسم الكامل للمنظم
                  </label>
                  <Input
                    placeholder="مثال: أحمد محمود إبراهيم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    startContent={<User className="h-4 w-4 text-neutral-500" />}
                    isRequired
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 text-right">
                    رقم الهاتف / الواتساب
                  </label>
                  <Input
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    className="font-mono"
                    startContent={<Phone className="h-4 w-4 text-neutral-500" />}
                    isRequired
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 text-right">
                    رمز PIN الخاص بك (4 أرقام فقط للدخول السريع)
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    dir="ltr"
                    className="font-mono text-center text-lg font-bold"
                    startContent={<Lock className="h-4 w-4 text-neutral-500" />}
                    isRequired
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    احفظ هذا الرمز جيداً، ستستخدمه دائماً لتسجيل الدخول السريع عند البوابة
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 text-right">
                    البوابة المكلّف بها
                  </label>
                  <Select
                    selectedKeys={[gate]}
                    onChange={(e) => setGate(e.target.value)}
                    startContent={<DoorOpen className="h-4 w-4 text-neutral-500" />}
                  >
                    <SelectItem key="البوابة 1 - المدخل الرئيسي">البوابة 1 - المدخل الرئيسي</SelectItem>
                    <SelectItem key="البوابة 2 - مدخل كبار الزوار (VIP)">البوابة 2 - مدخل كبار الزوار (VIP)</SelectItem>
                    <SelectItem key="البوابة 3 - مدخل المتحدثين والإعلام">البوابة 3 - مدخل المتحدثين والإعلام</SelectItem>
                    <SelectItem key="البوابة 4 - المدخل الجانبي">البوابة 4 - المدخل الجانبي</SelectItem>
                  </Select>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-neutral-400">
                  ℹ️ بعد التسجيل، ستظهر بياناتك في لوحة تحكم الأدمن لمنحك صلاحية المسح فوراً.
                </div>

                <Button
                  type="submit"
                  color="secondary"
                  isLoading={loading}
                  className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 mt-2"
                >
                  إرسال طلب التسجيل
                </Button>
              </form>
            )}

            <div className="pt-2 border-t border-white/5 text-center">
              <p className="text-xs text-neutral-400">
                لديك حساب منظم مفعل؟{" "}
                <Link
                  href="/scanner/login"
                  className="font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4"
                >
                  تسجيل الدخول هنا
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
