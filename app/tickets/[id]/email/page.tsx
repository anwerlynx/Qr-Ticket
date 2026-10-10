"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Copy, Check, ExternalLink, Smartphone, Monitor } from "lucide-react";

export default function TicketEmailPreviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("mobile");

  useEffect(() => {
    async function loadEmail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tickets/${id}/email?format=json`);
        const data = await res.json();
        setHtml(data.html || "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadEmail();
  }, [id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/tickets/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى التذكرة الرقمية</span>
          </Link>
          <h1 className="text-2xl font-black text-neutral-900">
            معاينة قالب البريد الإلكتروني (Email Format)
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            كود HTML متوافق 100% مع Gmail و Outlook و Apple Mail مع Inline CSS وجداول Bulletproof Tables.
          </p>
        </div>

        {/* Action buttons & Viewport toggles */}
        <div className="flex items-center gap-2">
          {/* Viewport switch */}
          <div className="flex items-center rounded-full bg-[#f5f5f7] p-1 border border-[#e5e5e7]">
            <button
              onClick={() => setViewport("mobile")}
              className={`btn-press flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewport === "mobile"
                  ? "bg-white text-[#1d1d1f] shadow-2xs font-semibold"
                  : "text-[#7a7a7a] hover:text-[#1d1d1f]"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>جوال</span>
            </button>
            <button
              onClick={() => setViewport("desktop")}
              className={`btn-press flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewport === "desktop"
                  ? "bg-white text-[#1d1d1f] shadow-2xs font-semibold"
                  : "text-[#7a7a7a] hover:text-[#1d1d1f]"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>شاشة</span>
            </button>
          </div>

          {/* Copy HTML */}
          <button
            onClick={handleCopy}
            disabled={!html}
            className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#0066cc] hover:bg-[#0071e3] px-4 py-2 text-xs font-medium text-white shadow-2xs transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "تم النسخ!" : "نسخ كود HTML"}</span>
          </button>

          {/* Open Raw in new tab */}
          <a
            href={`/api/tickets/${id}/email`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press inline-flex items-center gap-1 rounded-full bg-white border border-[#e5e5e7] px-3.5 py-2 text-xs font-medium text-[#1d1d1f] hover:bg-[#fafafc] transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#7a7a7a]" />
            <span>عرض المصدر</span>
          </a>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center rounded-[24px] bg-[#f5f5f7] p-4 sm:p-8 border border-[#e5e5e7]">
        {loading ? (
          <div className="py-24 text-center text-xs text-[#7a7a7a]">
            جاري تحضير وتصيير بريد التذكرة...
          </div>
        ) : (
          <div
            className={`transition-all duration-300 overflow-hidden rounded-[20px] bg-white shadow-lg border border-[#e5e5e7] ${
              viewport === "mobile" ? "w-[390px] max-w-full" : "w-[460px] max-w-full"
            }`}
          >
            <iframe
              srcDoc={html}
              title="Email Ticket Preview"
              className="w-full h-[980px] border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
