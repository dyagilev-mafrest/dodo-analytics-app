"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, BarChart2, Truck, UtensilsCrossed, Gauge, AlertTriangle, Tag } from "lucide-react";

type NavItem = { type: "item"; id: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; href: string };
type NavGroup = { type: "group"; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; items: { id: string; label: string; href: string }[] };
type NavEntry = NavItem | NavGroup;

const NAV_ENTRIES: NavEntry[] = [
  {
    type: "group",
    label: "Бизнес-пульс",
    icon: Activity,
    items: [
      { id: "pulse-week",  label: "Неделя", href: "/pulse/week" },
      { id: "pulse-month", label: "Месяц",  href: "/pulse/month" },
    ],
  },
  { type: "item", id: "overview",     label: "Продажи",            icon: BarChart2,       href: "/overview" },
  { type: "item", id: "delivery",     label: "Доставка",           icon: Truck,           href: "/delivery" },
  { type: "item", id: "restaurant",   label: "Ресторан",           icon: UtensilsCrossed, href: "/restaurant" },
  { type: "item", id: "productivity", label: "Производительность", icon: Gauge,           href: "/productivity" },
  { type: "item", id: "stop-lists",   label: "Стопы",              icon: AlertTriangle,   href: "/stop-lists" },
  { type: "item", id: "discounts",    label: "Дисконт",            icon: Tag,             href: "/discounts" },
];

const GRAN_OPTIONS = [
  { id: "day",   label: "День" },
  { id: "week",  label: "Неделя" },
  { id: "month", label: "Месяц" },
];

type Preset = "prevWeek" | "prevMonth" | "custom";
type Gran = "day" | "week" | "month";

function getYakutskNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function computePresetRange(preset: "prevWeek" | "prevMonth"): { from: string; to: string } {
  const now = getYakutskNow();
  if (preset === "prevWeek") {
    const daysSinceMon = (now.getUTCDay() + 6) % 7;
    const prevMon = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMon - 7)
    );
    const prevSun = new Date(prevMon);
    prevSun.setUTCDate(prevMon.getUTCDate() + 6);
    return { from: toDateStr(prevMon), to: toDateStr(prevSun) };
  } else {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const from = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    return { from: toDateStr(from), to: toDateStr(to) };
  }
}

function detectPreset(from: string, to: string): Preset {
  if (!from || !to) return "prevWeek";
  const pw = computePresetRange("prevWeek");
  if (from === pw.from && to === pw.to) return "prevWeek";
  const pm = computePresetRange("prevMonth");
  if (from === pm.from && to === pm.to) return "prevMonth";
  return "custom";
}

interface MainNavProps {
  activeSection: string;
  activeFrom: string;
  activeTo: string;
  activeGran: Gran;
  onApply: (from: string, to: string, gran: Gran) => void;
  onNavClick?: () => void;
}

