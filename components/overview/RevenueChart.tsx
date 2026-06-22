"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { RevenueChartPoint, UnitRevenue } from "@/lib/types";
import type { Granularity } from "@/lib/queries/overview";

interface RevenueChartProps {
  data: RevenueChartPoint[];
  gran: Granularity;
}

type ViewMode = "network" | "by-unit";

const UNIT_COLORS = ["#ff4e00","#3b82f6","#22c55e","#a855f7","#f59e0b","#ec4899","#14b8a6"];

// ── Formatting ─────────────────────────────────────────────────────────────────

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}М`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}К`;
  return String(v);
}

function formatLabel(dateStr: string, gran: Granularity): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (gran === "month") {
    return d.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
  }
  if (gran === "week") {
    const to = new Date(d);
    to.setUTCDate(d.getUTCDate() + 6);
    return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ── Breakdown panel ────────────────────────────────────────────────────────────

function BreakdownPanel({ date, total, units, gran, onClose }: {
  date: string; total: number; units: UnitRevenue[]; gran: Granularity; onClose: () => void;
}) {
  const max = units[0]?.revenue ?? 1;
  return (
    <div className="mt-3 rounded-lg border border-[#ddd0b5] dark:border-[#3d352c] bg-[#FBF3E6]/60 dark:bg-[#241f18] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
          Разбивка — {formatLabel(date, gran)}
        </p>
        <button onClick={onClose} className="text-[#a0907a] hover:text-[#ff4e00] transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {units.map((unit) => {
          const sharePct = total > 0 ? Math.round((unit.revenue / total) * 100) : 0;
          const barPct = Math.round((unit.revenue / max) * 100);
          return (
            <div key={unit.id} className="flex items-center gap-3">
              <p className="w-24 shrink-0 text-xs text-[#3d352c] dark:text-[#ddd0b5] truncate" style={{ fontFamily: "Inter, sans-serif" }}>{unit.name}</p>
              <div className="flex-1 bg-[#ddd0b5]/40 dark:bg-[#3d352c] rounded-full h-2 overflow-hidden">
                <div className="h-full bg-[#ff4e00] rounded-full" style={{ width: `${barPct}%` }} />
              </div>
              <p className="w-24 shrink-0 text-right text-xs text-[#3d352c] dark:text-[#ddd0b5]" style={{ fontFamily: "Inter, sans-serif" }}>
                {unit.revenue.toLocaleString("ru-RU")} ₽
              </p>
              <p className="w-8 shrink-0 text-right text-xs text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>{sharePct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ options, value, onChange }: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[#ddd0b5] dark:border-[#3d352c] text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
      {options.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 transition-colors ${
            value === id
              ? "bg-[#ff4e00] text-white"
              : "text-[#5a4f43] dark:text-[#a0907a] hover:bg-[#f0e4cc] dark:hover:bg-[#241f18]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function RevenueChart({ data, gran }: RevenueChartProps) {
  const [mode, setMode] = useState<ViewMode>("network");
  const [selected, setSelected] = useState<RevenueChartPoint | null>(null);

  const unitNames = data[0]?.byUnit.map((u) => u.name) ?? [];

  const byUnitChartData = data.map((point) => {
    const row: Record<string, string | number> = { date: point.date };
    for (const u of point.byUnit) row[u.name] = u.revenue;
    return row;
  });

  function handleNetworkClick(payload: Any) {
    if (!payload?.activeLabel) return;
    const point = data.find((d) => d.date === payload.activeLabel);
    if (!point) return;
    setSelected((prev) => (prev?.date === point.date ? null : point));
  }

  function switchMode(next: ViewMode) { setMode(next); setSelected(null); }

  const tickFmt = (v: string) => formatLabel(v, gran);
  const labelFmt = (v: Any) => formatLabel(String(v), gran);

  const VIEW_OPTIONS = [{ id: "network", label: "Сеть" }, { id: "by-unit", label: "По пиццериям" }];

  return (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
          Динамика выручки
        </p>
        <Toggle options={VIEW_OPTIONS} value={mode} onChange={(v) => switchMode(v as ViewMode)} />
      </div>

      {mode === "network" && (
        <p className="text-xs text-[#a0907a] dark:text-[#7d6f5e] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>
          Нажмите на точку для разбивки по пиццериям
        </p>
      )}

      <ResponsiveContainer width="100%" height={220}>
        {mode === "network" ? (
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} onClick={handleNetworkClick} style={{ cursor: "pointer" }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b5" strokeOpacity={0.5} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(v: Any, name: Any) => [`${Number(v).toLocaleString("ru-RU")} ₽`, name === "revenue" ? "Текущий год" : "Прошлый год"]}
              labelFormatter={labelFmt}
              contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, border: "1px solid #ddd0b5", borderRadius: 8, background: "#fff" }}
            />
            <Legend formatter={(v) => v === "revenue" ? "Текущий год" : "Прошлый год"} wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12 }} />
            {selected && <ReferenceLine x={selected.date} stroke="#ff4e00" strokeWidth={1.5} strokeDasharray="4 3" />}
            <Line type="monotone" dataKey="revenue" stroke="#ff4e00" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "#ff4e00", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#ff4e00" }} />
            <Line type="monotone" dataKey="revenuePrevYear" stroke="#c4b49a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        ) : (
          <LineChart data={byUnitChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b5" strokeOpacity={0.5} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(v: Any, name: Any) => [`${Number(v).toLocaleString("ru-RU")} ₽`, name]}
              labelFormatter={labelFmt}
              contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, border: "1px solid #ddd0b5", borderRadius: 8, background: "#fff" }}
            />
            <Legend wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 11 }} />
            {unitNames.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={UNIT_COLORS[i % UNIT_COLORS.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>

      {mode === "network" && selected && (
        <BreakdownPanel date={selected.date} total={selected.revenue} units={selected.byUnit} gran={gran} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
