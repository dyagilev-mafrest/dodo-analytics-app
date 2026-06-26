"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { OrdersChartPoint } from "@/lib/types";
import type { Granularity } from "@/lib/queries/overview";

interface OrdersChartProps {
  data: OrdersChartPoint[];
  gran: Granularity;
}

type Metric = "orders" | "avgCheck" | "lflYoy";

const RANK_COLORS = ["#ff4e00", "#f08c1a", "#e8b84b", "#94a3b8", "#7f92a8", "#6b8298", "#587089"];
const RANK_WIDTHS = [2.5, 2, 1.75, 1.25, 1.25, 1.25, 1.25];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function formatPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function formatOrders(v: number) {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}К`;
  return String(v);
}

function formatAvgCheck(v: number) {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}К ₽`;
  return `${v} ₽`;
}

function formatLabel(dateStr: string, gran: Granularity): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (gran === "month") return d.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
  if (gran === "week") {
    const to = new Date(d);
    to.setUTCDate(d.getUTCDate() + 6);
    return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

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

export function OrdersChart({ data, gran }: OrdersChartProps) {
  const [metric, setMetric] = useState<Metric>("orders");
  const [mode, setMode] = useState<"network" | "by-unit">("network");

  const lflYoyData = useMemo(() =>
    data.map((p) => ({
      date: p.date,
      lfl: p.lflOrdersPrevYear ? +((p.lflOrders / p.lflOrdersPrevYear - 1) * 100).toFixed(1) : null,
      yoy: p.ordersPrevYear ? +((p.orders / p.ordersPrevYear - 1) * 100).toFixed(1) : null,
    })),
    [data]
  );

  const unitNames = useMemo(() => data[0]?.byUnit.map((u) => u.name) ?? [], [data]);

  const byUnitChartData = useMemo(() =>
    data.map((point) => {
      const row: Record<string, string | number> = { date: point.date };
      for (const u of point.byUnit) row[u.name] = metric === "orders" ? u.orders : u.avgCheck;
      return row;
    }),
    [data, metric]
  );

  const { unitColorMap, unitWidthMap, rankedUnitNames } = useMemo(() => {
    const lastPoint = data[data.length - 1];
    const ranked = [...(lastPoint?.byUnit ?? [])]
      .sort((a, b) => metric === "orders" ? b.orders - a.orders : b.avgCheck - a.avgCheck)
      .map((u) => u.name);
    const colorMap: Record<string, string> = {};
    const widthMap: Record<string, number> = {};
    unitNames.forEach((name) => {
      const rank = ranked.indexOf(name);
      colorMap[name] = RANK_COLORS[rank] ?? RANK_COLORS[RANK_COLORS.length - 1];
      widthMap[name] = RANK_WIDTHS[rank] ?? RANK_WIDTHS[RANK_WIDTHS.length - 1];
    });
    return { unitColorMap: colorMap, unitWidthMap: widthMap, rankedUnitNames: ranked };
  }, [data, unitNames, metric]);

  const fmt = metric === "orders" ? formatOrders : formatAvgCheck;
  const networkKey = metric === "orders" ? "orders" : "avgCheck";
  const prevYearKey = metric === "orders" ? "ordersPrevYear" : "avgCheckPrevYear";
  const tickFmt = (v: string) => formatLabel(v, gran);
  const labelFmt = (v: Any) => formatLabel(String(v), gran);

  const METRIC_OPTIONS = [
    { id: "orders", label: "Заказы" },
    { id: "avgCheck", label: "Средний чек" },
    { id: "lflYoy", label: "LFL / YoY заказов" },
  ];
  const VIEW_OPTIONS = [{ id: "network", label: "Сеть" }, { id: "by-unit", label: "По пиццериям" }];
  const isLflYoy = metric === "lflYoy";

  return (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Toggle options={METRIC_OPTIONS} value={metric} onChange={(v) => setMetric(v as Metric)} />
        {!isLflYoy && <Toggle options={VIEW_OPTIONS} value={mode} onChange={(v) => setMode(v as "network" | "by-unit")} />}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        {isLflYoy ? (
          <LineChart data={lflYoyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b5" strokeOpacity={0.5} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatPct} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} width={52} />
            <ReferenceLine y={0} stroke="#ddd0b5" strokeWidth={1} />
            <Tooltip
              content={({ label, payload }: Any) => {
                if (!payload?.length) return null;
                return (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, border: "1px solid #ddd0b5", borderRadius: 8, background: "#fff", padding: "8px 12px", lineHeight: "1.8" }}>
                    <p style={{ color: "#7d6f5e", marginBottom: 4, fontSize: 11 }}>{formatLabel(String(label), gran)}</p>
                    {payload.map((e: Any) => (
                      <div key={e.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                        <span style={{ color: e.color }}>{e.dataKey === "yoy" ? "YoY заказов" : "LFL заказов"}</span>
                        <span style={{ color: "#3d352c", fontVariantNumeric: "tabular-nums" }}>
                          {e.value != null ? formatPct(e.value as number) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend formatter={(v) => v === "yoy" ? "YoY заказов" : "LFL заказов"} wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12 }} />
            <Line type="monotone" dataKey="yoy" stroke="#ff4e00" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "#ff4e00", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#ff4e00" }} connectNulls />
            <Line type="monotone" dataKey="lfl" stroke="#0d9488" strokeWidth={1.75} dot={false} activeDot={{ r: 4, fill: "#0d9488" }} connectNulls />
          </LineChart>
        ) : mode === "network" ? (
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b5" strokeOpacity={0.5} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(v: Any, name: Any) => [
                metric === "orders" ? (v as number).toLocaleString("ru-RU") : `${(v as number).toLocaleString("ru-RU")} ₽`,
                name === networkKey ? "Текущий год" : "Прошлый год",
              ]}
              labelFormatter={labelFmt}
              contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, border: "1px solid #ddd0b5", borderRadius: 8, background: "#fff" }}
            />
            <Legend formatter={(v) => v === networkKey ? "Текущий год" : "Прошлый год"} wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12 }} />
            <Line type="monotone" dataKey={networkKey} stroke="#ff4e00" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "#ff4e00", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#ff4e00" }} />
            <Line type="monotone" dataKey={prevYearKey} stroke="#c4b49a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        ) : (
          <LineChart data={byUnitChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b5" strokeOpacity={0.5} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#7d6f5e" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              content={({ label, payload }: Any) => {
                if (!payload?.length) return null;
                const sorted = [...payload].sort((a: Any, b: Any) => (b.value as number) - (a.value as number));
                return (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, border: "1px solid #ddd0b5", borderRadius: 8, background: "#fff", padding: "8px 12px", lineHeight: "1.8" }}>
                    <p style={{ color: "#7d6f5e", marginBottom: 4, fontSize: 11 }}>{formatLabel(String(label), gran)}</p>
                    {sorted.map((entry: Any) => (
                      <div key={entry.name} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                        <span style={{ color: entry.color }}>{entry.name}</span>
                        <span style={{ color: "#3d352c", fontVariantNumeric: "tabular-nums" }}>
                          {metric === "orders"
                            ? (entry.value as number).toLocaleString("ru-RU")
                            : `${(entry.value as number).toLocaleString("ru-RU")} ₽`}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 11 }} />
            {rankedUnitNames.map((name) => (
              <Line key={name} type="monotone" dataKey={name}
                stroke={unitColorMap[name]} strokeWidth={unitWidthMap[name]}
                dot={false} activeDot={{ r: 4, fill: unitColorMap[name] }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