export function MainNav({
  activeSection,
  activeFrom,
  activeTo,
  activeGran,
  onApply,
  onNavClick,
}: MainNavProps) {
  const initPreset = detectPreset(activeFrom, activeTo);
  const initRange =
    activeFrom && activeTo ? { from: activeFrom, to: activeTo } : computePresetRange("prevWeek");

  const [preset, setPreset] = useState<Preset>(initPreset);
  const [localFrom, setLocalFrom] = useState(initRange.from);
  const [localTo, setLocalTo] = useState(initRange.to);
  const [localGran, setLocalGran] = useState<Gran>(activeGran);

  useEffect(() => {
    const p = detectPreset(activeFrom, activeTo);
    setPreset(p);
    if (activeFrom && activeTo) {
      setLocalFrom(activeFrom);
      setLocalTo(activeTo);
    } else {
      const range = computePresetRange("prevWeek");
      setLocalFrom(range.from);
      setLocalTo(range.to);
    }
  }, [activeFrom, activeTo]);

  useEffect(() => {
    setLocalGran(activeGran);
  }, [activeGran]);

  function handlePresetChange(value: string) {
    if (value === "custom") {
      setPreset("custom");
    } else {
      const p = value as "prevWeek" | "prevMonth";
      setPreset(p);
      const range = computePresetRange(p);
      setLocalFrom(range.from);
      setLocalTo(range.to);
    }
  }

  function handleFromChange(val: string) {
    setLocalFrom(val);
    setPreset("custom");
  }

  function handleToChange(val: string) {
    setLocalTo(val);
    setPreset("custom");
  }

  const canApply = Boolean(localFrom && localTo && localFrom <= localTo);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#ddd0b5] dark:border-[#3d352c]">
        <p className="text-lg leading-tight" style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 700 }}>
          <span className="text-[#ff4e00]">Додо Пицца</span>
          <br />
          <span className="text-[#120f0c] dark:text-[#FBF3E6]">МАФРЕСТ</span>
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ENTRIES.map((entry) => {
          if (entry.type === "group") {
            const isGroupActive = entry.items.some((item) => item.id === activeSection);
            return (
              <div key={entry.label} className="mb-1">
                <div className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold tracking-wide ${isGroupActive ? "text-[#ff4e00]" : "text-[#7d6f5e] dark:text-[#a0907a]"}`}>
                  <entry.icon size={13} className="shrink-0" />
                  {entry.label}
                </div>
                <div className="ml-2 space-y-0.5">
                  {entry.items.map(({ id, label, href }) => {
                    const isActive = activeSection === id;
                    return (
                      <Link
                        key={id}
                        href={href}
                        onClick={onNavClick}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-[#ff4e00] text-white"
                            : "text-[#5a4f43] dark:text-[#a0907a] hover:bg-[#f0e4cc] dark:hover:bg-[#241f18] hover:text-[#120f0c] dark:hover:text-[#FBF3E6]"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-[#c4b49a] dark:bg-[#5a4f43]"}`} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }
          const { id, label, icon: Icon, href } = entry;
          const isActive = activeSection === id;
          return (
            <Link
              key={id}
              href={href}
              onClick={onNavClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#ff4e00] text-white"
                  : "text-[#5a4f43] dark:text-[#a0907a] hover:bg-[#f0e4cc] dark:hover:bg-[#241f18] hover:text-[#120f0c] dark:hover:text-[#FBF3E6]"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Filters */}
      <div className="px-4 py-4 border-t border-[#ddd0b5] dark:border-[#3d352c] space-y-4">

        {/* Period preset */}
        <div>
          <p className="text-xs text-[#7d6f5e] dark:text-[#a0907a] uppercase tracking-wider mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
            Период
          </p>
          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full rounded-lg border border-[#ddd0b5] dark:border-[#3d352c] bg-white dark:bg-[#1e1710] text-[#120f0c] dark:text-[#FBF3E6] text-sm px-3 py-2 outline-none focus:border-[#ff4e00] transition-colors cursor-pointer"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <option value="prevWeek">Предыдущая неделя</option>
            <option value="prevMonth">Предыдущий месяц</option>
            <option value="custom">Произвольный период</option>
          </select>
        </div>

        {/* Date range */}
        <div className="rounded-lg border border-[#ddd0b5] dark:border-[#3d352c] overflow-hidden bg-white dark:bg-[#1e1710]">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#ddd0b5] dark:border-[#3d352c]">
            <span className="text-[10px] font-semibold text-[#7d6f5e] dark:text-[#a0907a] uppercase tracking-widest shrink-0 w-5" style={{ fontFamily: "Inter, sans-serif" }}>С</span>
            <input
              type="date"
              value={localFrom}
              max={localTo || undefined}
              onChange={(e) => handleFromChange(e.target.value)}
              className="flex-1 text-sm bg-transparent text-[#120f0c] dark:text-[#FBF3E6] outline-none cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="text-[10px] font-semibold text-[#7d6f5e] dark:text-[#a0907a] uppercase tracking-widest shrink-0 w-5" style={{ fontFamily: "Inter, sans-serif" }}>ПО</span>
            <input
              type="date"
              value={localTo}
              min={localFrom || undefined}
              onChange={(e) => handleToChange(e.target.value)}
              className="flex-1 text-sm bg-transparent text-[#120f0c] dark:text-[#FBF3E6] outline-none cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
          </div>
        </div>

        {/* Granularity (view interval) */}
        <div>
          <p className="text-xs text-[#7d6f5e] dark:text-[#a0907a] uppercase tracking-wider mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
            Интервал
          </p>
          <div className="flex rounded-lg overflow-hidden border border-[#ddd0b5] dark:border-[#3d352c]">
            {GRAN_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setLocalGran(id as Gran)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  localGran === id
                    ? "bg-[#ff4e00] text-white"
                    : "text-[#5a4f43] dark:text-[#a0907a] hover:bg-[#f0e4cc] dark:hover:bg-[#241f18]"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply */}
        <button
          onClick={() => canApply && onApply(localFrom, localTo, localGran)}
          disabled={!canApply}
          className="w-full py-2 rounded-lg text-sm font-semibold bg-[#ff4e00] text-white hover:bg-[#e04400] active:bg-[#c73d00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Применить
        </button>
      </div>
    </div>
  );
}
