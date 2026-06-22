import type { SupabaseClient } from "@supabase/supabase-js";
import type { KpiData, RevenueChartPoint, UnitRow, Totals } from "@/lib/types";

export type Granularity = "day" | "week" | "month";

export type DateParams = {
  period?: string;
  from?: string;
  to?: string;
};

type RpcUnitRow = { unit_id: string; revenue: number; orders: number };

function getYakutskNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveRange(params: DateParams): { from: string; to: string } {
  if (params.from && params.to) return { from: params.from, to: params.to };
  // Default: previous calendar week (Yakutsk time)
  const now = getYakutskNow();
  const daysSinceMon = (now.getUTCDay() + 6) % 7;
  const prevMon = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMon - 7)
  );
  const prevSun = new Date(prevMon);
  prevSun.setUTCDate(prevMon.getUTCDate() + 6);
  return { from: toDateStr(prevMon), to: toDateStr(prevSun) };
}

function shiftYear(range: { from: string; to: string }, years: number) {
  const from = new Date(range.from + "T00:00:00Z");
  const to = new Date(range.to + "T00:00:00Z");
  from.setUTCFullYear(from.getUTCFullYear() + years);
  to.setUTCFullYear(to.getUTCFullYear() + years);
  return { from: toDateStr(from), to: toDateStr(to) };
}

// 364 days = 52 full weeks — the LFL comparison offset
function shift364Days(range: { from: string; to: string }): { from: string; to: string } {
  const from = new Date(range.from + "T00:00:00Z");
  const to = new Date(range.to + "T00:00:00Z");
  from.setUTCDate(from.getUTCDate() - 364);
  to.setUTCDate(to.getUTCDate() - 364);
  return { from: toDateStr(from), to: toDateStr(to) };
}

// Full months the unit has been open at the given date
function monthsDiff(openDate: Date, atDate: Date): number {
  return (
    (atDate.getUTCFullYear() - openDate.getUTCFullYear()) * 12 +
    (atDate.getUTCMonth() - openDate.getUTCMonth())
  );
}

function getLflMode(gran: Granularity): "month" | "dayweek" {
  return gran === "month" ? "month" : "dayweek";
}

function shiftDateByYear(dateStr: string, years: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return toDateStr(d);
}

function pct(current: number, base: number): number {
  if (base === 0) return 0;
  return parseFloat(((current - base) / base * 100).toFixed(1));
}

