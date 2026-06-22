import { createServerSupabase } from "@/lib/supabase-server";
import { getKpis, getRevenueChart, getUnitsTable } from "@/lib/queries/overview";
import type { Granularity } from "@/lib/queries/overview";
import { KpiCard } from "@/components/overview/KpiCard";
import { RevenueChart } from "@/components/overview/RevenueChart";
import { UnitsTable } from "@/components/overview/UnitsTable";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    unit?: string;
    from?: string;
    to?: string;
    gran?: string;
  }>;
}

function formatRub(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} М ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} К ₽`;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

const VALID_GRAN: Granularity[] = ["day", "week", "month"];

export default async function OverviewPage({ searchParams }: PageProps) {
  const { from, to, gran: granParam } = await searchParams;
  const dateParams = { from, to };
  const unit = "all";
  const gran: Granularity = VALID_GRAN.includes(granParam as Granularity)
    ? (granParam as Granularity)
    : "day";

  const supabase = await createServerSupabase();

  const [kpis, chartData, tableData] = await Promise.all([
    getKpis(supabase, dateParams, unit, gran),
    getRevenueChart(supabase, dateParams, unit, gran),
    getUnitsTable(supabase, dateParams, gran),
  ]);

  const { units, totals } = tableData;

  return (
    <div className="space-y-6">
      <h1
        className="text-xl text-[#120f0c] dark:text-[#FBF3E6]"
        style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 700 }}
      >
        Обзор сети
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Выручка" value={formatRub(kpis.revenue)} delta={kpis.revenueDelta} deltaLabel="к прошлому году" />
        <KpiCard label="Заказы" value={kpis.orders.toLocaleString("ru-RU")} delta={kpis.ordersDelta} deltaLabel="к прошлому году" />
        <KpiCard label="Средний чек" value={`${kpis.avgCheck.toLocaleString("ru-RU")} ₽`} delta={kpis.avgCheckDelta} deltaLabel="к прошлому году" />
        <KpiCard label="LFL Выручки" value={formatPct(kpis.lflRevenue)} />
        <KpiCard label="LFL Заказов" value={formatPct(kpis.lflOrders)} />
        <KpiCard label="YoY Выручки" value={formatPct(kpis.yoyRevenue)} />
        <KpiCard label="YoY Заказов" value={formatPct(kpis.yoyOrders)} />
      </div>

      {chartData.length > 0 ? (
        <RevenueChart data={chartData} gran={gran} />
      ) : (
        <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-8 text-center">
          <p className="text-sm text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
            Нет данных за выбранный период
          </p>
        </div>
      )}

      {units.length > 0 ? (
        <UnitsTable units={units} totals={totals} />
      ) : (
        <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-8 text-center">
          <p className="text-sm text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
            Нет данных о пиццериях
          </p>
        </div>
      )}
    </div>
  );
}
