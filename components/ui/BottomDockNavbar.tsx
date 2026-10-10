"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Ticket,
  QrCode,
  Upload,
  Mail,
  SlidersHorizontal,
  Plus,
  UserPlus,
  Download,
  Sparkles,
  X,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { Dock, type DockItemData } from "./dock";

export function BottomDockNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Quick Actions Sheet State
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTicketOpen, setQuickTicketOpen] = useState(false);

  // Quick Add Attendee Form State
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [attendeeCategory, setAttendeeCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      alert("يرجى ملء الاسم والبريد الإلكتروني");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendees/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: attendeeName.trim(),
          email: attendeeEmail.trim(),
          phone: attendeePhone.trim() || undefined,
          category: attendeeCategory,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`تمت إضافة الحاضر بنجاح: ${attendeeName}`);
        setAttendeeName("");
        setAttendeeEmail("");
        setAttendeePhone("");
        setQuickAddOpen(false);
        setQuickActionsOpen(false);
        router.refresh();
      } else {
        alert(data.error || "فشل إضافة الحاضر");
      }
    } catch {
      alert("حدث خطأ أثناء الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickIssueTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim()) {
      alert("يرجى كتابة الاسم");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim() || undefined,
          category: attendeeCategory,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ticket) {
        showToast(`تم إصدار التذكرة برقم: ${data.ticket.ticketNumber}`);
        setAttendeeName("");
        setAttendeeEmail("");
        setQuickTicketOpen(false);
        setQuickActionsOpen(false);
        router.push(`/tickets/${data.ticket.id}`);
      } else {
        alert(data.error || "فشل إصدار التذكرة");
      }
    } catch {
      alert("حدث خطأ أثناء إصدار التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  const dockItems: DockItemData[] = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "الرئيسية",
      active: pathname === "/" && !quickActionsOpen,
      onClick: () => {
        setQuickActionsOpen(false);
        if (pathname === "/") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          router.push("/");
        }
      },
    },
    {
      icon: <FileSpreadsheet className="h-5 w-5" />,
      label: "جدول الحضور",
      active: pathname.startsWith("/attendees") && !quickActionsOpen,
      onClick: () => {
        setQuickActionsOpen(false);
        router.push("/attendees");
      },
    },
    {
      icon: <Ticket className="h-5 w-5" />,
      label: "التذاكر",
      active: pathname.startsWith("/tickets") && !quickActionsOpen,
      onClick: () => {
        setQuickActionsOpen(false);
        router.push("/tickets");
      },
    },
    {
      icon: <QrCode className="h-5 w-5 animate-pulse" />,
      label: "الماسح المباشر",
      active: pathname === "/check-in",
      isPrimary: true,
      onClick: () => {
        setQuickActionsOpen(false);
        router.push("/check-in");
      },
    },
    {
      icon: (
        <Plus
          className={`h-5 w-5 transition-transform duration-200 ${
            quickActionsOpen ? "rotate-45 text-red-500" : "text-[#7a12eb] dark:text-purple-400"
          }`}
        />
      ),
      label: "إجراء سريع",
      active: quickActionsOpen,
      className: "ring-2 ring-purple-500/20",
      onClick: () => setQuickActionsOpen(!quickActionsOpen),
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: "حملات البريد",
      active: pathname.startsWith("/campaigns") && !quickActionsOpen,
      onClick: () => {
        setQuickActionsOpen(false);
        router.push("/campaigns");
      },
    },
    {
      icon: <SlidersHorizontal className="h-5 w-5" />,
      label: "الإعدادات والقالب",
      active: pathname.startsWith("/settings") && !quickActionsOpen,
      onClick: () => {
        setQuickActionsOpen(false);
        router.push("/settings/template");
      },
    },
  ];

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-neutral-900/95 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xl border border-white/10 backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Magnification Dock */}
      <aside
        aria-label="Bottom Navigation Dock"
        className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[98vw] sm:max-w-fit no-print pointer-events-auto"
      >
        <Dock items={dockItems} />
      </aside>

      {/* Quick Actions Sheet / Modal */}
      <Modal
        isOpen={quickActionsOpen}
        onOpenChange={setQuickActionsOpen}
        placement="bottom"
        backdrop="blur"
        classNames={{
          base: "max-w-md mx-auto rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-[#121214]/95 backdrop-blur-2xl border border-neutral-200/80 dark:border-white/10 shadow-2xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      إجراءات سريعة
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      تنفيذ فوري لإدارة التذاكر والحضور
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="py-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickActionsOpen(false);
                    setQuickTicketOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 hover:bg-purple-50/80 dark:bg-white/5 dark:hover:bg-purple-950/20 border border-neutral-100 dark:border-white/5 transition-all text-right group"
                >
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      إصدار تذكرة فورية
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      إنشاء تذكرة NextGen جديدة مع باركود فوري
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickActionsOpen(false);
                    setQuickAddOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 hover:bg-emerald-50/80 dark:bg-white/5 dark:hover:bg-emerald-950/20 border border-neutral-100 dark:border-white/5 transition-all text-right group"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      إضافة حاضر جديد
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      تسجيل حاضر في قائمة المؤتمر وسحابة سوبابيز
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickActionsOpen(false);
                    window.open("/api/export/attendees", "_blank");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 hover:bg-blue-50/80 dark:bg-white/5 dark:hover:bg-blue-950/20 border border-neutral-100 dark:border-white/5 transition-all text-right group"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 group-hover:bg-blue-500 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      تصدير كشف الحضور (CSV)
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      تحميل ملف الإكسل الكامل بالحالة والبيانات
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickActionsOpen(false);
                    router.push("/import");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-100 dark:border-white/5 transition-all text-right group"
                >
                  <div className="h-10 w-10 rounded-xl bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      استيراد ملف إكسل مسجلين
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      رفع ملف المسجلين الجديد وربطه بالسحابة
                    </p>
                  </div>
                </button>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Quick Add Attendee Modal */}
      <Modal
        isOpen={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleQuickAddAttendee}>
              <ModalHeader className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-500" />
                <span>إضافة حاضر جديد للقائمة</span>
              </ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="الاسم الكامل"
                  placeholder="مثال: أحمد محمد علي"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  isRequired
                />
                <Input
                  label="البريد الإلكتروني"
                  placeholder="ahmed@example.com"
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  isRequired
                />
                <Input
                  label="رقم الهاتف أو الواتساب"
                  placeholder="01012345678"
                  value={attendeePhone}
                  onChange={(e) => setAttendeePhone(e.target.value)}
                />
                <Select
                  label="الفئة"
                  selectedKeys={[attendeeCategory]}
                  onChange={(e) => setAttendeeCategory(e.target.value)}
                >
                  <SelectItem key="General">General</SelectItem>
                  <SelectItem key="VIP">VIP</SelectItem>
                  <SelectItem key="Speaker">Speaker</SelectItem>
                  <SelectItem key="Organizer">Organizer</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  إلغاء
                </Button>
                <Button
                  color="success"
                  type="submit"
                  isLoading={submitting}
                  className="font-bold text-white bg-emerald-600"
                >
                  حفظ في السحابة
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Quick Issue Ticket Modal */}
      <Modal
        isOpen={quickTicketOpen}
        onOpenChange={setQuickTicketOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleQuickIssueTicket}>
              <ModalHeader className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-purple-600" />
                <span>إصدار تذكرة فورية</span>
              </ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="اسم صاحب التذكرة"
                  placeholder="مثال: سارة محمود"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  isRequired
                />
                <Input
                  label="البريد الإلكتروني (اختياري)"
                  placeholder="sara@example.com"
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                />
                <Select
                  label="نوع التذكرة"
                  selectedKeys={[attendeeCategory]}
                  onChange={(e) => setAttendeeCategory(e.target.value)}
                >
                  <SelectItem key="General">General</SelectItem>
                  <SelectItem key="VIP">VIP</SelectItem>
                  <SelectItem key="Speaker">Speaker</SelectItem>
                  <SelectItem key="Organizer">Organizer</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  إلغاء
                </Button>
                <Button
                  color="secondary"
                  type="submit"
                  isLoading={submitting}
                  className="font-bold text-white bg-purple-600"
                >
                  إصدار وعرض التذكرة
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default BottomDockNavbar;