async function fetchUnitNames(
  supabase: SupabaseClient,
  unitIds: string[]
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  if (unitIds.length === 0) return nameMap;
  const { data } = await supabase.from("units").select("id, name").in("id", unitIds);
  for (const u of data ?? []) nameMap.set(u.id, u.name);
  return nameMap;
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

async function rpcSumSales(
  supabase: SupabaseClient,
  from: string,
  to: string,
  unitId: string
): Promise<{ sales: number; orders: number }> {
  const { data, error } = await supabase.rpc("sum_sales", {
    p_from: from, p_to: to, p_unit: unitId,
  });
  if (error) throw error;
  const row = (data as { revenue: number; orders: number }[] | null)?.[0];
  return { sales: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
}

export async function getKpis(
  supabase: SupabaseClient,
  dateParams: DateParams,
  unitId: string,
  gran: Granularity
): Promise<KpiData> {
  const cur = resolveRange(dateParams);
  const comp = shift364Days(cur);
  const prevYear = shiftYear(cur, -1);

  type UnitOpenDate = { id: string; open_date: string | null };
  type SumByUnitRes = { data: RpcUnitRow[] | null; error: unknown };

  const [curTotal, prevTotal, curByUnitRes, compByUnitRes, unitsRes] = await Promise.all([
    rpcSumSales(supabase, cur.from, cur.to, unitId),
    rpcSumSales(supabase, prevYear.from, prevYear.to, unitId),
    supabase.rpc("sum_sales_by_unit", { p_from: cur.from, p_to: cur.to }) as Promise<SumByUnitRes>,
    supabase.rpc("sum_sales_by_unit", { p_from: comp.from, p_to: comp.to }) as Promise<SumByUnitRes>,
    supabase.from("units").select("id, open_date") as Promise<{ data: UnitOpenDate[] | null; error: unknown }>,
  ]);

  const revenue = curTotal.sales;
  const orders = curTotal.orders;
  const avgCheck = orders > 0 ? Math.round(revenue / orders) : 0;
  const prevRevenue = prevTotal.sales;
  const prevOrders = prevTotal.orders;
  const prevAvgCheck = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

  const curRows: RpcUnitRow[] = curByUnitRes.data ?? [];
  const compRows: RpcUnitRow[] = compByUnitRes.data ?? [];
  const openDateMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u.open_date]));

  const lflMode = getLflMode(gran);
  const periodStart = new Date(cur.from + "T00:00:00Z");

  function isEligible(uid: string): boolean {
    const compRow = compRows.find((r) => r.unit_id === uid);
    if (!compRow || Number(compRow.revenue) === 0) return false;
    if (lflMode === "month") {
      const od = openDateMap.get(uid);
      if (!od) return false;
      if (monthsDiff(new Date(od + "T00:00:00Z"), periodStart) < 13) return false;
    }
    return true;
  }

  let lflRevenue: number;
  let lflOrders: number;

  if (unitId !== "all") {
    if (isEligible(unitId)) {
      const compRow = compRows.find((r) => r.unit_id === unitId);
      lflRevenue = pct(revenue, Number(compRow?.revenue ?? 0));
      lflOrders = pct(orders, Number(compRow?.orders ?? 0));
    } else {
      lflRevenue = 0;
      lflOrders = 0;
    }
  } else {
    const allUnitIds = new Set([...curRows.map((r) => r.unit_id), ...compRows.map((r) => r.unit_id)]);
    const eligibleIds = new Set([...allUnitIds].filter(isEligible));
    const lflCurRev = curRows.filter((r) => eligibleIds.has(r.unit_id)).reduce((s, r) => s + Number(r.revenue), 0);
    const lflCompRev = compRows.filter((r) => eligibleIds.has(r.unit_id)).reduce((s, r) => s + Number(r.revenue), 0);
    const lflCurOrd = curRows.filter((r) => eligibleIds.has(r.unit_id)).reduce((s, r) => s + Number(r.orders), 0);
    const lflCompOrd = compRows.filter((r) => eligibleIds.has(r.unit_id)).reduce((s, r) => s + Number(r.orders), 0);
    lflRevenue = pct(lflCurRev, lflCompRev);
    lflOrders = pct(lflCurOrd, lflCompOrd);
  }

  return {
    revenue, orders, avgCheck,
    revenueDelta: pct(revenue, prevRevenue),
    ordersDelta: pct(orders, prevOrders),
    avgCheckDelta: pct(avgCheck, prevAvgCheck),
    lflRevenue, lflOrders,
    yoyRevenue: lflRevenue,
    yoyOrders: lflOrders,
  };
}

// ── Revenue chart ──────────────────────────────────────────────────────────────

type RpcChartRow = { period_start: string; unit_id: string; revenue: number };

export async function getRevenueChart(
  supabase: SupabaseClient,
  dateParams: DateParams,
  unitId: string,
  gran: Granularity
): Promise<RevenueChartPoint[]> {
  const cur = resolveRange(dateParams);
  const prev = shiftYear(cur, -1);

  const [{ data: curData, error: e1 }, { data: prevData, error: e2 }] =
    await Promise.all([
      supabase.rpc("revenue_chart", { p_from: cur.from, p_to: cur.to, p_unit: unitId, p_gran: gran }),
      supabase.rpc("revenue_chart", { p_from: prev.from, p_to: prev.to, p_unit: unitId, p_gran: gran }),
    ]);

  if (e1) throw e1;
  if (e2) throw e2;

  // Prev year lookup: shift period_start by +1 year to align with current
  const prevByDate = new Map<string, number>();
  for (const row of (prevData as RpcChartRow[] | null) ?? []) {
    const shifted = shiftDateByYear(row.period_start, 1);
    prevByDate.set(shifted, (prevByDate.get(shifted) ?? 0) + Number(row.revenue));
  }

  // Group current data by period_start
  const byPeriod = new Map<string, { revenue: number; byUnit: Map<string, { name: string; revenue: number }> }>();
  const unitIds = new Set<string>();

  for (const row of (curData as RpcChartRow[] | null) ?? []) {
    unitIds.add(row.unit_id);
    if (!byPeriod.has(row.period_start)) {
      byPeriod.set(row.period_start, { revenue: 0, byUnit: new Map() });
    }
    const entry = byPeriod.get(row.period_start)!;
    entry.revenue += Number(row.revenue);
    const u = entry.byUnit.get(row.unit_id) ?? { name: row.unit_id, revenue: 0 };
    u.revenue += Number(row.revenue);
    entry.byUnit.set(row.unit_id, u);
  }

  const nameMap = await fetchUnitNames(supabase, [...unitIds]);
  for (const entry of byPeriod.values()) {
    for (const [id, u] of entry.byUnit) {
      u.name = nameMap.get(id) ?? id;
    }
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({
      date,
      revenue: entry.revenue,
      revenuePrevYear: prevByDate.get(date) ?? 0,
      byUnit: [...entry.byUnit.entries()]
        .map(([id, u]) => ({ id, name: u.name, revenue: u.revenue }))
        .sort((a, b) => b.revenue - a.revenue),
    }));
}

