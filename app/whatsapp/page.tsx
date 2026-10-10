"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Phone,
  Sparkles,
  ExternalLink,
  Users,
  Search,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Tabs,
  Tab,
} from "@heroui/react";

interface WhatsAppStatusData {
  isConfigured: boolean;
  mode: "test" | "live";
  phoneNumberId?: string;
  hasAccessToken: boolean;
  businessAccountId?: string;
  testRecipientPhone?: string;
  webhookVerifyTokenConfigured: boolean;
  metaHealth?: {
    connected: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
    errorMessage?: string;
  };
}

interface WhatsAppLogItem {
  id: string;
  recipientPhone: string;
  recipientName: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  templateName?: string;
  wamId?: string;
  errorMessage?: string;
  mediaUrl?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export default function WhatsAppDeliveryPage() {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<WhatsAppStatusData | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [stats, setStats] = useState({ totalSent: 0, delivered: 0, read: 0, failed: 0 });
  const [attendees, setAttendees] = useState<any[]>([]);

  // Test send form state
  const [testPhone, setTestPhone] = useState("");
  const [testName, setTestName] = useState("المطور / المختبر");
  const [testTemplate, setTestTemplate] = useState("hello_world");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Single ticket send state
  const [selectedAttendeeId, setSelectedAttendeeId] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ success: boolean; message: string } | null>(null);

