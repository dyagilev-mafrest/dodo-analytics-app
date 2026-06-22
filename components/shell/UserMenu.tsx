"use client";

import { LogOut, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface UserMenuProps {
  user: { name: string; email: string };
  isDark: boolean;
  onToggleTheme: () => void;
}

export function UserMenu({ user, isDark, onToggleTheme }: UserMenuProps) {
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="px-4 py-4 border-t border-[#ddd0b5] dark:border-[#3d352c]">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full bg-[#ff4e00] flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium text-[#120f0c] dark:text-[#FBF3E6] truncate"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {user.name}
          </p>
          <p
            className="text-xs text-[#7d6f5e] dark:text-[#a0907a] truncate"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {user.email}
          </p>
        </div>

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md text-[#7d6f5e] dark:text-[#a0907a] hover:text-[#ff4e00] hover:bg-[#f0e4cc] dark:hover:bg-[#241f18] transition-colors"
          title={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md text-[#7d6f5e] dark:text-[#a0907a] hover:text-[#ff4e00] hover:bg-[#f0e4cc] dark:hover:bg-[#241f18] transition-colors"
          title="Выйти"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}
