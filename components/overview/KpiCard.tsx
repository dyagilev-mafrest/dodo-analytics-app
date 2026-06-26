import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  prevValue?: string;
}

export function KpiCard({ label, value, delta, prevValue }: KpiCardProps) {
  const isPositive = (delta ?? 0) >= 0;
  const isNeutral = delta === undefined;
  const deltaColor = isPositive
    ? "text-[#16a34a] dark:text-[#4ade80]"
    : "text-[#dc2626] dark:text-[#f87171]";

  return (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-5 flex flex-col gap-3">
      <p
        className="text-xs uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a]"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {label}
      </p>

      <p
        className="text-3xl text-[#120f0c] dark:text-[#FBF3E6] leading-none"
        style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 800 }}
      >
        {value}
      </p>

      {prevValue !== undefined ? (
        <div className="flex items-center gap-2 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
          <span className="text-[#7d6f5e] dark:text-[#a0907a]">год назад: {prevValue}</span>
          {!isNeutral && (
            <span className={`flex items-center gap-0.5 font-medium ${deltaColor}`}>
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isPositive ? "+" : ""}{delta?.toFixed(1)}%
            </span>
          )}
        </div>
      ) : !isNeutral && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${deltaColor}`}
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>
            {isPositive ? "+" : ""}{delta?.toFixed(1)}%{" "}
            <span className="text-[#a0907a] font-normal">к прошлому году</span>
          </span>
        </div>
      )}
    </div>
  );
}
