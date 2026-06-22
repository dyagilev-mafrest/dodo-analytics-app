"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { UnitRow, Totals } from "@/lib/types";

interface UnitsTableProps {
  units: UnitRow[];
  totals: Totals;
}

type SortKey = keyof Omit<UnitRow, "id" | "name">;

function LflBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
        —
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span
      className={`font-medium ${
        positive ? "text-[#16a34a] dark:text-[#4ade80]" : "text-[#dc2626] dark:text-[#f87171]"
      }`}
    >
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

export function UnitsTable({ units, totals }: UnitsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...units].sort((a, b) => {
    const aVal = (a[sortKey] as number | null) ?? (sortAsc ? Infinity : -Infinity);
    const bVal = (b[sortKey] as number | null) ?? (sortAsc ? Infinity : -Infinity);
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />;
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "revenue", label: "Выручка, ₽" },
    { key: "orders", label: "Заказы" },
    { key: "avgCheck", label: "Ср. чек, ₽" },
    { key: "lflRevenue", label: "LFL выручка" },
    { key: "lflOrders", label: "LFL заказы" },
    { key: "yoyRevenue", label: "YoY выручка" },
    { key: "yoyOrders", label: "YoY заказы" },
  ];

  return (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] overflow-hidden">
      <p
        className="text-xs uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a] px-5 pt-5 pb-3"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        Пиццерии
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
          <thead>
            <tr className="border-t border-[#ddd0b5] dark:border-[#3d352c]">
              <th className="text-left px-5 py-2.5 text-xs text-[#7d6f5e] dark:text-[#a0907a] font-medium">
                Пиццерия
              </th>
              {cols.map(({ key, label }) => (
                <th
                  key={key}
                  className="text-right px-4 py-2.5 text-xs text-[#7d6f5e] dark:text-[#a0907a] font-medium cursor-pointer hover:text-[#ff4e00] whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {label} <SortIcon col={key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((unit) => (
              <tr
                key={unit.id}
                className="border-t border-[#ddd0b5]/50 dark:border-[#3d352c]/50 hover:bg-[#FBF3E6] dark:hover:bg-[#241f18] transition-colors"
              >
                <td className="px-5 py-3 font-medium text-[#120f0c] dark:text-[#FBF3E6]">
                  {unit.name}
                </td>
                <td className="px-4 py-3 text-right text-[#3d352c] dark:text-[#ddd0b5]">
                  {fmt(unit.revenue)}
                </td>
                <td className="px-4 py-3 text-right text-[#3d352c] dark:text-[#ddd0b5]">
                  {fmt(unit.orders)}
                </td>
                <td className="px-4 py-3 text-right text-[#3d352c] dark:text-[#ddd0b5]">
                  {fmt(unit.avgCheck)}
                </td>
                <td className="px-4 py-3 text-right">
                  <LflBadge value={unit.lflRevenue} />
                </td>
                <td className="px-4 py-3 text-right">
                  <LflBadge value={unit.lflOrders} />
                </td>
                <td className="px-4 py-3 text-right">
                  <LflBadge value={unit.yoyRevenue} />
                </td>
                <td className="px-4 py-3 text-right">
                  <LflBadge value={unit.yoyOrders} />
                </td>
              </tr>
            ))}

            <tr className="border-t-2 border-[#ddd0b5] dark:border-[#3d352c] bg-[#FBF3E6] dark:bg-[#241f18]">
              <td className="px-5 py-3 font-bold text-[#120f0c] dark:text-[#FBF3E6]">
                Сеть
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#120f0c] dark:text-[#FBF3E6]">
                {fmt(totals.revenue)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#120f0c] dark:text-[#FBF3E6]">
                {fmt(totals.orders)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#120f0c] dark:text-[#FBF3E6]">
                {fmt(totals.avgCheck)}
              </td>
              <td className="px-4 py-3 text-right font-bold">
                <LflBadge value={totals.lflRevenue} />
              </td>
              <td className="px-4 py-3 text-right font-bold">
                <LflBadge value={totals.lflOrders} />
              </td>
              <td className="px-4 py-3 text-right font-bold">
                <LflBadge value={totals.yoyRevenue} />
              </td>
              <td className="px-4 py-3 text-right font-bold">
                <LflBadge value={totals.yoyOrders} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
