"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  XCircle,
  HelpCircle,
  Settings,
  Shield,
  Key,
  Server,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Lock,
  Search,
  Filter,
  RotateCcw,
  Check,
  CheckSquare,
  Square,
  Users,
  Layers,
  X,
  Plus,
  Trash2,
  Activity,
  HardDrive,
} from "lucide-react";
import { TicketData, EmailDeliveryRecord, EmailSettings, EmailServer } from "@/types/ticket";

export default function BulkEmailCampaignPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [emailHtml, setEmailHtml] = useState("");

  // Right column active tab: "recipients" or "preview"
  const [activeTab, setActiveTab] = useState<"recipients" | "preview">("recipients");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<"all" | "delivered" | "failed" | "pending">("all");
  const [resendingTicketId, setResendingTicketId] = useState<string | null>(null);

  // Multi-Account Email Servers Pool state
  const [emailServers, setEmailServers] = useState<EmailServer[]>([]);
  const [loadingEmailServers, setLoadingEmailServers] = useState(false);
  const [showServersModal, setShowServersModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerEmail, setNewServerEmail] = useState("");
  const [newServerPassword, setNewServerPassword] = useState("");
  const [newServerHost, setNewServerHost] = useState("smtp.gmail.com");
  const [newServerPort, setNewServerPort] = useState(465);
  const [newServerLimit, setNewServerLimit] = useState(450);
  const [savingNewServer, setSavingNewServer] = useState(false);
  const [serverNotice, setServerNotice] = useState("");
  const [serverTestRecipient, setServerTestRecipient] = useState<Record<string, string>>({});
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [serverTestStatus, setServerTestStatus] = useState<Record<string, { success: boolean; msg: string }>>({});

  // Real-time server progress tracking during sending
  const [currentSendingServer, setCurrentSendingServer] = useState<string | null>(null);
  const [serverSentTally, setServerSentTally] = useState<Record<string, number>>({});

  // Multi-row selection for sending batches
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);
  const [selectedBatchSize, setSelectedBatchSize] = useState<number>(10);
  const [isSendingSelectedGroup, setIsSendingSelectedGroup] = useState<boolean>(false);
  const [selectedGroupProgress, setSelectedGroupProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);
  const [showSelectedConfirmModal, setShowSelectedConfirmModal] = useState<boolean>(false);

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState("");

  // Bulk campaign options
  const [campaignDelayMs, setCampaignDelayMs] = useState<number>(500);
  const [sendOnlyUnsent, setSendOnlyUnsent] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);
  const [campaignResultMsg, setCampaignResultMsg] = useState("");

  // Email Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    provider: "mock",
    fromName: "ملتقى الجيل القادم - Next Gen",
    fromEmail: "",
    replyTo: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    resendApiKey: "",
    resendFromEmail: "",
    enableRateLimiting: true,
    delayBetweenEmailsMs: 500,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  const fetchEmailServers = async () => {
    try {
      setLoadingEmailServers(true);
      const res = await fetch("/api/settings/email-servers");
      const data = await res.json();
      if (data.servers) {
        setEmailServers(data.servers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmailServers(false);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerEmail || !newServerPassword) {
      setServerNotice("✕ يرجى إدخال البريد الإلكتروني وكلمة مرور التطبيق (App Password)");
      return;
    }
    setSavingNewServer(true);
    setServerNotice("");
    try {
      const res = await fetch("/api/settings/email-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServerName.trim() || newServerEmail.trim(),
          email: newServerEmail.trim(),
          password: newServerPassword.trim(),
          host: newServerHost.trim() || "smtp.gmail.com",
          port: Number(newServerPort) || 465,
          dailyLimit: Number(newServerLimit) || 450,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setServerNotice("✓ تم إضافة الخادم بنجاح وحفظه في قاعدة البيانات (Supabase)!");
        setNewServerName("");
        setNewServerEmail("");
        setNewServerPassword("");
        fetchEmailServers();
      } else {
        setServerNotice(`✕ خطأ: ${data.error || "فشل حفظ الخادم"}`);
      }
    } catch (err: any) {
      setServerNotice(`✕ خطأ: ${err.message}`);
    } finally {
      setSavingNewServer(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الخادم من مجموعة الإرسال؟")) return;
    try {
      const res = await fetch(`/api/settings/email-servers?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchEmailServers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestSpecificServer = async (server: EmailServer) => {
    const recipient = serverTestRecipient[server.id] || testEmail || server.email;
    if (!recipient) {
      setServerTestStatus((prev) => ({
        ...prev,
        [server.id]: { success: false, msg: "أدخل بريد مستلم للتجربة أولاً" },
      }));
      return;
    }
    setTestingServerId(server.id);
    setServerTestStatus((prev) => ({ ...prev, [server.id]: { success: false, msg: "جاري الفحص..." } }));
    try {
      const res = await fetch("/api/settings/email-servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: server.id,
          recipientEmail: recipient,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setServerTestStatus((prev) => ({
          ...prev,
          [server.id]: { success: true, msg: "✓ الاتصال والإرسال ناجح!" },
        }));
      } else {
        setServerTestStatus((prev) => ({
          ...prev,
          [server.id]: { success: false, msg: `✕ ${data.error || "فشل الاتصال"}` },
        }));
      }
    } catch (err: any) {
      setServerTestStatus((prev) => ({
        ...prev,
        [server.id]: { success: false, msg: `✕ ${err.message}` },
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
        if (data.tickets.length > 0 && !selectedTicket) {
          setSelectedTicket(data.tickets[0]);
          loadEmailPreview(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch("/api/settings/email");
      const data = await res.json();
      if (data.settings) {
        setEmailSettings((prev) => ({
          ...prev,
          ...data.settings,
          delayBetweenEmailsMs: data.settings.delayBetweenEmailsMs ?? 500,
        }));
        if (data.settings.delayBetweenEmailsMs) {
          setCampaignDelayMs(data.settings.delayBetweenEmailsMs);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmailPreview = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/email?format=json`);
      const data = await res.json();
      if (data.html) setEmailHtml(data.html);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchEmailSettings();
    fetchEmailServers();
  }, []);

  // Delivery statistics calculation
  const stats = useMemo(() => {
    const total = tickets.length;
    const delivered = tickets.filter(
      (t) => t.emailStatus === "delivered" || t.emailStatus === "sent"
    ).length;
    const failed = tickets.filter((t) => t.emailStatus === "failed").length;
    const pending = tickets.filter(
      (t) => !t.emailStatus || t.emailStatus === "pending"
    ).length;
    return { total, delivered, failed, pending };
  }, [tickets]);

  // Filtered recipients for the tracker table
  const filteredRecipients = useMemo(() => {
    return tickets.filter((t) => {
      const q = recipientSearch.toLowerCase().trim();
      if (q) {
        const match =
          (t.attendeeName && t.attendeeName.toLowerCase().includes(q)) ||
          (t.attendeeEmail && t.attendeeEmail.toLowerCase().includes(q)) ||
          (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (recipientFilter === "delivered") {
        return t.emailStatus === "delivered" || t.emailStatus === "sent";
      }
      if (recipientFilter === "failed") {
        return t.emailStatus === "failed";
      }
      if (recipientFilter === "pending") {
        return !t.emailStatus || t.emailStatus === "pending";
      }
      return true;
    });
  }, [tickets, recipientSearch, recipientFilter]);

  // 1. Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes("@")) return;

    setIsSendingTest(true);
    setTestResultMsg("");

    try {
      const res = await fetch("/api/campaigns/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTest: true,
          testEmailRecipient: testEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.mockMode) {
          setTestResultMsg("✓ تم إرسال التجربة بنجاح (وضع Mock التجريبي). لربط إيميلك الفعلي، اضغط على 'إعدادات ربط البريد'.");
        } else {
          setTestResultMsg(`✓ تم إرسال التذكرة التجريبية بنجاح إلى ${testEmail} عبر ${data.provider?.toUpperCase()}! تفقد صندوق الوارد (Inbox).`);
        }
      } else {
        setTestResultMsg(`✕ خطأ: ${data.error || "فشل إرسال الإيميل"}`);
      }
    } catch (err: any) {
      setTestResultMsg(`✕ خطأ: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // 2. Launch Bulk Campaign in Batches with Delay and Unsent Filter
  const handleLaunchCampaign = async () => {
    setShowConfirmModal(false);
    setIsSendingBulk(true);
    setCampaignResultMsg("");
    setServerSentTally({});
    setCurrentSendingServer(null);

    const targetList = sendOnlyUnsent
      ? tickets.filter((t) => t.emailStatus !== "delivered" && t.emailStatus !== "sent")
      : tickets;

    setBulkProgress({ sent: 0, failed: 0, total: targetList.length });

    try {
      let remaining = targetList.length;
      let totalSent = 0;
      let totalFailed = 0;

      while (remaining > 0) {
        const res = await fetch("/api/campaigns/send-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            limit: 15,
            delayMs: campaignDelayMs,
            onlyUnsent: sendOnlyUnsent,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "توقف الإرسال بسبب خطأ في الخادم");
        }

        totalSent += data.sentCount;
        totalFailed += data.failedCount;
        remaining = data.remainingCount;

        // Accumulate server usage tallies
        if (data.sentByServer) {
          setServerSentTally((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(data.sentByServer as Record<string, number>)) {
              next[k] = (next[k] || 0) + v;
            }
            return next;
          });
        }
        if (data.results && data.results.length > 0) {
          const lastItem = data.results[data.results.length - 1];
          if (lastItem.sentVia) setCurrentSendingServer(lastItem.sentVia);
        }

        // Instantly update recipient statuses in state
        if (data.results && Array.isArray(data.results)) {
          setTickets((prev) =>
            prev.map((t) => {
              const resItem = data.results.find((r: any) => r.ticketId === t.id);
              if (resItem) {
                return {
                  ...t,
                  emailStatus: resItem.status,
                  emailSentAt: resItem.sentAt,
                  emailError: resItem.error,
                };
              }
              return t;
            })
          );
        }

        setBulkProgress({
          sent: totalSent,
          failed: totalFailed,
          total: targetList.length,
        });

        if (data.batchSize === 0 || remaining === 0) break;
      }

      setCampaignResultMsg(`✓ اكتملت الحملة بنجاح: تم إرسال ${totalSent} بريد بنجاح، وتعثر ${totalFailed} بريد.`);
      fetchTickets();
      fetchEmailServers();
    } catch (err: any) {
      setCampaignResultMsg(`✕ توقفت الحملة: ${err.message}`);
    } finally {
      setIsSendingBulk(false);
    }
  };

  // 3. Selection Handlers for Batch Group Sending
  const toggleSelectAllFiltered = () => {
    if (selectedTicketIds.size >= filteredRecipients.length && filteredRecipients.length > 0) {
      setSelectedTicketIds(new Set());
      setLastSelectedIdx(null);
    } else {
      setSelectedTicketIds(new Set(filteredRecipients.map((t) => t.id)));
      setLastSelectedIdx(0);
    }
  };

  const handleToggleSelectRow = (ticketId: string, index: number, event: React.MouseEvent) => {
    const isShift = Boolean(event.shiftKey);
    const next = new Set(selectedTicketIds);

    if (isShift && lastSelectedIdx !== null) {
      // User pressed Shift and already has an anchor:
      // Select all rows between the anchor and the current index!
      const start = Math.min(lastSelectedIdx, index);
      const end = Math.max(lastSelectedIdx, index);
      for (let i = start; i <= end; i++) {
        if (filteredRecipients[i]) {
          next.add(filteredRecipients[i].id);
        }
      }
      setSelectedTicketIds(next);
    } else {
      // Normal click, OR first click even if Shift was held
      if (next.has(ticketId) && !isShift) {
        next.delete(ticketId);
        if (lastSelectedIdx === index) {
          setLastSelectedIdx(null);
        }
      } else {
        next.add(ticketId);
        setLastSelectedIdx(index);
      }
      setSelectedTicketIds(next);
    }
  };

  const selectFirstN = (n: number) => {
    const target = filteredRecipients.slice(0, n);
    setSelectedTicketIds(new Set(target.map((t) => t.id)));
  };

  const selectOnlyUnsentInView = () => {
    const unsent = filteredRecipients.filter(
      (t) => t.emailStatus !== "delivered" && t.emailStatus !== "sent"
    );
    setSelectedTicketIds(new Set(unsent.map((t) => t.id)));
  };

  const selectOnlyFailedInView = () => {
    const failed = filteredRecipients.filter((t) => t.emailStatus === "failed");
    setSelectedTicketIds(new Set(failed.map((t) => t.id)));
  };

  // 4. Send Selected Group in Batches with Delay
  const handleSendSelectedGroup = async () => {
    if (selectedTicketIds.size === 0) return;
    setShowSelectedConfirmModal(false);
    setIsSendingSelectedGroup(true);
    setCampaignResultMsg("");
    setServerSentTally({});
    setCurrentSendingServer(null);

    const idsList = Array.from(selectedTicketIds);
    const chunkSize = selectedBatchSize || 10;
    const totalBatches = Math.ceil(idsList.length / chunkSize);

    setSelectedGroupProgress({
      sent: 0,
      failed: 0,
      total: idsList.length,
      currentBatch: 0,
      totalBatches,
    });

    try {
      let totalSent = 0;
      let totalFailed = 0;

      for (let b = 0; b < totalBatches; b++) {
        const chunk = idsList.slice(b * chunkSize, (b + 1) * chunkSize);

        const res = await fetch("/api/campaigns/send-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketIds: chunk,
            limit: chunk.length,
            delayMs: campaignDelayMs,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "توقف الإرسال بسبب خطأ في الخادم");
        }

        totalSent += data.sentCount;
        totalFailed += data.failedCount;

        // Accumulate server usage tallies
        if (data.sentByServer) {
          setServerSentTally((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(data.sentByServer as Record<string, number>)) {
              next[k] = (next[k] || 0) + v;
            }
            return next;
          });
        }
        if (data.results && data.results.length > 0) {
          const lastItem = data.results[data.results.length - 1];
          if (lastItem.sentVia) setCurrentSendingServer(lastItem.sentVia);
        }

        if (data.results && Array.isArray(data.results)) {
          setTickets((prev) =>
            prev.map((t) => {
              const resItem = data.results.find((r: any) => r.ticketId === t.id);
              if (resItem) {
                return {
                  ...t,
                  emailStatus: resItem.status,
                  emailSentAt: resItem.sentAt,
                  emailError: resItem.error,
                };
              }
              return t;
            })
          );
        }

        setSelectedGroupProgress({
          sent: totalSent,
          failed: totalFailed,
          total: idsList.length,
          currentBatch: b + 1,
          totalBatches,
        });
      }

      setCampaignResultMsg(
        `✓ اكتمل إرسال المجموعة المحددة بنجاح: تم إرسال ${totalSent} بريد بنجاح، وتعثر ${totalFailed}.`
      );
      setSelectedTicketIds(new Set());
      fetchTickets();
      fetchEmailServers();
    } catch (err: any) {
      setCampaignResultMsg(`✕ توقف إرسال المجموعة: ${err.message}`);
    } finally {
      setIsSendingSelectedGroup(false);
    }
  };

  // 5. Resend individual ticket
  const handleResendSingle = async (ticket: TicketData) => {
    try {
      setResendingTicketId(ticket.id);
      const res = await fetch("/api/campaigns/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketIds: [ticket.id],
          limit: 1,
          delayMs: 0,
        }),
      });
      const data = await res.json();
      if (data.results && data.results[0]) {
        const item = data.results[0];
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id
              ? {
                  ...t,
                  emailStatus: item.status,
                  emailSentAt: item.sentAt,
                  emailError: item.error,
                }
              : t
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResendingTicketId(null);
    }
  };

  // 4. Save Email Settings to Database
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsNotice("");
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsNotice("✓ تم حفظ الإعدادات في قاعدة البيانات بنجاح (ستبقى ثابتة ولن تضيع)!");
        if (emailSettings.delayBetweenEmailsMs) {
          setCampaignDelayMs(emailSettings.delayBetweenEmailsMs);
        }
        setTimeout(() => setSettingsNotice(""), 3500);
      } else {
        setSettingsNotice(`✕ خطأ: ${data.error}`);
      }
    } catch (err: any) {
      setSettingsNotice(`✕ خطأ: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // 5. Test Email Settings Connection
  const handleTestConnection = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setSettingsNotice("يرجى كتابة بريدك الإلكتروني في حقل التجربة أولاً لاختبار الاتصال به");
      return;
    }
    setTestingConnection(true);
    setSettingsNotice("");
    try {
      // First save settings to DB
      await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });

      // Then test
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsNotice(`✓ ${data.message}`);
      } else {
        setSettingsNotice(`✕ فشل الاختبار: ${data.error}`);
      }
    } catch (err: any) {
      setSettingsNotice(`✕ فشل الاختبار: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Preset quick fill
  const applyPreset = (preset: "gmail" | "outlook" | "brevo") => {
    if (preset === "gmail") {
      setEmailSettings((prev) => ({
        ...prev,
        provider: "smtp",
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        smtpSecure: true,
      }));
    } else if (preset === "outlook") {
      setEmailSettings((prev) => ({
        ...prev,
        provider: "smtp",
        smtpHost: "smtp.office365.com",
        smtpPort: 587,
        smtpSecure: false,
      }));
    } else if (preset === "brevo") {
      setEmailSettings((prev) => ({
        ...prev,
        provider: "smtp",
        smtpHost: "smtp-relay.brevo.com",
        smtpPort: 587,
        smtpSecure: false,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-6 sm:py-8 text-[#1d1d1f] font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb & Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#7a7a7a]">
            <Link href="/" className="hover:text-[#1d1d1f] flex items-center gap-1 transition-colors">
              <ArrowRight className="h-3 w-3" />
              <span>الرئيسية</span>
            </Link>
            <span>/</span>
            <span className="text-[#0066cc] font-semibold">حملات الإرسال البريدي الجماعي وحالة الوصول</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/attendees"
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] border border-[#e5e5e7] hover:bg-[#fafafc] shadow-2xs transition-colors"
            >
              <span>جدول المسجلين</span>
            </Link>
            <button
              onClick={() => {
                fetchEmailServers();
                setShowServersModal(true);
              }}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6c12e8] to-[#9333ea] hover:opacity-95 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
            >
              <HardDrive className="h-3.5 w-3.5 text-white" />
              <span>خوادم الإرسال المتعددة ({emailServers.filter((s) => s.status === "active").length} نشط)</span>
            </button>
            <button
              onClick={() => {
                fetchEmailSettings();
                setShowSettingsModal(true);
              }}
              className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#1d1d1f] hover:bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-white" />
              <span>إعدادات ربط البريد</span>
            </button>
          </div>
        </div>

        {/* Header Hero Banner */}
        <div className="mb-6 rounded-[22px] bg-white p-5 sm:p-7 border border-[#e5e5e7] shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-[#0066cc] mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>نظام إرسال التذاكر الذكي مع التتبع المباشر وتوزيع الحمل عبر خوادم متعددة</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">
                إرسال تذاكر الحضور عبر البريد الإلكتروني
              </h1>
              <p className="text-xs sm:text-sm text-[#7a7a7a] mt-1 max-w-2xl leading-relaxed">
                تحكم كامل في إرسال التذاكر الرقمية مع فاصل زمني (Delay)، وتوزيع تلقائي على أكثر من حساب بريد لتجاوز حد 550 اليومي، ومتابعة فورية لحالة كل بريد في قاعدة بيانات Supabase.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs font-medium">
              <span className="text-[#7a7a7a]">الخادم المفعل:</span>
              {emailServers.length > 0 ? (
                <button
                  onClick={() => setShowServersModal(true)}
                  className="inline-flex items-center gap-1.5 font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full border border-purple-200 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                  <span>
                    خوادم متعددة: {emailServers.filter((s) => s.status === "active").length} نشط (سعة{" "}
                    {emailServers.reduce((acc, s) => acc + (s.dailyLimit || 450), 0).toLocaleString()} بريد/اليوم)
                  </span>
                </button>
              ) : emailSettings.provider === "smtp" ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SMTP ({emailSettings.smtpUser ? emailSettings.smtpUser.split("@")[0] : "مخصص"})
                </span>
              ) : emailSettings.provider === "resend" ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Resend API
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  وضع المحاكاة (Mock Dev)
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-5 pt-4 border-t border-[#f0f0f0] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-[#f5f5f7] p-2.5">
              <div className="text-[11px] text-[#7a7a7a]">إجمالي التذاكر</div>
              <div className="text-lg font-bold font-mono text-[#1d1d1f]">{stats.total}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 p-2.5">
              <div className="text-[11px] text-emerald-800 font-medium">وصله بنجاح 🟢</div>
              <div className="text-lg font-bold font-mono text-emerald-700">{stats.delivered}</div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200/60 p-2.5">
              <div className="text-[11px] text-red-800 font-medium">تعثر / فشل 🔴</div>
              <div className="text-lg font-bold font-mono text-red-700">{stats.failed}</div>
            </div>
            <div className="rounded-xl bg-neutral-100 p-2.5">
              <div className="text-[11px] text-neutral-600 font-medium">لم يُرسل بعد ⚪</div>
              <div className="text-lg font-bold font-mono text-neutral-700">{stats.pending}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Email Controls & Test Dispatch (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. Test Email Box */}
            <div className="rounded-[18px] bg-white p-5 sm:p-6 border border-[#e5e5e7] shadow-2xs space-y-3.5">
              <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Send className="h-4 w-4 text-[#0066cc]" />
                <span>إرسال بريد تجريبي (Test Email)</span>
              </h2>
              <p className="text-xs text-[#7a7a7a] leading-relaxed">
                تأكد من شكل التذكرة ووصولها إلى صندوق الوارد (Inbox) الأساسي قبل إطلاق الحملة الجماعية لجميع الحضور.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                    أدخل بريدك الإلكتروني لتلقي التجربة:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="anwar@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTest || !testEmail}
                  className="btn-press w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-4 py-2 text-xs font-medium text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري إرسال التجربة...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>إرسال تذكرة تجريبية الآن</span>
                    </>
                  )}
                </button>
              </form>

              {testResultMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${testResultMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  {testResultMsg}
                </div>
              )}
            </div>

            {/* 2. Bulk Campaign Dispatch Box */}
            <div className="rounded-[18px] bg-white p-5 sm:p-6 border border-[#e5e5e7] shadow-2xs space-y-3.5">
              <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#0066cc]" />
                <span>إطلاق حملة الإرسال الجماعية</span>
              </h2>
              <p className="text-xs text-[#7a7a7a] leading-relaxed">
                إرسال منظم في دفعات مع فاصل زمني (Delay) قابل للضبط لضمان التسليم في صندوق الـ Inbox وتجنب حظر السيرفرات.
              </p>

              {/* Delay Controls Box */}
              <div className="rounded-xl bg-[#f5f5f7] p-3.5 border border-[#e5e5e7] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1d1d1f]">الفاصل الزمني بين كل بريد (Delay):</span>
                  <span className="font-mono font-bold text-[#0066cc]">{campaignDelayMs} ms</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "250ms", val: 250 },
                    { label: "500ms", val: 500 },
                    { label: "1 ثانية", val: 1000 },
                    { label: "2 ثانية", val: 2000 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setCampaignDelayMs(item.val)}
                      className={`btn-press py-1 text-center rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        campaignDelayMs === item.val
                          ? "bg-[#0066cc] text-white border-[#0066cc] shadow-2xs"
                          : "bg-white text-neutral-700 border-neutral-200 hover:border-[#0066cc]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Unsent Only Toggle */}
                <label className="flex items-center gap-2 pt-1.5 border-t border-[#e5e5e7] cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={sendOnlyUnsent}
                    onChange={(e) => setSendOnlyUnsent(e.target.checked)}
                    className="rounded border-[#e5e5e7] text-[#0066cc] focus:ring-0 h-4 w-4"
                  />
                  <span className="text-[#1d1d1f] font-medium">
                    إرسال لمن لم يصلهم فقط ({stats.pending + stats.failed} تذكرة)
                  </span>
                </label>
              </div>

              {bulkProgress && (
                <div className="space-y-2 pt-2 border-t border-[#f0f0f0]">
                  <div className="flex justify-between text-xs text-[#7a7a7a]">
                    <span>تقدم الإرسال المباشر:</span>
                    <span className="font-mono font-semibold text-[#1d1d1f]">
                      {bulkProgress.sent + bulkProgress.failed} من {bulkProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-[#0066cc] transition-all duration-300"
                      style={{
                        width: `${bulkProgress.total ? ((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#7a7a7a]">
                    <span className="text-emerald-700 font-medium">✓ وصل: {bulkProgress.sent}</span>
                    <span className="text-red-700 font-medium">✕ فشل: {bulkProgress.failed}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isSendingBulk || (sendOnlyUnsent ? stats.pending + stats.failed === 0 : tickets.length === 0)}
                className="btn-press w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] hover:bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSendingBulk ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري إرسال الدفعات مع الـ Delay...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>
                      {sendOnlyUnsent
                        ? `بدء إرسال التذاكر غير الواصلة (${stats.pending + stats.failed})`
                        : `بدء إرسال تذاكر جميع الحضور (${tickets.length})`}
                    </span>
                  </>
                )}
              </button>

              {campaignResultMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium ${campaignResultMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  {campaignResultMsg}
                </div>
              )}
            </div>

            {/* 3. Anti-Spam Deliverability Tips Card */}
            <div className="rounded-[18px] bg-white p-5 border border-[#e5e5e7] shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-[#0066cc]">
                <ShieldCheck className="h-4 w-4" />
                <h3 className="text-xs font-semibold">ضمان بقاء الإعدادات وثبات وصول البريد</h3>
              </div>
              <ul className="text-[11px] text-[#7a7a7a] space-y-1.5 leading-relaxed list-disc list-inside">
                <li>
                  <strong className="text-[#1d1d1f]">الحفظ الدائم:</strong> تُحفظ جميع الإعدادات وكلمات المرور داخل جدول <code className="bg-[#f5f5f7] px-1 py-0.5 rounded text-[10px]">email_settings</code> في قاعدة البيانات بشكل دائم وثابت.
                </li>
                <li>
                  <strong className="text-[#1d1d1f]">الفاصل الزمني (Delay):</strong> يمنع حظر Gmail أو Outlook لسيرفرك بسبب إرسال كميات كبيرة في ثانية واحدة.
                </li>
                <li>
                  <strong className="text-[#1d1d1f]">تسجيل حالة الوصول:</strong> يتم تحديث كل مشارك فوراً بـ 🟢 "وصله" مع توقيت الإرسال أو 🔴 "فشل" مع كود الخطأ.
                </li>
              </ul>
            </div>

          </div>

          {/* Right Column: Dynamic Tabs: (1) Recipients & Delivery Status, (2) Ticket Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* Tab Header Navigation */}
            <div className="flex items-center justify-between border-b border-[#e5e5e7] pb-2">
              <div className="flex items-center gap-1.5 bg-[#f5f5f7] p-1 rounded-full border border-[#e5e5e7]">
                <button
                  type="button"
                  onClick={() => setActiveTab("recipients")}
                  className={`btn-press px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    activeTab === "recipients"
                      ? "bg-white text-[#1d1d1f] shadow-2xs"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  حالة وصول البريد للمستلمين ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`btn-press px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white text-[#1d1d1f] shadow-2xs"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  معاينة شكل التذكرة (Preview)
                </button>
              </div>

              <button
                onClick={fetchTickets}
                title="تحديث البيانات"
                className="btn-press p-1.5 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#0066cc]" : ""}`} />
              </button>
            </div>

            {/* TAB 1: RECIPIENTS & DELIVERY STATUS TRACKER */}
            {activeTab === "recipients" && (
              <div className="rounded-[22px] bg-white p-4 sm:p-5 border border-[#e5e5e7] shadow-2xs space-y-3.5">
                
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو البريد أو التذكرة..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] pr-8 pl-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                    {[
                      { key: "all", label: `الكل (${stats.total})` },
                      { key: "delivered", label: `وصله 🟢 (${stats.delivered})` },
                      { key: "failed", label: `فشل 🔴 (${stats.failed})` },
                      { key: "pending", label: `لم يُرسل ⚪ (${stats.pending})` },
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setRecipientFilter(f.key as any)}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          recipientFilter === f.key
                            ? "bg-[#1d1d1f] text-white"
                            : "bg-[#f5f5f7] text-[#7a7a7a] hover:bg-neutral-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Batch Selection Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] bg-[#fafafc] p-2 rounded-xl border border-[#f0f0f0]">
                  <span className="text-[#7a7a7a] font-semibold ml-1">تحديد مجموعة:</span>
                  <button
                    type="button"
                    onClick={() => selectFirstN(10)}
                    className="btn-press px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 font-semibold border border-neutral-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    أول 10 صفوف
                  </button>
                  <button
                    type="button"
                    onClick={() => selectFirstN(25)}
                    className="btn-press px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 font-semibold border border-neutral-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    أول 25 صف
                  </button>
                  <button
                    type="button"
                    onClick={() => selectFirstN(50)}
                    className="btn-press px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 font-semibold border border-neutral-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    أول 50 صف
                  </button>
                  <button
                    type="button"
                    onClick={selectOnlyUnsentInView}
                    className="btn-press px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 cursor-pointer transition-colors"
                  >
                    غير المرسل لهم
                  </button>
                  <button
                    type="button"
                    onClick={selectOnlyFailedInView}
                    className="btn-press px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-800 font-semibold border border-red-200 cursor-pointer transition-colors"
                  >
                    المتعثرين
                  </button>
                  {selectedTicketIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTicketIds(new Set())}
                      className="btn-press px-2.5 py-1 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-medium cursor-pointer transition-colors mr-auto"
                    >
                      إلغاء التحديد ({selectedTicketIds.size})
                    </button>
                  )}
                </div>

                {/* Selected Action Bar (Active when 1 or more tickets are selected) */}
                {selectedTicketIds.size > 0 && (
                  <div className="rounded-2xl bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] text-white p-3.5 sm:p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center font-bold font-mono text-sm">
                        {selectedTicketIds.size}
                      </div>
                      <div>
                        <div className="font-bold text-sm">
                          تم تحديد {selectedTicketIds.size} تذكرة للإرسال
                        </div>
                        <div className="text-[11px] text-purple-200">
                          اضغط Shift عند النقر على المربع لتحديد نطاق من الصفوف فوراً
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                      {/* Batch Size Selector */}
                      <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-full text-xs border border-white/10">
                        <span className="text-purple-200 text-[11px]">حجم الدفعة:</span>
                        <select
                          value={selectedBatchSize}
                          onChange={(e) => setSelectedBatchSize(Number(e.target.value))}
                          className="bg-transparent text-white font-bold font-mono text-xs focus:outline-none cursor-pointer"
                        >
                          <option value={5} className="text-black">5 تذاكر</option>
                          <option value={10} className="text-black">10 تذاكر</option>
                          <option value={15} className="text-black">15 تذكرة</option>
                          <option value={25} className="text-black">25 تذكرة</option>
                          <option value={50} className="text-black">50 تذكرة</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSelectedConfirmModal(true)}
                        disabled={isSendingSelectedGroup}
                        className="btn-press inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>إرسال للمجموعة المحددة ({selectedTicketIds.size})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTicketIds(new Set())}
                        className="btn-press rounded-full bg-white/10 hover:bg-white/20 px-3 py-2 text-xs text-purple-200 hover:text-white transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* Recipients List Table */}
                <div className="overflow-x-auto max-h-[560px] overflow-y-auto border border-[#f0f0f0] rounded-xl scrollbar-thin">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#fafafc] border-b border-[#e5e5e7] text-[#7a7a7a] z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <button
                            type="button"
                            onClick={toggleSelectAllFiltered}
                            className="text-[#7a7a7a] hover:text-[#1d1d1f] cursor-pointer inline-flex items-center justify-center"
                            title="تحديد الكل / إلغاء التحديد"
                          >
                            {selectedTicketIds.size > 0 &&
                            selectedTicketIds.size >= filteredRecipients.length ? (
                              <CheckSquare className="h-4 w-4 text-[#6c12e8]" />
                            ) : selectedTicketIds.size > 0 ? (
                              <div className="h-4 w-4 rounded bg-[#6c12e8] flex items-center justify-center text-white text-[9px] font-bold">
                                -
                              </div>
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                        <th className="p-2.5 font-semibold text-[#1d1d1f] w-10 text-center">#</th>
                        <th className="p-2.5 font-semibold text-[#1d1d1f]">المشارك</th>
                        <th className="p-2.5 font-semibold text-[#1d1d1f]">البريد الإلكتروني</th>
                        <th className="p-2.5 font-semibold text-[#1d1d1f] text-center w-28">حالة التوصيل</th>
                        <th className="p-2.5 font-semibold text-[#1d1d1f] text-center w-20">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f0]">
                      {loading && tickets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-xs text-[#7a7a7a]">
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-[#0066cc] mb-1.5" />
                            جاري تحميل التذاكر وحالات التوصيل...
                          </td>
                        </tr>
                      ) : filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-xs text-[#7a7a7a]">
                            لا توجد تذاكر مطابقة لخيارات البحث والفلاتر
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((ticket, idx) => {
                          const isSelected = selectedTicketIds.has(ticket.id);
                          const isDelivered =
                            ticket.emailStatus === "delivered" || ticket.emailStatus === "sent";
                          const isFailed = ticket.emailStatus === "failed";
                          const isPending = !isDelivered && !isFailed;

                          return (
                            <tr
                              key={ticket.id}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest("button") && !target.closest(".checkbox-trigger")) return;
                                handleToggleSelectRow(ticket.id, idx, e);
                              }}
                              className={`transition-colors select-none cursor-pointer ${
                                isSelected ? "bg-purple-100/80 font-medium" : "hover:bg-[#fafafc]"
                              }`}
                            >
                              <td className="p-2.5 text-center checkbox-trigger">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelectRow(ticket.id, idx, e);
                                  }}
                                  className="text-[#7a7a7a] hover:text-[#1d1d1f] cursor-pointer"
                                  title="تحديد الصف (اضغط Shift مع النقر لتحديد نطاق)"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-[#6c12e8]" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
                              </td>

                              <td className="p-2.5 font-mono text-[11px] text-[#7a7a7a] text-center">
                                {idx + 1}
                              </td>

                              <td className="p-2.5">
                                <div className="font-semibold text-[#1d1d1f] line-clamp-1">
                                  {ticket.attendeeName}
                                </div>
                                <div className="text-[10px] font-mono text-purple-700 font-semibold">
                                  {ticket.ticketNumber}
                                </div>
                              </td>

                              <td className="p-2.5 font-mono text-[11px] text-neutral-600">
                                {ticket.attendeeEmail || "-"}
                              </td>

                              {/* STATUS BADGE */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                {isDelivered ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-semibold">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>وصله ✓</span>
                                    </span>
                                    {ticket.emailSentAt && (
                                      <span className="text-[9.5px] text-[#7a7a7a] mt-0.5" dir="ltr">
                                        {new Date(ticket.emailSentAt).toLocaleTimeString("ar-EG", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    )}
                                  </div>
                                ) : isFailed ? (
                                  <div className="inline-flex flex-col items-center max-w-[130px]">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-semibold">
                                      <XCircle className="h-3 w-3 text-red-600" />
                                      <span>فشل ✕</span>
                                    </span>
                                    {ticket.emailError && (
                                      <span
                                        className="text-[9.5px] text-red-600 truncate max-w-[120px] mt-0.5"
                                        title={ticket.emailError}
                                      >
                                        {ticket.emailError}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 text-neutral-600 px-2 py-0.5 text-[10px] font-medium">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>لم يُرسل</span>
                                  </span>
                                )}
                              </td>

                              {/* ACTIONS */}
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleResendSingle(ticket)}
                                  disabled={resendingTicketId === ticket.id}
                                  title="إعادة إرسال البريد لهذا المشارك الآن"
                                  className="btn-press inline-flex items-center gap-1 text-[10px] font-medium text-[#0066cc] hover:underline cursor-pointer disabled:opacity-50"
                                >
                                  {resendingTicketId === ticket.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                  <span>إرسال</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7a7a7a] pt-1">
                  <span>عرض {filteredRecipients.length} من أصل {tickets.length} تذكرة</span>
                  <span className="text-emerald-700 font-medium">محدث في قاعدة بيانات Supabase</span>
                </div>

              </div>
            )}

            {/* TAB 2: LIVE EMAIL TEMPLATE PREVIEW */}
            {activeTab === "preview" && (
              <div className="rounded-[24px] bg-white p-4 sm:p-6 border border-[#e5e5e7] shadow-2xs flex justify-center">
                {emailHtml ? (
                  <div className="w-full max-w-[400px] overflow-hidden rounded-[20px] border border-[#e5e5e7] shadow-md bg-[#f5f5f7]">
                    <iframe
                      srcDoc={emailHtml}
                      title="Email Preview"
                      className="w-full h-[720px] border-none"
                    />
                  </div>
                ) : (
                  <div className="py-28 text-center text-xs text-[#7a7a7a] flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
                    <span>جاري تحميل قالب البريد...</span>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* MODAL: EMAIL SETTINGS & DATABASE PERSISTENCE */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
            <div className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl border border-[#e5e5e7] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-[#0066cc]" />
                  <h3 className="text-base font-semibold text-[#1d1d1f]">
                    إعدادات ربط البريد الإلكتروني (Email Provider Settings)
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-[#7a7a7a] hover:text-[#1d1d1f] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Highlight to Multi-Server Pool */}
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-[#6c12e8] shrink-0" />
                  <span className="font-semibold text-purple-950">
                    تريد إرسال آلاف التذاكر بدون توقف؟ وزّع الإرسال على أكثر من إيميل:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    fetchEmailServers();
                    setShowServersModal(true);
                  }}
                  className="btn-press shrink-0 px-3.5 py-1.5 rounded-full bg-[#6c12e8] hover:bg-purple-800 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                >
                  إدارة الخوادم المتعددة ({emailServers.filter((s) => s.status === "active").length} نشط) ↗
                </button>
              </div>

              {/* Provider Switch Tabs */}
              <div className="mb-5 flex rounded-full bg-[#f5f5f7] p-1 border border-[#e5e5e7]">
                <button
                  type="button"
                  onClick={() => setEmailSettings((prev) => ({ ...prev, provider: "smtp" }))}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    emailSettings.provider === "smtp"
                      ? "bg-white text-[#1d1d1f] shadow-2xs"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  خادم SMTP شخصي (Gmail / Outlook / دومينك)
                </button>
                <button
                  type="button"
                  onClick={() => setEmailSettings((prev) => ({ ...prev, provider: "resend" }))}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    emailSettings.provider === "resend"
                      ? "bg-white text-[#1d1d1f] shadow-2xs"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  خدمة Resend API
                </button>
                <button
                  type="button"
                  onClick={() => setEmailSettings((prev) => ({ ...prev, provider: "mock" }))}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    emailSettings.provider === "mock"
                      ? "bg-white text-[#1d1d1f] shadow-2xs"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f]"
                  }`}
                >
                  وضع Mock (تجريبي)
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                
                {/* If SMTP is selected */}
                {emailSettings.provider === "smtp" && (
                  <>
                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <span className="text-xs text-[#7a7a7a]">إعداد سريع:</span>
                      <button
                        type="button"
                        onClick={() => applyPreset("gmail")}
                        className="btn-press text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full hover:bg-red-100 cursor-pointer"
                      >
                        Gmail (smtp.gmail.com)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("brevo")}
                        className="btn-press text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full hover:bg-emerald-100 cursor-pointer"
                      >
                        Brevo (300 بريد/يوم مجاناً)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("outlook")}
                        className="btn-press text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full hover:bg-blue-100 cursor-pointer"
                      >
                        Outlook / Office 365
                      </button>
                    </div>

                    {/* Notice for Gmail limit */}
                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 leading-relaxed mb-3">
                      <strong>💡 في حال ظهور خطأ (Daily user sending limit exceeded):</strong>
                      <p className="mt-0.5">
                        حسابات Gmail الشخصية تضع حداً أقصى بين 100 إلى 500 بريد كل 24 ساعة. لتجاوز ذلك فوراً وبدون انتظار، يمكنك ببساطة إدخال حساب Gmail آخر وكلمة مرور تطبيقات جديدة، أو استخدام خدمة Brevo المجانية (300 بريد يومياً عبر smtp-relay.brevo.com).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                          خادم SMTP (Host):
                        </label>
                        <input
                          type="text"
                          required
                          value={emailSettings.smtpHost || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                          placeholder="smtp.gmail.com"
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                          المنفذ (Port):
                        </label>
                        <input
                          type="number"
                          required
                          value={emailSettings.smtpPort || 465}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: Number(e.target.value) })}
                          placeholder="465 أو 587"
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                          البريد الإلكتروني (Username):
                        </label>
                        <input
                          type="email"
                          required
                          value={emailSettings.smtpUser || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                          placeholder="yourname@gmail.com"
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1 flex items-center justify-between">
                          <span>كلمة المرور / App Password:</span>
                          <span className="text-[10px] text-[#0066cc] font-normal">مشفرة بأمان</span>
                        </label>
                        <input
                          type="password"
                          value={emailSettings.smtpPassword || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                          placeholder="كلمة مرور التطبيق (16 حرف)"
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                          اسم المرسل الظاهر للحضور (From Name):
                        </label>
                        <input
                          type="text"
                          value={emailSettings.fromName || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                          placeholder="ملتقى الجيل القادم - Next Gen"
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                          بريد المرسل (From Email):
                        </label>
                        <input
                          type="email"
                          value={emailSettings.fromEmail || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                          placeholder="anwar@example.com"
                          className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* If Resend is selected */}
                {emailSettings.provider === "resend" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        مفتاح Resend API Key:
                      </label>
                      <input
                        type="password"
                        value={emailSettings.resendApiKey || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, resendApiKey: e.target.value })}
                        placeholder="re_xxxxxxxxxxxxxx"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1d1d1f] mb-1">
                        بريد الإرسال المعتمد (From Email):
                      </label>
                      <input
                        type="text"
                        value={emailSettings.resendFromEmail || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, resendFromEmail: e.target.value })}
                        placeholder="Next Gen Forum <tickets@yourdomain.com>"
                        className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Universal Delay & Anti-Spam Setting (Saved in Supabase DB) */}
                <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-[#1d1d1f]">
                      الفاصل الزمني الافتراضي بين الرسائل (Delay بالمللي ثانية):
                    </label>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">
                      {emailSettings.delayBetweenEmailsMs ?? 500} ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      step={100}
                      value={emailSettings.delayBetweenEmailsMs ?? 500}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, delayBetweenEmailsMs: Number(e.target.value) })
                      }
                      className="w-28 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-1.5 text-xs font-mono text-[#1d1d1f] focus:border-[#0066cc] focus:bg-white focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "250ms (سريع)", val: 250 },
                        { label: "500ms (افتراضي)", val: 500 },
                        { label: "1000ms (1 ثانية)", val: 1000 },
                        { label: "2000ms (2 ثانية)", val: 2000 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setEmailSettings({ ...emailSettings, delayBetweenEmailsMs: p.val })}
                          className={`text-[10.5px] px-2 py-1 rounded-full border transition-all cursor-pointer ${
                            (emailSettings.delayBetweenEmailsMs ?? 500) === p.val
                              ? "bg-[#0066cc] text-white border-[#0066cc]"
                              : "bg-[#f5f5f7] text-[#1d1d1f] border-[#e5e5e7] hover:bg-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10.5px] text-[#7a7a7a]">
                    يتم تخزين هذه الإعدادات ثابته في الداتا بيز (Supabase) حتى تظل محفوظة بشكل دائم بعد كل تعديل.
                  </p>
                </div>

                {settingsNotice && (
                  <div className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${settingsNotice.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {settingsNotice}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0066cc] px-4 py-2 text-xs font-medium text-[#0066cc] hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {testingConnection ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>اختبار الاتصال وإرسال تجربة فورية</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="rounded-full px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] cursor-pointer"
                    >
                      إغلاق
                    </button>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-5 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {savingSettings ? "جاري الحفظ..." : "حفظ الإعدادات في الداتا بيز"}
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM BULK DISPATCH */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl border border-[#e5e5e7] animate-in fade-in zoom-in-95 text-center space-y-3">
              <Mail className="mx-auto h-10 w-10 text-[#0066cc] mb-1" />
              <h3 className="text-base font-semibold text-[#1d1d1f]">
                تأكيد إرسال {sendOnlyUnsent ? stats.pending + stats.failed : tickets.length} تذكرة إلكترونية؟
              </h3>
              <p className="text-xs text-[#7a7a7a] leading-relaxed">
                سيتم إرسال تذاكر الحضور بفاصل زمني {campaignDelayMs} مللي ثانية بين كل بريد لضمان أعلى نسبة تسليم في صندوق الـ Inbox وتحديث حالة كل تذكرة تلقائياً.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="rounded-full px-4 py-2 text-xs font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleLaunchCampaign}
                  className="btn-press rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-6 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  تأكيد وبدء الحملة الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM SELECTED GROUP DISPATCH */}
        {showSelectedConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div dir="rtl" className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl border border-neutral-200 text-[#1d1d1f]">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#6c12e8] to-[#9333ea] text-white flex items-center justify-center shadow-xs">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1d1d1f]">
                      تأكيد إرسال المجموعة المحددة
                    </h3>
                    <p className="text-xs text-[#7a7a7a]">
                      سيتم إرسال {selectedTicketIds.size} تذكرة على دفعات منظمة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSelectedConfirmModal(false)}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#7a7a7a]">إجمالي التذاكر المحددة:</span>
                    <span className="font-bold font-mono text-[#6c12e8] text-base">{selectedTicketIds.size} تذكرة</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#7a7a7a]">حجم كل دفعة (Batch Size):</span>
                    <span className="font-semibold bg-white px-2 py-0.5 rounded border border-neutral-200">
                      {selectedBatchSize} تذاكر في الدفعة
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#7a7a7a]">عدد الدفعات المتوقع:</span>
                    <span className="font-semibold font-mono text-purple-900">
                      {Math.ceil(selectedTicketIds.size / selectedBatchSize)} دفعات
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#7a7a7a]">الفاصل الزمني بين الرسائل (Delay):</span>
                    <span className="font-semibold font-mono text-emerald-700">{campaignDelayMs} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11.5px] text-purple-950 leading-relaxed">
                  ✓ سيتم إرسال التذكرة الإلكترونية الرسمية بالباركود وتفاصيل الفعالية، وتحديث حالة التوصيل فورياً إلى (وصله ✓) في قاعدة البيانات.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => setShowSelectedConfirmModal(false)}
                    className="btn-press px-4 py-2 rounded-full border border-neutral-200 text-[#7a7a7a] hover:bg-neutral-50 text-xs font-semibold cursor-pointer"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={handleSendSelectedGroup}
                    className="btn-press px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6c12e8] to-[#4a0bb8] hover:opacity-95 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>ابدأ إرسال المجموعة الآن ({selectedTicketIds.size})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: LIVE PROGRESS (FOR BULK CAMPAIGN OR SELECTED GROUP) */}
        {((isSendingSelectedGroup && selectedGroupProgress) || (isSendingBulk && bulkProgress)) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div dir="rtl" className="w-full max-w-lg rounded-[28px] bg-white p-6 sm:p-7 shadow-2xl border border-neutral-200 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-purple-100 text-[#6c12e8] flex items-center justify-center mx-auto shadow-inner">
                <RefreshCw className="h-7 w-7 animate-spin text-[#6c12e8]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f]">
                  {isSendingSelectedGroup ? "جاري إرسال المجموعة المحددة..." : "جاري إرسال الحملة الجماعية..."}
                </h3>
                <p className="text-xs text-[#7a7a7a] mt-1 font-mono">
                  {isSendingSelectedGroup && selectedGroupProgress
                    ? `الدفعة ${selectedGroupProgress.currentBatch} من أصل ${selectedGroupProgress.totalBatches}`
                    : `الفاصل الزمني: ${campaignDelayMs}ms للحماية من الـ Spam`}
                </p>
              </div>

              {/* Real-time Current Sender Account Indicator */}
              {currentSendingServer && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-900 text-xs font-mono font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>الآن يرسل عبر الخادم:</span>
                  <span className="font-bold underline">{currentSendingServer}</span>
                </div>
              )}

              {/* Progress Bar with Exact Percentage & Counter */}
              {(() => {
                const total = isSendingSelectedGroup ? (selectedGroupProgress?.total || 1) : (bulkProgress?.total || 1);
                const current = isSendingSelectedGroup
                  ? ((selectedGroupProgress?.sent || 0) + (selectedGroupProgress?.failed || 0))
                  : ((bulkProgress?.sent || 0) + (bulkProgress?.failed || 0));
                const pct = Math.min(100, Math.round((current / Math.max(1, total)) * 100));

                return (
                  <div className="space-y-2">
                    <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden p-0.5 border border-neutral-200">
                      <div
                        className="bg-gradient-to-r from-[#6c12e8] via-purple-600 to-emerald-500 h-2 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-[#7a7a7a]">
                      <span className="font-bold text-[#1d1d1f]">
                        أنت حالياً في التذكرة: {current} من إجمالي {total}
                      </span>
                      <span className="font-bold text-[#6c12e8] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Sent vs Failed Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-emerald-800 font-bold font-mono">
                  تم الإرسال بنجاح: {isSendingSelectedGroup ? selectedGroupProgress?.sent : bulkProgress?.sent} ✓
                </div>
                <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-red-800 font-bold font-mono">
                  تعثر / فشل: {isSendingSelectedGroup ? selectedGroupProgress?.failed : bulkProgress?.failed} ✕
                </div>
              </div>

              {/* LIVE MULTI-ACCOUNT SENDER DISTRIBUTION TALLY */}
              {Object.keys(serverSentTally).length > 0 && (
                <div className="rounded-2xl bg-neutral-50 p-3.5 border border-neutral-200 text-xs text-right space-y-2 mt-2">
                  <div className="font-semibold text-neutral-700 flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-[#6c12e8]" />
                      <span>توزيع الإرسال بين الخوادم (Live Email Pool Tally):</span>
                    </span>
                    <span className="text-[#6c12e8] font-mono font-bold">
                      {Object.values(serverSentTally).reduce((a, b) => a + b, 0)} بريد تم توزيعه
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                    {Object.entries(serverSentTally).map(([srvEmail, count]) => (
                      <div
                        key={srvEmail}
                        className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-neutral-200 shadow-2xs font-mono text-xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[240px]">
                          <span className="text-purple-600">✉️</span>
                          <span className="truncate text-neutral-800 font-medium font-sans">
                            {srvEmail}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          {count} أُرسل منه ✓
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: MULTI-ACCOUNT EMAIL SERVERS MANAGEMENT */}
        {showServersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div dir="rtl" className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[28px] bg-white p-6 sm:p-7 shadow-2xl border border-neutral-200 text-[#1d1d1f] space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#6c12e8] to-[#9333ea] text-white flex items-center justify-center shadow-xs">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1d1d1f]">
                      إدارة خوادم البريد المتعددة (Multi-Account Pool)
                    </h3>
                    <p className="text-xs text-[#7a7a7a]">
                      توزيع الإرسال بالتناوب وتخطي حد جوجل اليومي (550 Daily Limit) بنظام Round-Robin
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowServersModal(false)}
                  className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Explanatory banner */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-950 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#6c12e8]" />
                  <span>كيف تعمل ميزة توزيع الإرسال التلقائي؟</span>
                </div>
                <p className="text-[11.5px] text-purple-900">
                  عند إضافة أكثر من حساب Gmail (أو أي SMTP آخر)، يقوم السيرفر بتوزيع التذاكر عليهم بالتناوب (Round-Robin). إذا اقترب حساب أو وصل لحد 550 اليومي، يتجاوزه فوراً وينتقل للحساب التالي تلقائياً لضمان عدم توقف الحملة نهائياً. يتم حفظ كافة الحسابات والعدادات في قاعدة بيانات Supabase بشكل دائم.
                </p>
              </div>

              {/* Existing Servers List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
                    <Server className="h-4 w-4 text-[#6c12e8]" />
                    <span>الخوادم المسجلة في المجموعة ({emailServers.length}):</span>
                  </h4>
                  <button
                    onClick={fetchEmailServers}
                    disabled={loadingEmailServers}
                    className="text-xs text-[#6c12e8] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingEmailServers ? "animate-spin" : ""}`} />
                    <span>تحديث العدادات</span>
                  </button>
                </div>

                {emailServers.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
                    لا توجد خوادم بريد مسجلة حتى الآن. استخدم النموذج بالأسفل لإضافة أول حساب Gmail.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emailServers.map((server) => {
                      const pct = Math.min(
                        100,
                        Math.round(((server.todaySent || 0) / Math.max(1, server.dailyLimit || 450)) * 100)
                      );
                      const isLimitReached = server.status === "limit_reached" || (server.todaySent || 0) >= (server.dailyLimit || 450);

                      return (
                        <div
                          key={server.id}
                          className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-3 transition-all hover:bg-neutral-50 hover:border-neutral-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-[#1d1d1f] truncate">
                                {server.name}
                              </div>
                              <div className="text-[11px] font-mono text-[#7a7a7a] truncate" dir="ltr">
                                {server.email}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isLimitReached
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : server.status === "active"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-red-50 text-red-800 border-red-200"
                              }`}
                            >
                              {isLimitReached
                                ? "بلغ الحد اليومي 550"
                                : server.status === "active"
                                ? "نشط ✓"
                                : "خطأ ✕"}
                            </span>
                          </div>

                          {/* Consumption Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10.5px] font-mono text-[#7a7a7a]">
                              <span>الإرسال اليوم:</span>
                              <span className="font-bold text-[#1d1d1f]">
                                {server.todaySent || 0} / {server.dailyLimit || 450} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  isLimitReached ? "bg-amber-500" : "bg-[#6c12e8]"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-neutral-500 pt-0.5">
                              <span>إجمالي كل الوقت: {server.totalSent || 0}</span>
                              {server.lastSentAt && (
                                <span>
                                  آخر إرسال: {new Date(server.lastSentAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Test connection row */}
                          <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <input
                                type="email"
                                placeholder="بريد للاختبار..."
                                value={serverTestRecipient[server.id] || ""}
                                onChange={(e) =>
                                  setServerTestRecipient((prev) => ({
                                    ...prev,
                                    [server.id]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[11px] font-mono text-[#1d1d1f] focus:outline-none focus:border-[#6c12e8]"
                              />
                              <button
                                type="button"
                                onClick={() => handleTestSpecificServer(server)}
                                disabled={testingServerId === server.id}
                                className="btn-press shrink-0 px-2.5 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-[10.5px] font-semibold text-neutral-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {testingServerId === server.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                                <span>فحص</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteServer(server.id)}
                              className="btn-press p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                              title="حذف الخادم"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {serverTestStatus[server.id] && (
                            <div
                              className={`text-[10.5px] px-2 py-1 rounded-md font-mono ${
                                serverTestStatus[server.id].success
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-red-50 text-red-800 border border-red-200"
                              }`}
                            >
                              {serverTestStatus[server.id].msg}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Server Form */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4 sm:p-5 space-y-3">
                <h4 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#6c12e8]" />
                  <span>إضافة حساب بريد إلكتروني جديد إلى المجموعة (Add New Pool Server):</span>
                </h4>

                <form onSubmit={handleCreateServer} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                        اسم الحساب التعريفي (Nickname):
                      </label>
                      <input
                        type="text"
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="مثال: حساب جيميل 2 - أنور"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#6c12e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                        البريد الإلكتروني (Email Address): *
                      </label>
                      <input
                        type="email"
                        required
                        value={newServerEmail}
                        onChange={(e) => setNewServerEmail(e.target.value)}
                        placeholder="anwar.account2@gmail.com"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:outline-none focus:border-[#6c12e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1 flex items-center justify-between">
                        <span>كلمة مرور التطبيق (16-char App Password): *</span>
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#6c12e8] underline font-normal"
                        >
                          توليد من Google ↗
                        </a>
                      </label>
                      <input
                        type="password"
                        required
                        value={newServerPassword}
                        onChange={(e) => setNewServerPassword(e.target.value)}
                        placeholder="كلمة المرور المكونة من 16 حرف"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:outline-none focus:border-[#6c12e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                        الحد اليومي المسموح (Daily Limit):
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={2000}
                        value={newServerLimit}
                        onChange={(e) => setNewServerLimit(Number(e.target.value))}
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-[#1d1d1f] focus:outline-none focus:border-[#6c12e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-500 text-[11px]">
                    <div>
                      <span>خادم SMTP: </span>
                      <strong className="font-mono text-neutral-800">smtp.gmail.com:465 (SSL)</strong>
                    </div>
                    <div className="text-left sm:text-right">
                      <span>يتم التخزين بأمان في Supabase PostgreSQL</span>
                    </div>
                  </div>

                  {serverNotice && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium ${
                        serverNotice.startsWith("✓")
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {serverNotice}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingNewServer}
                      className="btn-press px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6c12e8] to-[#9333ea] hover:opacity-95 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingNewServer ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>جاري الحفظ في الداتا بيز...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>حفظ الخادم في الداتا بيز وإضافته للمجموعة</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowServersModal(false)}
                  className="rounded-full px-5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
