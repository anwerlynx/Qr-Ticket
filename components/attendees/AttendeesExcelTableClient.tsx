"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Ticket,
  Upload,
  Download,
  Layers,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building,
  MapPin,
  Briefcase,
  ArrowRight,
  UserPlus,
  X,
  Send,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Check,
  ShieldAlert,
  Users,
  Copy,
} from "lucide-react";
import { AttendeeRecord, ApprovalStatus } from "@/types/ticket";
import * as XLSX from "xlsx";

export interface AttendeesExcelTableClientProps {
  initialAttendees?: AttendeeRecord[];
  initialCounts?: {
    total: number;
    checkedIn?: number;
    notCheckedIn?: number;
    hasTicket: number;
    noTicket: number;
    accepted?: number;
    pending?: number;
    rejected?: number;
  };
}

export default function AttendeesExcelTableClient({
  initialAttendees,
  initialCounts,
}: AttendeesExcelTableClientProps) {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>(initialAttendees || []);
  const [loading, setLoading] = useState(!initialAttendees || initialAttendees.length === 0);
  const [search, setSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [ticketFilter, setTicketFilter] = useState<string>("all");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const isCheckedIn = a.status === "checked_in";
      if (attendanceFilter === "checked_in" && !isCheckedIn) return false;
      if (attendanceFilter === "not_checked_in" && isCheckedIn) return false;
      if (ticketFilter === "with_ticket" && !a.hasTicket) return false;
      if (ticketFilter === "no_ticket" && a.hasTicket) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.phone && a.phone.includes(q)) ||
          (a.whatsapp && a.whatsapp.includes(q)) ||
          (a.job && a.job.toLowerCase().includes(q)) ||
          (a.faculty && a.faculty.toLowerCase().includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q)) ||
          (a.ticketNumber && a.ticketNumber.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [attendees, search, attendanceFilter, ticketFilter]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auto-detect local file
  const [localFileAvailable, setLocalFileAvailable] = useState<boolean | null>(null);
  const [localFileLoading, setLocalFileLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string>("");

  // Counts summary
  const [counts, setCounts] = useState<{
    total: number;
    checkedIn: number;
    notCheckedIn: number;
    hasTicket: number;
    noTicket: number;
    accepted?: number;
    pending?: number;
    rejected?: number;
  }>(
    initialCounts
      ? {
          total: initialCounts.total || 0,
          checkedIn: initialCounts.checkedIn ?? initialAttendees?.filter((a) => a.status === "checked_in").length ?? 0,
          notCheckedIn: initialCounts.notCheckedIn ?? initialAttendees?.filter((a) => a.status !== "checked_in").length ?? 0,
          hasTicket: initialCounts.hasTicket || 0,
          noTicket: initialCounts.noTicket || 0,
        }
      : {
          total: initialAttendees?.length || 0,
          checkedIn: initialAttendees?.filter((a) => a.status === "checked_in").length || 0,
          notCheckedIn: initialAttendees?.filter((a) => a.status !== "checked_in").length || 0,
          hasTicket: initialAttendees?.filter((a) => a.hasTicket).length || 0,
          noTicket: initialAttendees?.filter((a) => !a.hasTicket).length || 0,
        }
  );

  // Single Attendee Quick Add state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    job: "",
    faculty: "",
    city: "",
    category: "General" as "General" | "VIP" | "Speaker",
    sendEmail: true,
  });
  const [addSuccessData, setAddSuccessData] = useState<{
    attendee: AttendeeRecord;
    ticket: any;
    message: string;
  } | null>(null);

  // Database Purge / Reset State (DELETE confirmation)
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [purgeCheckboxConfirmed, setPurgeCheckboxConfirmed] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Clear Column State
  const [showClearColumnModal, setShowClearColumnModal] = useState(false);
  const [columnToClear, setColumnToClear] = useState("phone");
  const [isClearingColumn, setIsClearingColumn] = useState(false);

  // Scanner Staff Management State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffActionNotice, setStaffActionNotice] = useState("");

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) return;

    try {
      setAddingAttendee(true);
      const res = await fetch("/api/attendees/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          phone: addForm.phone,
          job: addForm.job,
          faculty: addForm.faculty,
          city: addForm.city,
          category: addForm.category,
          sendEmailImmediately: addForm.sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل تسجيل المشارك");
        return;
      }

      setAddSuccessData({
        attendee: data.attendee,
        ticket: data.ticket,
        message: data.message,
      });

      setAttendees((prev) => [data.attendee, ...prev]);
      setCounts((prev) => ({
        ...prev,
        total: prev.total + 1,
        accepted: prev.accepted + 1,
        hasTicket: prev.hasTicket + 1,
      }));

      setActionNotice(`✓ تم تسجيل ${data.attendee.name} وإصدار تذكرته بنجاح!`);
      setTimeout(() => setActionNotice(""), 4000);

      // Reset form
      setAddForm({
        name: "",
        email: "",
        phone: "",
        job: "",
        faculty: "",
        city: "",
        category: "General",
        sendEmail: true,
      });
    } catch (err: any) {
      alert("حدث خطأ أثناء الإرسال: " + err.message);
    } finally {
      setAddingAttendee(false);
    }
  };

  // Edit Attendee State
  const [editingAttendee, setEditingAttendee] = useState<AttendeeRecord | null>(null);
  const [savingAttendeeEdit, setSavingAttendeeEdit] = useState(false);
  const [editAttendeeForm, setEditAttendeeForm] = useState({
    name: "",
    email: "",
    phone: "",
    job: "",
    faculty: "",
    city: "",
    category: "General" as "General" | "VIP" | "Speaker",
  });

  const handleStartEdit = (att: AttendeeRecord) => {
    setEditingAttendee(att);
    setEditAttendeeForm({
      name: att.name || "",
      email: att.email || "",
      phone: att.phone || att.whatsapp || "",
      job: att.job || "",
      faculty: att.faculty || "",
      city: att.city || "",
      category: (att.category as any) || "General",
    });
  };

  const handleSaveEditAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendee) return;

    try {
      setSavingAttendeeEdit(true);
      const res = await fetch(`/api/attendees/${editingAttendee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAttendeeForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل تعديل بيانات المشارك");
        return;
      }

      setAttendees((prev) =>
        prev.map((a) => (a.id === editingAttendee.id ? { ...a, ...editAttendeeForm } : a))
      );
      setActionNotice(`✓ تم تعديل بيانات ${editAttendeeForm.name} بنجاح!`);
      setTimeout(() => setActionNotice(""), 4000);
      setEditingAttendee(null);
    } catch (err: any) {
      alert("حدث خطأ أثناء التعديل: " + err.message);
    } finally {
      setSavingAttendeeEdit(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendees?search=${encodeURIComponent(search)}&attendance=${attendanceFilter}&ticket=${ticketFilter}`);
      const data = await res.json();
      if (data.attendees) {
        setAttendees(data.attendees);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check if Next gen.xlsx exists on user's machine
  const checkLocalExcel = async () => {
    try {
      const res = await fetch("/api/import/preview");
      const data = await res.json();
      if (data.available) {
        setLocalFileAvailable(true);
      } else {
        setLocalFileAvailable(false);
      }
    } catch {
      setLocalFileAvailable(false);
    }
  };

  useEffect(() => {
    if (!initialAttendees || initialAttendees.length === 0) {
      fetchAttendees();
    }
    checkLocalExcel();
    fetchStaff();
    const staffTimer = setInterval(fetchStaff, 30000);
    return () => clearInterval(staffTimer);
  }, []);

  // Toggle Attendance Status (حاضر / لم يحضر بعد)
  const handleToggleAttendance = async (attendee: AttendeeRecord) => {
    const isCurrentlyCheckedIn = attendee.status === "checked_in";
    const newStatus = isCurrentlyCheckedIn ? "registered" : "checked_in";

    try {
      setUpdatingStatusId(attendee.id);
      const res = await fetch(`/api/attendees/${attendee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل تحديث حالة الحضور");
        return;
      }

      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id
            ? {
                ...a,
                status: newStatus,
                checkedInAt: newStatus === "checked_in" ? new Date().toISOString() : undefined,
              }
            : a
        )
      );

      setCounts((prev) => ({
        ...prev,
        checkedIn: Math.max(0, (prev.checkedIn || 0) + (newStatus === "checked_in" ? 1 : -1)),
        notCheckedIn: Math.max(0, (prev.notCheckedIn || 0) + (newStatus === "checked_in" ? -1 : 1)),
      }));

      setActionNotice(
        newStatus === "checked_in"
          ? `✓ تم تسجيل حضور "${attendee.name}" وتحديث التذكرة بالداتابيز`
          : `✓ تم إلغاء تسجيل حضور "${attendee.name}"`
      );
      setTimeout(() => setActionNotice(""), 3500);
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Bulk Attendance Change (حاضرين / لم يحضروا بعد)
  const handleBulkAttendance = async (status: "checked_in" | "registered") => {
    if (selectedIds.size === 0) return;
    try {
      setLoading(true);
      const res = await fetch("/api/attendees/bulk-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedIds(new Set());
        fetchAttendees();
        setActionNotice(`✓ ${data.message}`);
        setTimeout(() => setActionNotice(""), 4000);
      } else {
        alert(data.error || "فشل تحديث الحضور للمحددين");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle single attendee approval status change (legacy support)
  const handleUpdateStatus = async (id: string, newStatus: ApprovalStatus) => {
    try {
      const res = await fetch(`/api/attendees/${id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: newStatus }),
      });
      if (res.ok) {
        setAttendees((prev) =>
          prev.map((a) => (a.id === id ? { ...a, approvalStatus: newStatus } : a))
        );
        setActionNotice(`تم تعديل الحالة إلى: ${newStatus === "accepted" ? "مقبول" : newStatus === "pending" ? "قيد المراجعة" : "مرفوض"}`);
        setTimeout(() => setActionNotice(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // One-click import from local Next gen.xlsx
  const handleImportLocalExcel = async () => {
    try {
      setLocalFileLoading(true);
      const res = await fetch("/api/attendees/load-local-excel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchAttendees();
        setActionNotice(`✓ ${data.message}`);
        setTimeout(() => setActionNotice(""), 6000);
      } else {
        alert(data.error || "فشل تحميل الملف");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLocalFileLoading(false);
    }
  };

  // Export current table view to XLSX
  const handleExportXLSX = () => {
    const exportData = attendees.map((a, idx) => ({
      "م": idx + 1,
      "الاسم": a.name,
      "البريد الإلكتروني": a.email,
      "رقم الواتساب": a.whatsapp || a.phone || "",
      "الوظيفة": a.job || "",
      "الكلية / الجهة": a.faculty || "",
      "العنوان / المحافظة": a.city || "",
      "حالة الحضور": a.status === "checked_in" ? "حاضر ✓" : "لم يحضر بعد",
      "حالة التذكرة": a.hasTicket ? `صادرة (${a.ticketNumber || ""})` : "غير صادرة",
      "فئة التذكرة": a.category || "General",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف الحضور والتذاكر");
    XLSX.writeFile(wb, `NextGen_Attendees_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Staff Management Handlers
  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await fetch("/api/admin/scanners");
      const data = await res.json();
      if (data.staff) setStaffList(data.staff);
    } catch {} finally {
      setLoadingStaff(false);
    }
  };

  const handleUpdateStaffStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/scanners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStaff();
        setStaffActionNotice(data.message);
        setTimeout(() => setStaffActionNotice(""), 3000);
      }
    } catch {}
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنظم؟")) return;
    try {
      const res = await fetch(`/api/admin/scanners?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchStaff();
        setStaffActionNotice("تم حذف المنظم بنجاح");
        setTimeout(() => setStaffActionNotice(""), 3000);
      }
    } catch {}
  };

  // Single Attendee Delete Handler
  const handleDeleteAttendee = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المشارك "${name}" وتذكرته نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/attendees/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAttendees((prev) => prev.filter((a) => a.id !== id));
        setActionNotice(`✓ تم حذف المشارك "${name}" وتذكرته بنجاح`);
        setTimeout(() => setActionNotice(""), 3500);
      } else {
        alert("فشل حذف المشارك");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    }
  };

  // Complete Database Purge Handler
  const handlePurgeDatabase = async () => {
    const isConfirmed =
      purgeConfirmText.trim().toUpperCase() === "DELETE" ||
      purgeConfirmText.trim() === "حذف" ||
      purgeCheckboxConfirmed;

    if (!isConfirmed) {
      alert("يرجى كتابة كلمة DELETE أو تحديد خيار تأكيد الحذف");
      return;
    }
    try {
      setIsPurging(true);
      const res = await fetch("/api/attendees/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE", confirmed: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAttendees([]);
        setSelectedIds(new Set());
        setShowPurgeModal(false);
        setPurgeConfirmText("");
        setPurgeCheckboxConfirmed(false);
        setActionNotice("✓ تم مسح وتفريغ قاعدة البيانات بالكامل بنجاح. يمكنك الآن رفع ملف إكسل جديد.");
        setTimeout(() => setActionNotice(""), 7000);
      } else {
        alert(data.error || "فشل تفريغ قاعدة البيانات");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  // Bulk Delete Selected Attendees (from Checkbox Selection)
  const handleDeleteSelectedAttendees = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (
      !confirm(
        `هل أنت متأكد من حذف ${
          count === 1 ? "هذا الشخص" : `${count} أشخاص`
        } وتذاكرهم نهائياً من قاعدة البيانات؟`
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/attendees/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        fetchAttendees();
        setActionNotice(`✓ ${data.message || `تم حذف ${count} مشارك وتذاكرهم بنجاح`}`);
        setTimeout(() => setActionNotice(""), 4500);
      } else {
        alert(data.error || "فشل حذف المشاركين المحددين");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear Specific Column Handler
  const handleClearColumn = async () => {
    if (!confirm(`هل أنت متأكد من تفريغ عمود "${columnToClear}" لجميع المشاركين؟`)) return;
    try {
      setIsClearingColumn(true);
      const res = await fetch("/api/attendees/clear-column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: columnToClear }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAttendees();
        setShowClearColumnModal(false);
        setActionNotice(`✓ ${data.message}`);
        setTimeout(() => setActionNotice(""), 4000);
      } else {
        alert(data.error || "فشل تفريغ العمود");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setIsClearingColumn(false);
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === attendees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(attendees.map((a) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Column Visibility State
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    phone: true,
    job: true,
    faculty: true,
    city: true,
    approval: true,
    ticket: true,
    actions: true,
  });

  // Bulk Send Tickets to Selected Attendees State
  const [showSendSelectedModal, setShowSendSelectedModal] = useState(false);
  const [sendingSelected, setSendingSelected] = useState(false);
  const [sendSelectedSummary, setSendSelectedSummary] = useState<{
    totalSelected: number;
    sentCount: number;
    failedCount: number;
    newlyIssuedCount: number;
    results: any[];
  } | null>(null);

  const selectedAttendeesList = useMemo(() => {
    return attendees.filter((a) => selectedIds.has(a.id));
  }, [attendees, selectedIds]);

  const handleSendSelectedTickets = async () => {
    if (selectedIds.size === 0) return;
    try {
      setSendingSelected(true);
      const res = await fetch("/api/attendees/send-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "فشل إرسال التذاكر");
        return;
      }

      setSendSelectedSummary({
        totalSelected: data.totalSelected,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        newlyIssuedCount: data.newlyIssuedCount,
        results: data.results || [],
      });

      // Refresh attendee list so any newly issued tickets are reflected
      fetchAttendees();
      setActionNotice(`✓ تم إرسال التذاكر بنجاح إلى ${data.sentCount} مشارك!`);
      setTimeout(() => setActionNotice(""), 5000);
    } catch (err: any) {
      alert("حدث خطأ أثناء الإرسال: " + err.message);
    } finally {
      setSendingSelected(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-6 text-[#1d1d1f] font-sans">
      <div className="w-full max-w-full px-3 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Breadcrumb & Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#7a7a7a]">
            <Link href="/" className="hover:text-[#1d1d1f] flex items-center gap-1 transition-colors">
              <ArrowRight className="h-3 w-3" />
              <span>الرئيسية</span>
            </Link>
            <span>/</span>
            <span className="text-[#0066cc] font-semibold">جدول المسجلين وحالة القبول (Excel View)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Gate Scanners Staff Button */}
            <button
              onClick={() => {
                fetchStaff();
                setShowStaffModal(true);
              }}
              className={`btn-press inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer ${
                staffList.some((s) => s.status === "pending")
                  ? "bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300 animate-pulse"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>
                ماسحو البوابات
                {staffList.filter((s) => s.status === "pending").length > 0
                  ? ` (🔔 ${staffList.filter((s) => s.status === "pending").length} طلب جديد!)`
                  : staffList.length > 0
                  ? ` (${staffList.length})`
                  : ""}
              </span>
            </button>

            {/* Clear Column Button */}
            <button
              onClick={() => setShowClearColumnModal(true)}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e5e7] px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              title="تفريغ بيانات عمود معين"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-500" />
              <span>تفريغ عمود</span>
            </button>

            {/* Purge Database Button */}
            <button
              onClick={() => {
                setPurgeConfirmText("");
                setShowPurgeModal(true);
              }}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              title="مسح جميع الحضور والتذاكر لتجهيز رفع ملف جديد"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>تفريغ الداتابيز (لملف جديد)</span>
            </button>

            <button
              onClick={() => {
                setAddSuccessData(null);
                setShowAddModal(true);
              }}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ إضافة شخص وتذكرة</span>
            </button>

            <Link
              href="/import"
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e5e7] px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] hover:bg-[#fafafc] transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-[#0066cc]" />
              <span>معالج رفع Excel</span>
            </Link>
            <Link
              href="/tickets/bulk-generate"
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-3.5 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>إصدار تذاكر للمقبولين</span>
            </Link>
          </div>
        </div>

        {/* Local Next gen.xlsx One-Click Import Banner */}
        {localFileAvailable && (
          <div className="mb-6 rounded-[18px] bg-white p-4 sm:p-5 border border-purple-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#8a38f5] shrink-0 border border-purple-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <span>تم اكتشاف ملف استجابات الفعالية: Next gen.xlsx</span>
                  <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">
                    430 مسجل
                  </span>
                </h3>
                <p className="text-xs text-[#7a7a7a] mt-0.5">
                  مسار الملف: C:\Users\Anwar\Downloads\Next gen.xlsx (يشمل الاسم، الوظيفة، الواتساب، الكلية، والعنوان).
                </p>
              </div>
            </div>

            <button
              onClick={handleImportLocalExcel}
              disabled={localFileLoading}
              className="btn-press inline-flex items-center gap-2 rounded-full bg-[#8a38f5] hover:bg-[#7826e3] px-5 py-2 text-xs font-semibold text-white shadow-2xs transition-all disabled:opacity-50 shrink-0"
            >
              {localFileLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري استيراد الـ 430 مسجل...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                  <span>استيراد جميع المسجلين بنقرة واحدة (430 مسجل)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice("")} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {/* 4 Essential Gate & Attendance Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div
            onClick={() => {
              setAttendanceFilter("all");
              setTicketFilter("all");
            }}
            className={`rounded-[16px] p-4 border shadow-2xs cursor-pointer transition-all ${
              attendanceFilter === "all" && ticketFilter === "all"
                ? "bg-slate-50 border-slate-300 ring-2 ring-slate-200"
                : "bg-white border-[#e5e5e7] hover:border-slate-300"
            }`}
          >
            <span className="text-[11px] text-[#7a7a7a] block font-medium">إجمالي المسجلين</span>
            <span className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] font-mono mt-1 block">
              {counts.total}
            </span>
          </div>

          <div
            onClick={() => setAttendanceFilter("checked_in")}
            className={`rounded-[16px] p-4 border shadow-2xs cursor-pointer transition-all ${
              attendanceFilter === "checked_in"
                ? "bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200"
                : "bg-white border-[#e5e5e7] hover:border-emerald-200"
            }`}
          >
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>حاضرين في القاعة</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono mt-1 block">
              {counts.checkedIn || 0}
            </span>
          </div>

          <div
            onClick={() => setAttendanceFilter("not_checked_in")}
            className={`rounded-[16px] p-4 border shadow-2xs cursor-pointer transition-all ${
              attendanceFilter === "not_checked_in"
                ? "bg-amber-50/90 border-amber-300 ring-2 ring-amber-200"
                : "bg-white border-[#e5e5e7] hover:border-amber-200"
            }`}
          >
            <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>لم يحضروا بعد</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono mt-1 block">
              {counts.notCheckedIn || 0}
            </span>
          </div>

          <div
            onClick={() => setTicketFilter(ticketFilter === "with_ticket" ? "all" : "with_ticket")}
            className={`rounded-[16px] p-4 border shadow-2xs cursor-pointer transition-all ${
              ticketFilter === "with_ticket"
                ? "bg-purple-50/90 border-purple-300 ring-2 ring-purple-200"
                : "bg-white border-[#e5e5e7] hover:border-purple-200"
            }`}
          >
            <span className="text-[11px] text-[#8a38f5] font-semibold flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" />
              <span>تذاكر صادرة</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#8a38f5] font-mono mt-1 block">
              {counts.hasTicket}
            </span>
          </div>
        </div>

        {/* Toolbar: Search, Filters, Bulk Controls, Export */}
        <div className="mb-4 rounded-[18px] bg-white p-4 border border-[#e5e5e7] shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-[#7a7a7a]" />
            <input
              type="text"
              placeholder="بحث بالاسم، الإيميل، رقم الواتساب، الوظيفة، أو الكلية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] py-2 pr-10 pl-4 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Filters & Bulk Actions */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Attendance Filter */}
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as any)}
              className="rounded-full border border-[#e5e5e7] bg-white px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none font-medium"
            >
              <option value="all">كل حالات الحضور</option>
              <option value="checked_in">حاضرين فقط ✓</option>
              <option value="not_checked_in">لم يحضروا بعد ⏳</option>
            </select>

            {/* Ticket Filter */}
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value)}
              className="rounded-full border border-[#e5e5e7] bg-white px-3.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none"
            >
              <option value="all">كل التذاكر</option>
              <option value="with_ticket">لديهم تذاكر</option>
              <option value="no_ticket">بدون تذاكر</option>
            </select>

            {/* Bulk Selection Actions (Active when 1 or more selected) */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-full border border-[#e5e5e7]">
                <span className="text-[11px] font-semibold text-[#1d1d1f] px-2">
                  محدد ({selectedIds.size}):
                </span>
                <button
                  onClick={() => {
                    setSendSelectedSummary(null);
                    setShowSendSelectedModal(true);
                  }}
                  className="btn-press flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] text-white shadow-xs hover:opacity-95 transition-all cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>إرسال التذكرة ({selectedIds.size})</span>
                </button>
                <button
                  onClick={() => handleBulkAttendance("checked_in")}
                  className="btn-press flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>تسجيل الحضور ✓</span>
                </button>
                <button
                  onClick={() => handleBulkAttendance("registered")}
                  className="btn-press flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-neutral-600 text-white hover:bg-neutral-700 cursor-pointer shadow-2xs"
                >
                  <Clock className="h-3 w-3" />
                  <span>إلغاء الحضور</span>
                </button>
                <button
                  onClick={handleDeleteSelectedAttendees}
                  className="btn-press px-3 py-1 rounded-full text-[11px] font-bold bg-red-700 hover:bg-red-800 text-white flex items-center gap-1 shadow-xs cursor-pointer mr-1"
                  title="حذف الأشخاص المحددين وتذاكرهم من الداتابيز نهائياً"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>حذف {selectedIds.size === 1 ? "الشخص المحدد" : `المحددين (${selectedIds.size})`}</span>
                </button>
              </div>
            )}

            {/* Column Customizer */}
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker((prev) => !prev)}
                className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e5e7] px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] hover:bg-[#fafafc] transition-colors cursor-pointer"
                title="تخصيص وإظهار/إخفاء الأعمدة في الجدول"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0066cc]" />
                <span>تخصيص الأعمدة</span>
              </button>

              {showColumnPicker && (
                <div className="absolute left-0 mt-2 z-30 w-56 rounded-2xl bg-white p-3 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 text-xs text-right">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2 font-bold text-[#1d1d1f]">
                    <span>إظهار الأعمدة في الجدول</span>
                    <button
                      onClick={() => setShowColumnPicker(false)}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {[
                      { key: "name", label: "الاسم بالكامل" },
                      { key: "email", label: "البريد الإلكتروني" },
                      { key: "phone", label: "الهاتف / واتساب" },
                      { key: "job", label: "الوظيفة" },
                      { key: "faculty", label: "الكلية / الجهة" },
                      { key: "city", label: "المحافظة / العنوان" },
                      { key: "approval", label: "حالة الحضور" },
                      { key: "ticket", label: "حالة التذكرة" },
                      { key: "actions", label: "الإجراءات والتعديل" },
                    ].map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center justify-between p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
                      >
                        <span>{col.label}</span>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                          onChange={(e) =>
                            setVisibleColumns({
                              ...visibleColumns,
                              [col.key]: e.target.checked,
                            })
                          }
                          className="rounded text-[#0066cc] cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export to Excel Button */}
            <button
              onClick={handleExportXLSX}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e5e7] px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] hover:bg-[#fafafc] transition-colors"
              title="تصدير الجدول المعروض إلى ملف Excel"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchAttendees}
              disabled={loading}
              className="btn-press p-2 rounded-full bg-white border border-[#e5e5e7] text-[#7a7a7a] hover:text-[#0066cc] transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

        </div>

        {/* EXCEL INTERACTIVE SPREADSHEET TABLE */}
        <div className="rounded-[18px] bg-white border border-[#e5e5e7] shadow-2xs overflow-hidden">
          
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] min-h-[550px] scrollbar-thin">
            <table className="w-full border-collapse text-right text-xs">
              
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-[#fafafc] border-b border-[#e5e5e7] text-[#7a7a7a]">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="text-[#7a7a7a] hover:text-[#1d1d1f]"
                      title="تحديد الكل"
                    >
                      {selectedIds.size === attendees.length && attendees.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-[#0066cc]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 font-semibold text-[#1d1d1f] w-12">#</th>
                  {visibleColumns.name && <th className="p-3 font-semibold text-[#1d1d1f]">الاسم بالكامل</th>}
                  {visibleColumns.email && <th className="p-3 font-semibold text-[#1d1d1f]">البريد الإلكتروني</th>}
                  {visibleColumns.phone && <th className="p-3 font-semibold text-[#1d1d1f]">الواتساب / الهاتف</th>}
                  {visibleColumns.job && <th className="p-3 font-semibold text-[#1d1d1f]">الوظيفة</th>}
                  {visibleColumns.faculty && <th className="p-3 font-semibold text-[#1d1d1f]">الكلية / الجهة</th>}
                  {visibleColumns.city && <th className="p-3 font-semibold text-[#1d1d1f]">العنوان / المحافظة</th>}
                  {visibleColumns.approval && (
                    <th className="p-3 font-semibold text-[#1d1d1f] text-center w-36">
                      حالة الحضور
                    </th>
                  )}
                  {visibleColumns.ticket && (
                    <th className="p-3 font-semibold text-[#1d1d1f] text-center w-32">حالة التذكرة</th>
                  )}
                  {visibleColumns.actions && (
                    <th className="p-3 font-semibold text-[#1d1d1f] text-center w-28">إجراءات</th>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-[#f0f0f0]">
                {loading && attendees.length === 0 ? (
                  <tr>
                    <td colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="p-16 text-center text-xs text-[#7a7a7a]">
                      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent mb-2" />
                      جاري تحميل بيانات المسجلين من قاعدة البيانات...
                    </td>
                  </tr>
                ) : filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="p-16 text-center text-[#7a7a7a]">
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-neutral-300 mb-2" />
                      <p className="text-sm font-semibold text-[#1d1d1f]">لا توجد بيانات مطابقة للبحث</p>
                      <p className="text-xs text-[#7a7a7a] mt-1">
                        يمكنك استيراد المسجلين من ملف Next gen.xlsx أو مسح فلاتر البحث.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((att, idx) => {
                    const isSelected = selectedIds.has(att.id);

                    return (
                      <tr
                        key={att.id}
                        className={`transition-colors hover:bg-[#fafafc] ${
                          isSelected ? "bg-blue-50/50" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleSelect(att.id)}
                            className="text-[#7a7a7a] hover:text-[#1d1d1f]"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-[#0066cc]" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* Row Index */}
                        <td className="p-3 font-mono text-[11px] text-[#7a7a7a]">{idx + 1}</td>

                        {/* Name */}
                        {visibleColumns.name && (
                          <td className="p-3">
                            <div className="font-semibold text-[#1d1d1f] line-clamp-1">{att.name}</div>
                            {att.category && att.category !== "General" && (
                              <span className="inline-block mt-0.5 text-[9.5px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                                {att.category}
                              </span>
                            )}
                          </td>
                        )}

                        {/* Email */}
                        {visibleColumns.email && (
                          <td className="p-3 text-neutral-600 font-mono text-[11px]">{att.email}</td>
                        )}

                        {/* Phone / Whatsapp */}
                        {visibleColumns.phone && (
                          <td className="p-3 text-neutral-600 font-mono text-[11px] whitespace-nowrap" dir="ltr">
                            {att.whatsapp || att.phone || "-"}
                          </td>
                        )}

                        {/* Job */}
                        {visibleColumns.job && (
                          <td className="p-3 text-neutral-600 whitespace-nowrap">{att.job || "-"}</td>
                        )}

                        {/* Faculty */}
                        {visibleColumns.faculty && (
                          <td className="p-3 text-neutral-600 max-w-[180px] truncate" title={att.faculty}>
                            {att.faculty || "-"}
                          </td>
                        )}

                        {/* City / Address */}
                        {visibleColumns.city && (
                          <td className="p-3 text-neutral-600 whitespace-nowrap">{att.city || "-"}</td>
                        )}

                        {/* ATTENDANCE STATUS TOGGLE (حاضر / لم يحضر بعد) */}
                        {visibleColumns.approval && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(att)}
                              disabled={updatingStatusId === att.id}
                              title={
                                att.status === "checked_in"
                                  ? "انقر لإلغاء تسجيل الحضور"
                                  : "انقر لتسجيل حضور الشخص الآن في القاعة"
                              }
                              className={`btn-press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                                att.status === "checked_in"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                                  : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                              }`}
                            >
                              {updatingStatusId === att.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                              ) : att.status === "checked_in" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                              )}
                              <span>{att.status === "checked_in" ? "حاضر ✓" : "لم يحضر بعد"}</span>
                            </button>
                          </td>
                        )}

                        {/* TICKET STATUS */}
                        {visibleColumns.ticket && (
                          <td className="p-3 text-center">
                            {att.hasTicket ? (
                              <Link
                                href={`/tickets/${att.ticketId}`}
                                className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 text-[10px] font-semibold font-mono hover:bg-purple-100 transition-colors"
                              >
                                <Ticket className="h-3 w-3" />
                                <span>{att.ticketNumber || "تذكرة صادرة"}</span>
                              </Link>
                            ) : (
                              <span className="text-[10px] text-[#7a7a7a] font-normal">
                                لم تصدر بعد
                              </span>
                            )}
                          </td>
                        )}

                        {/* ACTIONS */}
                        {visibleColumns.actions && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleStartEdit(att)}
                                className="btn-press p-1.5 rounded-full text-neutral-500 hover:text-[#0066cc] hover:bg-neutral-100 transition-colors cursor-pointer"
                                title="تعديل بيانات المسجل"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete Attendee Button */}
                              <button
                                onClick={() => handleDeleteAttendee(att.id, att.name)}
                                className="btn-press p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="حذف المشارك وتذكرته نهائياً"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              {att.hasTicket ? (
                                <Link
                                  href={`/tickets/${att.ticketId}`}
                                  className="btn-press p-1.5 rounded-full text-[#0066cc] hover:bg-blue-50 transition-colors"
                                  title="عرض التذكرة"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <Link
                                  href={`/tickets/bulk-generate`}
                                  className="btn-press text-[10.5px] font-medium text-[#0066cc] hover:underline whitespace-nowrap"
                                >
                                  إصدار الآن
                                </Link>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="border-t border-[#e5e5e7] bg-[#fafafc] p-3.5 px-4 text-xs text-[#7a7a7a] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              عرض <strong className="text-[#1d1d1f] font-mono">{filteredAttendees.length}</strong> من إجمالي{" "}
              <strong className="text-[#1d1d1f] font-mono">{counts.total}</strong> مسجل في قاعدة البيانات
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                المقبولين: {counts.accepted}
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                قيد المراجعة: {counts.pending}
              </span>
              <span className="flex items-center gap-1 text-red-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                المرفوضين: {counts.rejected}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* QUICK ADD ATTENDEE & INSTANT TICKET MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#e5e5e7] text-right my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1d1d1f]">
                    إضافة شخص جديد وإصدار تذكرة فورية
                  </h3>
                  <p className="text-xs text-[#7a7a7a]">
                    سيتم حفظه في قاعدة البيانات وتوليد الباركود (QR) وإرساله بريدياً فوراً
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddSuccessData(null);
                }}
                className="rounded-full p-1.5 text-[#7a7a7a] hover:bg-[#f5f5f7] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success Preview View */}
            {addSuccessData ? (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#1d1d1f]">
                    تم الإصدار والحفظ بنجاح!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    {addSuccessData.message}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f5f7] p-4 text-right border border-[#e5e5e7] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#7a7a7a]">الاسم:</span>
                    <strong className="text-[#1d1d1f]">{addSuccessData.attendee.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a7a7a]">البريد الإلكتروني:</span>
                    <strong className="text-[#1d1d1f] font-mono">{addSuccessData.attendee.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a7a7a]">رقم التذكرة:</span>
                    <strong className="text-[#8a38f5] font-mono text-sm">{addSuccessData.ticket.ticketNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a7a7a]">حالة القبول:</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">مقبول ومؤكد</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href={`/tickets/${addSuccessData.ticket.id}`}
                    target="_blank"
                    className="flex-1 btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] py-2.5 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>عرض التذكرة والباركود</span>
                  </Link>
                  <button
                    onClick={() => {
                      setAddSuccessData(null);
                    }}
                    className="btn-press rounded-full border border-[#e5e5e7] bg-white hover:bg-[#fafafc] px-4 py-2.5 text-xs font-semibold text-[#1d1d1f] transition-colors"
                  >
                    إضافة شخص آخر
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form */
              <form onSubmit={handleQuickAdd} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="مثال: حور محمد عويضه"
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    عنوان البريد الإلكتروني <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white text-left font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      رقم الهاتف / واتساب
                    </label>
                    <input
                      type="tel"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="010xxxxxxxx"
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      فئة التذكرة
                    </label>
                    <select
                      value={addForm.category}
                      onChange={(e) => setAddForm({ ...addForm, category: e.target.value as any })}
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white cursor-pointer"
                    >
                      <option value="General">عامة (General)</option>
                      <option value="VIP">خاصة (VIP)</option>
                      <option value="Speaker">متحدث (Speaker)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      الوظيفة
                    </label>
                    <input
                      type="text"
                      value={addForm.job}
                      onChange={(e) => setAddForm({ ...addForm, job: e.target.value })}
                      placeholder="مثال: طالب / مهندس"
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      الجهة / الكلية
                    </label>
                    <input
                      type="text"
                      value={addForm.faculty}
                      onChange={(e) => setAddForm({ ...addForm, faculty: e.target.value })}
                      placeholder="مثال: جامعة كفر الشيخ"
                      className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    المحافظة / العنوان
                  </label>
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    placeholder="مثال: كفر الشيخ"
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                  />
                </div>

                {/* Instant Email Checkbox */}
                <div className="rounded-xl bg-purple-50 p-3 border border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#8a38f5]" />
                    <div>
                      <div className="text-xs font-bold text-[#1d1d1f]">
                        إرسال التذكرة بالباركود إلى إيميله فوراً
                      </div>
                      <div className="text-[10.5px] text-[#7a7a7a]">
                        تصل التذكرة بتصميم فيجما الجديد والباركود المعتمد
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={addForm.sendEmail}
                    onChange={(e) => setAddForm({ ...addForm, sendEmail: e.target.checked })}
                    className="h-4 w-4 rounded text-[#8a38f5] focus:ring-[#8a38f5] cursor-pointer"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-press rounded-full border border-[#e5e5e7] bg-white px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#fafafc]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={addingAttendee}
                    className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {addingAttendee ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري الإصدار والإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>إصدار التذكرة وحفظها فوراً</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT ATTENDEE MODAL */}
      {editingAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div
            dir="rtl"
            className="relative w-full max-w-lg rounded-[22px] bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 text-[#1d1d1f] my-8"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-[#0066cc] flex items-center justify-center">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f]">
                    تعديل بيانات المشارك والتذكرة
                  </h3>
                  <p className="text-[11px] text-[#7a7a7a]">
                    تحديث الاسم أو وسيلة الاتصال ويتزامن تلقائياً مع تذكرته
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAttendee(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAttendee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                  الاسم الكامل: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editAttendeeForm.name}
                  onChange={(e) =>
                    setEditAttendeeForm({ ...editAttendeeForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs sm:text-sm text-[#1d1d1f] font-semibold outline-none focus:border-[#0066cc] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    البريد الإلكتروني: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editAttendeeForm.email}
                    onChange={(e) =>
                      setEditAttendeeForm({ ...editAttendeeForm, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] font-mono outline-none focus:border-[#0066cc] focus:bg-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    الهاتف / واتساب:
                  </label>
                  <input
                    type="tel"
                    value={editAttendeeForm.phone}
                    onChange={(e) =>
                      setEditAttendeeForm({ ...editAttendeeForm, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] font-mono outline-none focus:border-[#0066cc] focus:bg-white"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    الفئة:
                  </label>
                  <select
                    value={editAttendeeForm.category}
                    onChange={(e) =>
                      setEditAttendeeForm({
                        ...editAttendeeForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white cursor-pointer"
                  >
                    <option value="General">عامة (General)</option>
                    <option value="VIP">خاصة (VIP)</option>
                    <option value="Speaker">متحدث (Speaker)</option>
                    <option value="Organizer">تنظيم (Organizer)</option>
                    <option value="Media">إعلام (Media)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    الوظيفة:
                  </label>
                  <input
                    type="text"
                    value={editAttendeeForm.job}
                    onChange={(e) =>
                      setEditAttendeeForm({ ...editAttendeeForm, job: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    الجهة / الكلية:
                  </label>
                  <input
                    type="text"
                    value={editAttendeeForm.faculty}
                    onChange={(e) =>
                      setEditAttendeeForm({ ...editAttendeeForm, faculty: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    المحافظة / العنوان:
                  </label>
                  <input
                    type="text"
                    value={editAttendeeForm.city}
                    onChange={(e) =>
                      setEditAttendeeForm({ ...editAttendeeForm, city: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#d2d2d7] bg-[#fafafc] px-3.5 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:bg-white"
                  />
                </div>
              </div>

              {editingAttendee.hasTicket && (
                <div className="rounded-xl bg-purple-50 p-3 border border-purple-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-900">
                    له تذكرة صادرة رقم: {editingAttendee.ticketNumber}
                  </span>
                  <Link
                    href={`/tickets/${editingAttendee.ticketId}`}
                    className="text-[#0066cc] font-bold hover:underline"
                    target="_blank"
                  >
                    عرض وتعديل التذكرة مباشرة ←
                  </Link>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingAttendee(null)}
                  className="btn-press rounded-full border border-[#e5e5e7] bg-white px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#fafafc] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingAttendeeEdit}
                  className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingAttendeeEdit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري حفظ التعديل...</span>
                    </>
                  ) : (
                    <span>حفظ بيانات المشارك وتحديث التذكرة</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* BULK SEND TICKETS TO SELECTED ATTENDEES MODAL */}
      {showSendSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div
            dir="rtl"
            className="relative w-full max-w-xl rounded-[24px] bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 text-[#1d1d1f] my-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#6c12e8] to-[#9333ea] text-white flex items-center justify-center shadow-xs">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
                    <span>إرسال التذاكر للمشاركين المحددين</span>
                    <span className="rounded-full bg-purple-100 text-[#6c12e8] text-[11px] px-2 py-0.5 font-bold">
                      {selectedIds.size} مشارك
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#7a7a7a]">
                    إرسال تذكرة الفعالية مع الباركود وكافة التفاصيل لكل شخص محدد
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSendSelectedModal(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* SEND RESULTS SUMMARY (If already sent) */}
            {sendSelectedSummary ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-center">
                  <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">
                    تم إرسال التذاكر بنجاح!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    وصلت التذاكر إلى صناديق البريد للمشاركين المحددين بالباركود والتفاصيل المعتمدة.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-200 text-xs">
                    <div className="bg-white/80 rounded-xl p-2">
                      <span className="block text-[#7a7a7a] text-[10px]">تم الإرسال</span>
                      <strong className="text-emerald-700 text-sm font-mono">{sendSelectedSummary.sentCount}</strong>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2">
                      <span className="block text-[#7a7a7a] text-[10px]">تذاكر أُصدرت فوراً</span>
                      <strong className="text-purple-700 text-sm font-mono">{sendSelectedSummary.newlyIssuedCount}</strong>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2">
                      <span className="block text-[#7a7a7a] text-[10px]">تعثر</span>
                      <strong className="text-red-600 text-sm font-mono">{sendSelectedSummary.failedCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowSendSelectedModal(false);
                      setSendSelectedSummary(null);
                      setSelectedIds(new Set());
                    }}
                    className="btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] text-white px-6 py-2 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    إغلاق والعودة للجدول
                  </button>
                </div>
              </div>
            ) : (
              /* CONFIRMATION & SEND FORM */
              <div className="space-y-4">
                {/* Information Callout */}
                <div className="rounded-2xl bg-purple-50/80 p-3.5 border border-purple-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900">
                    <Sparkles className="h-3.5 w-3.5 text-[#6c12e8]" />
                    <span>ما الذي سيتضمنه البريد المرسل لكل مشارك؟</span>
                  </div>
                  <ul className="text-purple-950 text-[11px] space-y-1 pr-3 list-disc">
                    <li>التذكرة الرسمية باللون البنفسجي الفاخر وفق تصميم فيجما المعتمد.</li>
                    <li>رمز الدخول المشفر (QR Code Barcode) للتحقق الإلكتروني عند البوابة.</li>
                    <li>اسم المشارك وفئته، وتاريخ ووقت الفعالية (13 أكتوبر 2026)، وموقع المسرح.</li>
                    <li>إذا كان هناك مشاركون لم تصدر لهم تذاكر بعد، سيتم توليد تذاكرهم وتشفيرها فورياً وتلقائياً قبل الإرسال.</li>
                  </ul>
                </div>

                {/* Selected Attendees Preview List */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] mb-1.5">
                    <span>قائمة المشاركين المحددين للإرسال ({selectedAttendeesList.length}):</span>
                    <span className="text-[10px] text-[#7a7a7a]">تأكد من صحة العناوين</span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-neutral-200 bg-[#fafafc] p-2">
                    {selectedAttendeesList.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between bg-white p-2 rounded-lg border border-neutral-100 text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#1d1d1f]">{att.name}</div>
                          <div className="text-[10.5px] font-mono text-[#7a7a7a]" dir="ltr">
                            {att.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {att.category && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full font-medium">
                              {att.category}
                            </span>
                          )}
                          {att.hasTicket ? (
                            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                              تذكرة جاهزة
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                              سيتم توليدها فورياً
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowSendSelectedModal(false)}
                    disabled={sendingSelected}
                    className="btn-press rounded-full border border-[#e5e5e7] bg-white px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#fafafc] cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={handleSendSelectedTickets}
                    disabled={sendingSelected}
                    className="btn-press inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] hover:opacity-95 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingSelected ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري إصدار وإرسال التذاكر الآن...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>بدء إرسال التذاكر الآن ({selectedIds.size} مشارك)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 1. DANGER: COMPLETE DATABASE PURGE MODAL */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-200 animate-scale-in text-right">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  تفريغ وحذف جميع البيانات (نهائياً)
                </h3>
                <p className="text-xs text-red-600 font-medium">
                  إجراء حساس لا يمكن التراجع عنه
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              أنت على وشك حذف جميع المسجلين ({attendees.length} حاضر) وجميع التذاكر الصادرة نهائياً من قاعدة البيانات والسحابة لتتمكن من استيراد ملف إكسل جديد نظيف.
            </p>

            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1 mb-4">
              <p className="font-bold">لتأكيد الحذف النهائي، اكتب الكلمة التالية بالإنجليزية:</p>
              <div className="font-mono text-center text-sm font-black text-red-600 py-1 bg-white rounded-lg border border-red-200 tracking-wider">
                DELETE
              </div>
            </div>

            <div className="mb-2">
              <input
                type="text"
                placeholder="اكتب كلمة DELETE أو حذف هنا..."
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                dir="ltr"
                className="w-full text-center font-mono font-bold text-sm p-3 rounded-2xl border border-neutral-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                autoFocus
              />
            </div>

            <div className="text-center mb-3">
              <button
                type="button"
                onClick={() => setPurgeConfirmText("DELETE")}
                className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
              >
                اضغط هنا لتعبئة كلمة DELETE تلقائياً
              </button>
            </div>

            {/* Checkbox Quick Confirmation */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-900 cursor-pointer mb-4 select-none">
              <input
                type="checkbox"
                checked={purgeCheckboxConfirmed}
                onChange={(e) => setPurgeCheckboxConfirmed(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 cursor-pointer h-4 w-4"
              />
              <span className="font-semibold">أؤكد رغبتي في تفريغ وحذف جميع البيانات نهائياً الآن</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeCheckboxConfirmed(false);
                }}
                disabled={isPurging}
                className="flex-1 py-2.5 rounded-2xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handlePurgeDatabase}
                disabled={
                  (!purgeCheckboxConfirmed &&
                    purgeConfirmText.trim().toUpperCase() !== "DELETE" &&
                    purgeConfirmText.trim() !== "حذف") ||
                  isPurging
                }
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-xs font-bold text-white shadow-lg shadow-red-500/25 transition-all cursor-pointer"
              >
                {isPurging ? "جاري المسح والتفريغ..." : "حذف الكل الآن وتجهيز الداتابيز"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CLEAR SPECIFIC COLUMN MODAL */}
      {showClearColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 animate-scale-in text-right">
            <div className="flex items-center gap-3 text-neutral-800 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-600">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">تفريغ عمود محدد من الجدول</h3>
                <p className="text-xs text-neutral-500">حذف محتويات هذا الحقل لجميع المسجلين</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-semibold text-neutral-700">
                اختر العمود المراد مسح بياناته:
              </label>
              <select
                value={columnToClear}
                onChange={(e) => setColumnToClear(e.target.value)}
                className="w-full p-3 rounded-2xl border border-neutral-300 text-xs font-semibold bg-white outline-none focus:border-purple-500"
              >
                <option value="phone">عمود رقم الهاتف / الواتساب (Phone)</option>
                <option value="job">عمود الوظيفة (Job)</option>
                <option value="faculty">عمود الكلية / الجهة (Faculty)</option>
                <option value="city">عمود العنوان / المحافظة (City)</option>
                <option value="referralSource">عمود مصدر المعرفة (Referral)</option>
              </select>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                ⚠️ سيتم تفريغ هذا الحقل لعدد {attendees.length} حاضر في قاعدة البيانات السحابية والمحلية.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearColumnModal(false)}
                disabled={isClearingColumn}
                className="flex-1 py-2.5 rounded-2xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleClearColumn}
                disabled={isClearingColumn}
                className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md shadow-amber-500/20"
              >
                {isClearingColumn ? "جاري التفريغ..." : "تفريغ العمود الآن"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. GATE SCANNERS STAFF MANAGEMENT MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 animate-scale-in text-right max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                    إدارة ماسحي البوابات والاعتمادات
                  </h3>
                  <p className="text-xs text-neutral-500">
                    منح صلاحيات فحص التذاكر لمنظمي البوابات وقبول الطلبات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Links Banner */}
            <div className="my-3 p-3 rounded-2xl bg-purple-50 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-purple-900">رابط تسجيل المنظمين للبوابات:</span>
                <span className="block font-mono text-[11px] text-purple-700 mt-0.5" dir="ltr">
                  /scanner/register
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/scanner/register`);
                  alert("تم نسخ رابط تسجيل المنظمين!");
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>نسخ الرابط للمنظمين</span>
              </button>
            </div>

            {staffActionNotice && (
              <div className="p-2.5 mb-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold text-center">
                {staffActionNotice}
              </div>
            )}

            {/* Staff Table / List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
              {loadingStaff ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-600 mb-2" />
                  جاري تحميل قائمة المنظمين...
                </div>
              ) : staffList.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400 space-y-1">
                  <Users className="h-8 w-8 mx-auto text-neutral-300" />
                  <p className="font-semibold text-neutral-600">لا يوجد منظمين مسجلين بعد</p>
                  <p>أرسل رابط /scanner/register للمنظمين ليسجلوا بياناتهم وتعتمدها هنا.</p>
                </div>
              ) : (
                staffList.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl border border-neutral-200 bg-[#fafafc] hover:bg-white transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900">{st.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            st.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : st.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {st.status === "approved" ? "✓ مفعل (Approved)" : st.status === "pending" ? "⏳ قيد المراجعة" : "✕ مرفوض"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                        <span className="font-mono" dir="ltr">{st.phone}</span>
                        <span>•</span>
                        <span className="text-purple-700 font-semibold">{st.gate}</span>
                        <span>•</span>
                        <span className="font-mono">{st.totalScans || 0} فحص</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {st.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStaffStatus(st.id, "approved")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          اعتماد وقبول
                        </button>
                      )}
                      {st.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStaffStatus(st.id, "rejected")}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold cursor-pointer"
                        >
                          رفض
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(st.id)}
                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                        title="حذف المنظم"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