  // Filter logs state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      if (data.success) {
        setStatusData(data.status);
        setStats(data.stats || { totalSent: 0, delivered: 0, read: 0, failed: 0 });
        setLogs(data.recentLogs || []);
        if (data.status.testRecipientPhone && !testPhone) {
          setTestPhone(data.status.testRecipientPhone);
        }
      }

      // Fetch attendees for dropdown
      const attRes = await fetch("/api/attendees");
      const attData = await attRes.json();
      if (attData.success && Array.isArray(attData.attendees)) {
        setAttendees(attData.attendees);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;
    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          recipientName: testName,
          templateName: testTemplate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        fetchData();
      } else {
        setTestResult({ success: false, message: data.error || "فشل إرسال رسالة الاختبار" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "خطأ أثناء الاتصال بالخادم" });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendSingleTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendeeId) return;
    setSendingTicket(true);
    setTicketResult(null);

    const att = attendees.find((a) => a.id === selectedAttendeeId);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeId: selectedAttendeeId,
          phone: att?.phone,
          recipientName: att?.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketResult({ success: true, message: data.message });
        fetchData();
      } else {
        setTicketResult({ success: false, message: data.error || "فشل إرسال التذكرة" });
      }
    } catch (err: any) {
      setTicketResult({ success: false, message: err.message || "خطأ أثناء الاتصال بالخادم" });
    } finally {
      setSendingTicket(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipientPhone?.includes(searchQuery);
    const matchesTab = selectedStatusTab === "all" || log.status === selectedStatusTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <MessageSquare className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black text-neutral-900">
              إرسال التذاكر عبر واتساب (Meta WhatsApp Cloud API)
            </h1>
          </div>
          <p className="text-sm text-neutral-500">
            توليد وإرسال تذاكر PDF التفاعلية مع الباركود الرسمي مباشرة إلى حسابات الحضور على واتساب
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            color="default"
            onPress={fetchData}
            isLoading={loading}
            startContent={<RefreshCw className="h-4 w-4" />}
          >
            تحديث الحالة
          </Button>
        </div>
      </div>

      {/* Test Mode Guardrail Banner */}
      {statusData?.mode === "test" && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="font-bold flex items-center gap-2">
              وضع الاختبار نشط (Sandbox / Test Mode)
              <Chip size="sm" color="warning" variant="solid" className="text-[10px] font-bold">
                حماية الحساب مفعلة
              </Chip>
            </div>
            <p className="text-amber-800 leading-relaxed">
              وفقاً لسياسة Meta WhatsApp Cloud API، الحساب التجريبي مسموح له فقط بالإرسال إلى رقم الهاتف المسجل في لوحة مطوري Meta
              {statusData.testRecipientPhone && (
                <span className="font-mono font-bold mx-1" dir="ltr">
                  ({statusData.testRecipientPhone})
                </span>
              )}
              . تم تعطيل الإرسال الجماعي التلقائي لمنع حظر الحساب أو استهلاك الرصيد.
            </p>
          </div>
        </div>
      )}

      {/* Meta API Status & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Card */}
        <Card className="md:col-span-2 border border-neutral-200/80 shadow-xs bg-white">
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                حالة الاتصال بـ Meta Cloud API
              </span>
              {statusData?.metaHealth?.connected ? (
                <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle2 className="h-3.5 w-3.5" />}>
                  متصل ومفعل
                </Chip>
              ) : statusData?.isConfigured ? (
                <Chip size="sm" color="warning" variant="flat" startContent={<AlertTriangle className="h-3.5 w-3.5" />}>
                  تم الإعداد (جاري الفحص)
                </Chip>
              ) : (
                <Chip size="sm" color="danger" variant="flat" startContent={<AlertTriangle className="h-3.5 w-3.5" />}>
                  يتطلب إدخال مفاتيح الربط
                </Chip>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-neutral-100">
              <div>
                <span className="text-neutral-400 block mb-0.5">معرف رقم الهاتف:</span>
                <span className="font-mono font-semibold text-neutral-800" dir="ltr">
                  {statusData?.phoneNumberId || "غير مضبوط"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">رقم الهاتف التجريبي:</span>
                <span className="font-mono font-semibold text-emerald-700" dir="ltr">
                  {statusData?.metaHealth?.displayPhoneNumber || statusData?.testRecipientPhone || "قيد الانتظار"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">الاسم الموثق لدى Meta:</span>
                <span className="font-semibold text-neutral-800">
                  {statusData?.metaHealth?.verifiedName || "Next Gen Test Account"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Webhook Verify Token:</span>
                <span className="font-mono text-purple-700 font-semibold" dir="ltr">
                  nextgen_wa_verify_2026
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Sent & Delivered Stats */}
        <Card className="border border-neutral-200/80 shadow-xs bg-white">
          <CardBody className="p-5 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-500">إجمالي الرسائل المرسلة</span>
            <div className="text-3xl font-black text-neutral-900 mt-2 font-mono">
              {stats.totalSent}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>تم التسليم بنجاح: {stats.delivered}</span>
            </div>
          </CardBody>
        </Card>

        {/* Failed / Read Stats */}
        <Card className="border border-neutral-200/80 shadow-xs bg-white">
          <CardBody className="p-5 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-500">معدل القراءة والتفاعل</span>
            <div className="text-3xl font-black text-purple-700 mt-2 font-mono">
              {stats.read}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-red-500 mt-2">
              <span>فشل الإرسال: {stats.failed}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Sending Controls: Test Message & Single Ticket */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test WhatsApp Message Sender */}
        <Card className="border border-neutral-200 shadow-xs bg-white">
          <CardBody className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <div>
                <h2 className="font-bold text-neutral-900 text-sm">إرسال رسالة اختبار (Meta Sandbox Test)</h2>
                <p className="text-xs text-neutral-500">إرسال قالب رسمي للتأكد من وصول الرسائل للحساب</p>
              </div>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  رقم الهاتف المستلم (مع كود الدولة):
                </label>
                <Input
                  dir="ltr"
                  placeholder="+201000000000"
                  value={testPhone}
                  onValueChange={setTestPhone}
                  className="font-mono text-left"
                  size="sm"
                  startContent={<Phone className="h-4 w-4 text-neutral-400" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">اسم المستلم التجريبي:</label>
                  <Input
                    size="sm"
                    value={testName}
                    onValueChange={setTestName}
                    placeholder="الاسم"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">القالب (Template):</label>
                  <Input
                    size="sm"
                    dir="ltr"
                    value={testTemplate}
                    onValueChange={setTestTemplate}
                    placeholder="hello_world"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              <Button
                type="submit"
                color="secondary"
                isLoading={sendingTest}
                className="w-full font-bold bg-[#7a12eb] text-white"
                startContent={<Send className="h-4 w-4" />}
              >
                إرسال رسالة الاختبار الآن
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Single Attendee Ticket Dispatcher */}
        <Card className="border border-neutral-200 shadow-xs bg-white">
          <CardBody className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <FileText className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="font-bold text-neutral-900 text-sm">إرسال تذكرة PDF إلى مشترك عبر واتساب</h2>
                <p className="text-xs text-neutral-500">إرسال التذكرة الإلكترونية كملف PDF مرفق مع باركود الدخول</p>
              </div>
            </div>

            <form onSubmit={handleSendSingleTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  اختر المشترك من قاعدة البيانات ({attendees.length} مشترك):
                </label>
                <select
                  value={selectedAttendeeId}
                  onChange={(e) => setSelectedAttendeeId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-neutral-300 p-2.5 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- اضغط لاختيار مشترك --</option>
                  {attendees.slice(0, 100).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phone || "بدون هاتف"}) - {a.category || "General"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAttendeeId && (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                  {(() => {
                    const att = attendees.find((a) => a.id === selectedAttendeeId);
                    return (
                      <>
                        <div className="font-bold text-neutral-900">{att?.name}</div>
                        <div className="text-neutral-600">الهاتف: {att?.phone || "غير مسجل"}</div>
                        <div className="text-purple-700">التذكرة: {att?.hasTicket ? "مُصدرة" : "غير مُصدرة بعد"}</div>
                      </>
                    );
                  })()}
                </div>
              )}

              {ticketResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    ticketResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {ticketResult.message}
                </div>
              )}

              <Button
                type="submit"
                color="success"
                isLoading={sendingTicket}
                disabled={!selectedAttendeeId}
                className="w-full font-bold bg-emerald-600 text-white"
                startContent={<Send className="h-4 w-4" />}
              >
                إرسال تذكرة PDF إلى واتساب المشترك
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* WhatsApp Delivery Logs Table */}
      <Card className="border border-neutral-200 shadow-xs bg-white">
        <CardBody className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">سجل تسليم رسائل واتساب (Delivery Logs)</h2>
              <p className="text-xs text-neutral-500">متابعة دقيقة لحالة كل رسالة (أُرسلت، استُلمت، قُرئت، فشلت)</p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                size="sm"
                placeholder="بحث برقم الهاتف أو الاسم..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="w-56"
                startContent={<Search className="h-3.5 w-3.5 text-neutral-400" />}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 font-bold">
                  <th className="py-3 px-4">المستلم</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">نوع الرسالة / القالب</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">وقت الإرسال</th>
                  <th className="py-3 px-4">ملاحظات / أخطاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      لا توجد سجلات رسائل واتساب مطابقة حالياً
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">{log.recipientName}</td>
                      <td className="py-3 px-4 font-mono text-neutral-700" dir="ltr">
                        {log.recipientPhone}
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-700">
                        {log.templateName || (log.mediaUrl ? "PDF Ticket" : "Custom")}
                      </td>
                      <td className="py-3 px-4">
                        {log.status === "delivered" || log.status === "read" ? (
                          <Chip size="sm" color="success" variant="flat" className="text-[10px] font-bold">
                            {log.status === "read" ? "تمت القراءة" : "تم التسليم"}
                          </Chip>
                        ) : log.status === "sent" ? (
                          <Chip size="sm" color="primary" variant="flat" className="text-[10px] font-bold">
                            أُرسلت
                          </Chip>
                        ) : (
                          <Chip size="sm" color="danger" variant="flat" className="text-[10px] font-bold">
                            فشلت
                          </Chip>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {log.sentAt ? new Date(log.sentAt).toLocaleTimeString("ar-EG") : "-"}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 max-w-xs truncate text-[11px]">
                        {log.errorMessage || (log.wamId ? `WAMID: ${log.wamId.slice(-8)}` : "-")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
