import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
}

export function KpiCard({ label, value, delta, deltaLabel }: KpiCardProps) {
  const isPositive = (delta ?? 0) >= 0;
  const hasData = delta !== undefined;

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

      {hasData && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            isPositive
              ? "text-[#16a34a] dark:text-[#4ade80]"
              : "text-[#dc2626] dark:text-[#f87171]"
          }`}
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>
            {isPositive ? "+" : ""}
            {delta?.toFixed(1)}%{" "}
            {deltaLabel && (
              <span className="text-[#a0907a] font-normal">{deltaLabel}</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
