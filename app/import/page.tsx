"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Layers,
  Sparkles,
  Users,
  Eye,
} from "lucide-react";
import { ImportColumnMapping, ImportValidationResult } from "@/types/ticket";

type WizardStep = "upload" | "mapping" | "validation" | "complete";

export default function ExcelImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Preview & parsed state
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, any>[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Mapping state
  const [mapping, setMapping] = useState<ImportColumnMapping>({
    nameColumn: "",
    emailColumn: "",
    phoneColumn: "",
    registrationIdColumn: "",
    categoryColumn: "",
  });

  // Validation & import results
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);

  // 1. Handle File Selection and Parsing
  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل قراءة ملف الإكسل");
      }

      setHeaders(data.headers);
      setSampleRows(data.sampleRows);
      setRawRows(data.allRows || data.sampleRows);
      setTotalRows(data.totalRows);
      setMapping(data.suggestedMapping);
      setStep("mapping");
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء معالجة الملف");
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Run Validation & Import
  const handleRunValidation = async () => {
    if (!mapping.nameColumn || !mapping.emailColumn) {
      setErrorMsg("يرجى تحديد عمود الاسم وعمود البريد الإلكتروني على الأقل");
      return;
    }

    setIsValidating(true);
    setErrorMsg("");

    try {
      if (!file) throw new Error("الملف غير متوفر");
      const formData = new FormData();
      formData.append("file", file);

      // Re-read entire file with chosen mapping on server
      const previewRes = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });
      const previewData = await previewRes.json();

      const valRes = await fetch("/api/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: previewData.allRows || previewData.sampleRows || rawRows,
          mapping,
        }),
      });

      const valData = await valRes.json();
      if (!valRes.ok || !valData.success) {
        throw new Error(valData.error || "فشل التحقق من البيانات");
      }

      setValidationResult(valData.validation);
      setStep("validation");
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء التحقق من البيانات");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-neutral-400">
            <Link href="/" className="hover:text-neutral-700">الرئيسية</Link>
            <span>/</span>
            <span className="text-[#8a38f5] font-bold">استيراد المسجلين</span>
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="h-8 w-8 text-[#8a38f5]" />
            <span>معالج استيراد المسجلين من Excel / CSV</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            رفع ملفات التسجيل (مثل Google Forms)، تعيين الأعمدة تلقائياً، والتحقق من عدم تكرار الحسابات قبل الإضافة.
          </p>
        </div>

        {/* Wizard Step Badges */}
        <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-neutral-200 text-xs">
          <span className={`px-3 py-1 rounded-xl font-bold ${step === "upload" ? "bg-purple-100 text-[#8a38f5]" : "text-neutral-400"}`}>
            1. رفع الملف
          </span>
          <span className={`px-3 py-1 rounded-xl font-bold ${step === "mapping" ? "bg-purple-100 text-[#8a38f5]" : "text-neutral-400"}`}>
            2. تعيين الأعمدة
          </span>
          <span className={`px-3 py-1 rounded-xl font-bold ${step === "validation" ? "bg-purple-100 text-[#8a38f5]" : "text-neutral-400"}`}>
            3. المراجعة والاستيراد
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: FILE UPLOAD */}
      {step === "upload" && (
        <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-sm border border-purple-100 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-50 text-[#8a38f5] mb-4">
            <Upload className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2">
            اختر أو اسحب ملف المسجلين
          </h2>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
            ندعم ملفات <span className="font-mono font-bold text-neutral-800">.xlsx</span> و{" "}
            <span className="font-mono font-bold text-neutral-800">.xls</span> و{" "}
            <span className="font-mono font-bold text-neutral-800">.csv</span> المستخرجة من نماذج التسجيل.
          </p>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#8a38f5] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:bg-[#7826e3] transition-all">
            <FileSpreadsheet className="h-5 w-5" />
            <span>{isUploading ? "جاري قراءة الملف..." : "تصفح واختيار الملف من جهازك"}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
          </label>

          <div className="mt-8 border-t border-neutral-100 pt-6 text-xs text-neutral-400">
            🔒 لن يتم إنشاء تذاكر أو إرسال إيميلات أثناء الاستيراد؛ يمكنك مراجعة وتعديل كل شيء بأمان.
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING & PREVIEW */}
      {step === "mapping" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-neutral-900">تعيين أعمدة البيانات</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  تم اكتشاف <strong className="text-neutral-800">{totalRows}</strong> سطر في ملف{" "}
                  <span className="font-mono text-purple-700">{file?.name}</span>. تحقق من مطابقة الحقول:
                </p>
              </div>
              <button
                onClick={() => setStep("upload")}
                className="text-xs font-bold text-neutral-400 hover:text-neutral-700"
              >
                تغيير الملف
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Column */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  عمود الاسم الكامل * (مطلوب)
                </label>
                <select
                  value={mapping.nameColumn}
                  onChange={(e) => setMapping({ ...mapping, nameColumn: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-[#8a38f5] focus:ring-2 focus:ring-purple-200 font-semibold"
                >
                  <option value="">-- اختر عمود الاسم --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Email Column */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  عمود البريد الإلكتروني * (مطلوب)
                </label>
                <select
                  value={mapping.emailColumn}
                  onChange={(e) => setMapping({ ...mapping, emailColumn: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-[#8a38f5] focus:ring-2 focus:ring-purple-200 font-semibold"
                >
                  <option value="">-- اختر عمود البريد --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Phone Column */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  عمود رقم الهاتف (اختياري)
                </label>
                <select
                  value={mapping.phoneColumn || ""}
                  onChange={(e) => setMapping({ ...mapping, phoneColumn: e.target.value || undefined })}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-[#8a38f5] focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">-- بدون رقم هاتف --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Category Column */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  عمود الفئة أو الصفة (اختياري)
                </label>
                <select
                  value={mapping.categoryColumn || ""}
                  onChange={(e) => setMapping({ ...mapping, categoryColumn: e.target.value || undefined })}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-[#8a38f5] focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">-- عامة افتراضياً (General) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview Sample Table */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#8a38f5]" />
                <span>معاينة أولية للبيانات المستخرجة:</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                    <tr>
                      <th className="p-2.5">الاسم</th>
                      <th className="p-2.5">البريد الإلكتروني</th>
                      <th className="p-2.5">رقم الهاتف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sampleRows.slice(0, 4).map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/30">
                        <td className="p-2.5 font-bold text-neutral-900">
                          {row[mapping.nameColumn] || <span className="text-neutral-400">فارغ</span>}
                        </td>
                        <td className="p-2.5 font-mono text-neutral-600">
                          {row[mapping.emailColumn] || <span className="text-neutral-400">فارغ</span>}
                        </td>
                        <td className="p-2.5 text-neutral-500">
                          {mapping.phoneColumn ? row[mapping.phoneColumn] || "-" : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                onClick={() => setStep("upload")}
                className="rounded-xl px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                العودة
              </button>
              <button
                onClick={handleRunValidation}
                disabled={isValidating || !mapping.nameColumn || !mapping.emailColumn}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#8a38f5] px-6 py-3 text-sm font-bold text-white shadow-md shadow-purple-500/20 hover:bg-[#7826e3] transition-all disabled:opacity-50"
              >
                {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>بدء الفحص والتحقق من التكرار</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: VALIDATION SUMMARY & DUPLICATES RESOLUTION */}
      {step === "validation" && validationResult && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-purple-100">
            <h2 className="text-xl font-black text-neutral-900 mb-1">
              ملخص نتائج التحقق وقاعدة البيانات
            </h2>
            <p className="text-xs text-neutral-500 mb-6">
              تم فحص <strong className="text-neutral-800">{validationResult.totalRows}</strong> سجلاً ضد قاعدة بيانات ملتقى الجيل القادم.
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 block">مسجلين جدد مؤهلين</span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">
                  {validationResult.validCount}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-[11px] font-bold text-blue-700 block">مسجلين مسبقاً (محفوظين)</span>
                <span className="text-2xl font-black text-blue-900 mt-1 block">
                  {validationResult.existingInDbCount}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[11px] font-bold text-amber-700 block">تكرار داخل الملف نفسه</span>
                <span className="text-2xl font-black text-amber-900 mt-1 block">
                  {validationResult.duplicateInFileCount}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <span className="text-[11px] font-bold text-red-700 block">صفوف غير صالحة</span>
                <span className="text-2xl font-black text-red-900 mt-1 block">
                  {validationResult.invalidCount}
                </span>
              </div>
            </div>

            {/* Existing Attendees in DB notice */}
            {validationResult.existingInDbCount > 0 && (
              <div className="mb-4 rounded-2xl bg-blue-50/70 p-4 border border-blue-200 text-xs text-blue-950">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span>حماية البيانات وتجنب التكرار:</span>
                </div>
                <span>
                  تم الحفاظ على تذاكر وحالة حضور {validationResult.existingInDbCount} مسجلاً مسجلين مسبقاً في النظام ولن يتم مسحهم أو إعادة استبدال تذاكرهم.
                </span>
              </div>
            )}

            {/* Invalid rows warning */}
            {validationResult.invalidCount > 0 && (
              <div className="mb-4 rounded-2xl bg-red-50/70 p-4 border border-red-200 text-xs text-red-950">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>تنبيه الصفوف المرفوضة:</span>
                </div>
                <span>
                  تم استبعاد {validationResult.invalidCount} صفوف لعدم وجود اسم أو بريد صالح.
                </span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="mt-8 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setStep("mapping")}
                className="w-full sm:w-auto rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                العودة لتعديل الأعمدة
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Link
                  href="/tickets/bulk-generate"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a38f5] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:bg-[#7826e3] transition-all text-center"
                >
                  <Layers className="h-4 w-4" />
                  <span>الانتقال لإصدار التذاكر الجماعي ({validationResult.validCount} مؤهل)</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
