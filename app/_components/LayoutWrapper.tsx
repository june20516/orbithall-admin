"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useState } from "react";

/**
 * 레이아웃 래퍼
 * 로그인 페이지를 제외한 모든 페이지에 사이드바를 표시
 */
export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black overflow-scroll scrollbar-thin">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main
        className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-16"}`}
      >
        {children}
      </main>
    </div>
  );
}