// ── Units table ────────────────────────────────────────────────────────────────

export async function getUnitsTable(
  supabase: SupabaseClient,
  dateParams: DateParams,
  gran: Granularity
): Promise<{ units: UnitRow[]; totals: Totals }> {
  const cur = resolveRange(dateParams);
  const comp = shift364Days(cur);

  type UnitInfo = { id: string; name: string; open_date: string | null };
  type SumByUnitRes = { data: RpcUnitRow[] | null; error: unknown };

  const [curByUnitRes, compByUnitRes, unitsRes] = await Promise.all([
    supabase.rpc("sum_sales_by_unit", { p_from: cur.from, p_to: cur.to }) as Promise<SumByUnitRes>,
    supabase.rpc("sum_sales_by_unit", { p_from: comp.from, p_to: comp.to }) as Promise<SumByUnitRes>,
    supabase.from("units").select("id, name, open_date") as Promise<{ data: UnitInfo[] | null; error: unknown }>,
  ]);

  if (curByUnitRes.error) throw curByUnitRes.error;
  if (compByUnitRes.error) throw compByUnitRes.error;

  const curMap = new Map<string, { sales: number; orders: number }>();
  for (const r of curByUnitRes.data ?? []) {
    curMap.set(r.unit_id, { sales: Number(r.revenue), orders: Number(r.orders) });
  }

  const compMap = new Map<string, { sales: number; orders: number }>();
  for (const r of compByUnitRes.data ?? []) {
    compMap.set(r.unit_id, { sales: Number(r.revenue), orders: Number(r.orders) });
  }

  const lflMode = getLflMode(gran);
  const periodStart = new Date(cur.from + "T00:00:00Z");

  function isEligible(unitId: string, openDateStr: string | null): boolean {
    const compRow = compMap.get(unitId);
    if (!compRow || compRow.sales === 0) return false;
    if (lflMode === "month") {
      if (!openDateStr) return false;
      if (monthsDiff(new Date(openDateStr + "T00:00:00Z"), periodStart) < 13) return false;
    }
    return true;
  }

  const rows: UnitRow[] = [];
  for (const unitInfo of unitsRes.data ?? []) {
    const curData = curMap.get(unitInfo.id) ?? { sales: 0, orders: 0 };
    const compData = compMap.get(unitInfo.id) ?? { sales: 0, orders: 0 };
    const eligible = isEligible(unitInfo.id, unitInfo.open_date);
    const avgCheck = curData.orders > 0 ? Math.round(curData.sales / curData.orders) : 0;

    rows.push({
      id: unitInfo.id,
      name: unitInfo.name,
      revenue: curData.sales,
      orders: curData.orders,
      avgCheck,
      lflRevenue: eligible ? pct(curData.sales, compData.sales) : null,
      lflOrders: eligible ? pct(curData.orders, compData.orders) : null,
      yoyRevenue: eligible ? pct(curData.sales, compData.sales) : null,
      yoyOrders: eligible ? pct(curData.orders, compData.orders) : null,
    });
  }

  rows.sort((a, b) => b.revenue - a.revenue);

  const totRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totOrd = rows.reduce((s, r) => s + r.orders, 0);

  // LFL totals: eligible units only
  const eligibleRows = rows.filter((r) => r.lflRevenue !== null);
  const lflCurRev = eligibleRows.reduce((s, r) => s + r.revenue, 0);
  const lflCurOrd = eligibleRows.reduce((s, r) => s + r.orders, 0);
  const lflCompRev = eligibleRows.reduce((s, r) => s + (compMap.get(r.id)?.sales ?? 0), 0);
  const lflCompOrd = eligibleRows.reduce((s, r) => s + (compMap.get(r.id)?.orders ?? 0), 0);

  return {
    units: rows,
    totals: {
      revenue: totRev, orders: totOrd,
      avgCheck: totOrd > 0 ? Math.round(totRev / totOrd) : 0,
      lflRevenue: pct(lflCurRev, lflCompRev),
      lflOrders: pct(lflCurOrd, lflCompOrd),
      yoyRevenue: pct(lflCurRev, lflCompRev),
      yoyOrders: pct(lflCurOrd, lflCompOrd),
    },
  };
}
