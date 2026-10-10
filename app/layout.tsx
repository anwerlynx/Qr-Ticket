import type { Metadata } from "next";
import "./globals.css";
import { HeroUIProviderWrapper } from "@/components/providers/HeroUIProviderWrapper";
import { TopHeader } from "@/components/ui/TopHeader";
import { BottomDockNavbar } from "@/components/ui/BottomDockNavbar";

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
          <TopHeader />
          <main className="flex-1 pb-24 sm:pb-28 max-w-full overflow-x-hidden">
            {children}
          </main>
          <BottomDockNavbar />
        </HeroUIProviderWrapper>
      </body>
    </html>
  );
}
