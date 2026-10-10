import type { Metadata } from "next";
import "./globals.css";
import { HeroUIProviderWrapper } from "@/components/providers/HeroUIProviderWrapper";
import { LayoutShell } from "@/components/ui/LayoutShell";

export const metadata: Metadata = {
  title: "Next Gen 2026 | ملتقى الجيل القادم - نظام التذاكر والتحقق الإلكتروني",
  description: "نظام إصدار التذاكر الذكية والتحقق عبر QR Code لملتقى الجيل القادم 2026",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="light">
      <body className="min-h-screen bg-[#fbfaff] text-neutral-900 antialiased selection:bg-purple-200 selection:text-purple-900 flex flex-col overflow-x-hidden">
        <HeroUIProviderWrapper>
          <LayoutShell>{children}</LayoutShell>
        </HeroUIProviderWrapper>
      </body>
    </html>
  );
}
