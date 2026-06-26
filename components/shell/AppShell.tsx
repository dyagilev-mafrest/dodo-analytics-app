"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { MainNav } from "./MainNav";
import { UserMenu } from "./UserMenu";

interface AppShellProps {
  user: { name: string; email: string };
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const activeFrom = searchParams.get("from") ?? "";
  const activeTo = searchParams.get("to") ?? "";
  const activeGran = (searchParams.get("gran") ?? "week") as "day" | "week" | "month";

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function applyFilter(from: string, to: string, gran: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    params.set("gran", gran);
    params.delete("period");
    router.push(`${pathname}?${params.toString()}`);
  }

  const segments = pathname.split("/").filter(Boolean);
  const activeSection = segments[0] === "pulse"
    ? `pulse-${segments[1] ?? "week"}`
    : (segments[0] ?? "overview");

  const sidebar = (
    <div className="flex flex-col h-full w-[260px] bg-white dark:bg-[#1e1710] border-r border-[#ddd0b5] dark:border-[#3d352c]">
      <MainNav
        activeSection={activeSection}
        activeFrom={activeFrom}
        activeTo={activeTo}
        activeGran={activeGran}
        onApply={applyFilter}
        onNavClick={() => setMobileOpen(false)}
      />
      <UserMenu user={user} isDark={isDark} onToggleTheme={toggleTheme} />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FBF3E6] dark:bg-[#120f0c] overflow-hidden">
      <aside className="hidden lg:flex shrink-0">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full">{sidebar}</aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1e1710] border-b border-[#ddd0b5] dark:border-[#3d352c]">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md text-[#7d6f5e] hover:text-[#ff4e00]">
            <Menu size={20} />
          </button>
          <p className="text-base" style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 700 }}>
            <span className="text-[#ff4e00]">Додо Пицца</span>{" "}
            <span className="text-[#120f0c] dark:text-[#FBF3E6]">МАФРЕСТ</span>
          </p>
        </div>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
