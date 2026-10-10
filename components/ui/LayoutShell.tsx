"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { TopHeader } from "./TopHeader";
import { BottomDockNavbar } from "./BottomDockNavbar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isScannerRoute =
    pathname?.startsWith("/scanner") || pathname?.startsWith("/check-in");

  if (isScannerRoute) {
    return (
      <main className="flex-1 w-full max-w-full overflow-x-hidden min-h-screen bg-[#08090f]">
        {children}
      </main>
    );
  }

  return (
    <>
      <TopHeader />
      <main className="flex-1 pb-24 sm:pb-28 max-w-full overflow-x-hidden">
        {children}
      </main>
      <BottomDockNavbar />
    </>
  );
}
