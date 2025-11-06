"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Globe, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/sites", label: "사이트", icon: Globe },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-0 z-30 h-full border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900 ${
          isOpen ? "w-64" : "w-16"
        }`}
      >
        {/* 헤더 */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          {isOpen && (
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              OrbitHall
            </h1>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={isOpen ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            )}
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="mt-4 space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-5 w-5" />
                {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 하단 여백 */}
        <div className="absolute bottom-0 w-full border-t border-zinc-200 p-4 dark:border-zinc-800">
          {isOpen ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-600">
              <p>Admin v0.1.0</p>
            </div>
          ) : (
            <div className="text-center text-xs text-zinc-500 dark:text-zinc-600">
              <p>v0.1</p>
            </div>
          )}
        </div>
      </aside>

      {/* 모바일 토글 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-10 rounded-md bg-zinc-900 p-2 text-white lg:hidden dark:bg-zinc-100 dark:text-zinc-900"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
}
