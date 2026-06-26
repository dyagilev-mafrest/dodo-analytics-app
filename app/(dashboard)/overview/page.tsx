import { createServerSupabase } from "@/lib/supabase-server";
import { getKpis, getRevenueChart, getOrdersChart, getUnitsTable } from "@/lib/queries/overview";
import type { Granularity } from "@/lib/queries/overview";
import { KpiCard } from "@/components/overview/KpiCard";
import { RevenueChart } from "@/components/overview/RevenueChart";
import { OrdersChart } from "@/components/overview/OrdersChart";
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

  const [kpis, chartData, ordersChartData, tableData] = await Promise.all([
    getKpis(supabase, dateParams, unit, gran),
    getRevenueChart(supabase, dateParams, unit, gran),
    getOrdersChart(supabase, dateParams, gran),
    getUnitsTable(supabase, dateParams, gran),
  ]);

  const { units, totals } = tableData;

  const noData = (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-8 text-center">
      <p className="text-sm text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
        Нет данных за выбранный период
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1
        className="text-xl text-[#120f0c] dark:text-[#FBF3E6]"
        style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 700 }}
      >
        Обзор сети
      </h1>

      {/* Row 1: Revenue KPIs + Revenue Chart */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            label="Выручка"
            value={formatRub(kpis.revenue)}
            prevValue={formatRub(kpis.prevRevenue)}
            delta={kpis.revenueDelta}
          />
          <KpiCard label="LFL Выручки" value={formatPct(kpis.lflRevenue)} />
          <KpiCard label="YoY Выручки" value={formatPct(kpis.yoyRevenue)} />
        </div>
        {chartData.length > 0 ? <RevenueChart data={chartData} gran={gran} /> : noData}
      </div>

      {/* Row 2: Orders KPIs + Orders Chart */}
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Заказы"
            value={kpis.orders.toLocaleString("ru-RU")}
            prevValue={kpis.prevOrders.toLocaleString("ru-RU")}
            delta={kpis.ordersDelta}
          />
          <KpiCard
            label="Средний чек"
            value={`${kpis.avgCheck.toLocaleString("ru-RU")} ₽`}
            prevValue={`${kpis.prevAvgCheck.toLocaleString("ru-RU")} ₽`}
            delta={kpis.avgCheckDelta}
          />
          <KpiCard label="LFL Заказов" value={formatPct(kpis.lflOrders)} />
          <KpiCard label="YoY Заказов" value={formatPct(kpis.yoyOrders)} />
        </div>
        {ordersChartData.length > 0 ? <OrdersChart data={ordersChartData} gran={gran} /> : noData}
      </div>

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
