import type { SupabaseClient } from "@supabase/supabase-js";
import type { KpiData, ChannelKpi, RevenueChartPoint, OrdersChartPoint, UnitRow, Totals } from "@/lib/types";

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

async function rpcSumSalesByUnit(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<{ data: RpcUnitRow[] | null; error: unknown }> {
  const res = await supabase.rpc("sum_sales_by_unit", { p_from: from, p_to: to });
  return { data: res.data as RpcUnitRow[] | null, error: res.error };
}

async function fetchUnitsOpenDate(
  supabase: SupabaseClient
): Promise<{ id: string; open_date: string | null }[]> {
  const res = await supabase.from("units").select("id, open_date");
  return (res.data ?? []) as { id: string; open_date: string | null }[];
}

async function fetchUnitsInfo(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; open_date: string | null }[]> {
  const res = await supabase.from("units").select("id, name, open_date");
  return (res.data ?? []) as { id: string; name: string; open_date: string | null }[];
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

  const [curTotal, prevTotal, curByUnitRes, compByUnitRes, unitsOpenDates] = await Promise.all([
    rpcSumSales(supabase, cur.from, cur.to, unitId),
    rpcSumSales(supabase, comp.from, comp.to, unitId),
    rpcSumSalesByUnit(supabase, cur.from, cur.to),
    rpcSumSalesByUnit(supabase, comp.from, comp.to),
    fetchUnitsOpenDate(supabase),
  ]);

  const revenue = curTotal.sales;
  const orders = curTotal.orders;
  const avgCheck = orders > 0 ? Math.round(revenue / orders) : 0;
  const prevRevenue = prevTotal.sales;
  const prevOrders = prevTotal.orders;
  const prevAvgCheck = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

  const curRows: RpcUnitRow[] = curByUnitRes.data ?? [];
  const compRows: RpcUnitRow[] = compByUnitRes.data ?? [];
  const openDateMap = new Map(unitsOpenDates.map((u) => [u.id, u.open_date]));

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
    prevRevenue, prevOrders, prevAvgCheck,
    revenueDelta: pct(revenue, prevRevenue),
    ordersDelta: pct(orders, prevOrders),
    avgCheckDelta: pct(avgCheck, prevAvgCheck),
    lflRevenue, lflOrders,
    yoyRevenue: lflRevenue,
    yoyOrders: lflOrders,
  };
}

// ── Channel KPIs (sales_breakdown) ───────────────────────────────────────────

type RawBreakdown = { sales_channel: string; sales: number; orders_count: number };

const DELIVERY_CHANNELS = ["Delivery"];
const RESTAURANT_CHANNELS = ["Dine-in", "Takeaway"];

function aggChannel(rows: RawBreakdown[], channels: string[]) {
  let revenue = 0, orders = 0;
  for (const r of rows) {
    if (channels.includes(r.sales_channel)) {
      revenue += Number(r.sales);
      orders += Number(r.orders_count);
    }
  }
  const avgCheck = orders > 0 ? Math.round(revenue / orders) : 0;
  return { revenue: Math.round(revenue), orders, avgCheck };
}

export async function getChannelKpis(
  supabase: SupabaseClient,
  dateParams: DateParams
): Promise<{ delivery: ChannelKpi; restaurant: ChannelKpi }> {
  const cur = resolveRange(dateParams);
  const comp = shift364Days(cur);

  const [curRes, prevRes] = await Promise.all([
    supabase.from("sales_breakdown")
      .select("sales_channel, sales, orders_count")
      .gte("date", cur.from).lte("date", cur.to),
    supabase.from("sales_breakdown")
      .select("sales_channel, sales, orders_count")
      .gte("date", comp.from).lte("date", comp.to),
  ]);

  if (curRes.error) throw curRes.error;
  if (prevRes.error) throw prevRes.error;

  const curRows = (curRes.data ?? []) as RawBreakdown[];
  const prevRows = (prevRes.data ?? []) as RawBreakdown[];

  const cDel = aggChannel(curRows, DELIVERY_CHANNELS);
  const pDel = aggChannel(prevRows, DELIVERY_CHANNELS);
  const cRest = aggChannel(curRows, RESTAURANT_CHANNELS);
  const pRest = aggChannel(prevRows, RESTAURANT_CHANNELS);

  return {
    delivery: {
      revenue: cDel.revenue, orders: cDel.orders, avgCheck: cDel.avgCheck,
      prevRevenue: pDel.revenue, prevOrders: pDel.orders, prevAvgCheck: pDel.avgCheck,
      revenueDelta: pct(cDel.revenue, pDel.revenue),
      ordersDelta: pct(cDel.orders, pDel.orders),
      avgCheckDelta: pct(cDel.avgCheck, pDel.avgCheck),
    },
    restaurant: {
      revenue: cRest.revenue, orders: cRest.orders, avgCheck: cRest.avgCheck,
      prevRevenue: pRest.revenue, prevOrders: pRest.orders, prevAvgCheck: pRest.avgCheck,
      revenueDelta: pct(cRest.revenue, pRest.revenue),
      ordersDelta: pct(cRest.orders, pRest.orders),
      avgCheckDelta: pct(cRest.avgCheck, pRest.avgCheck),
    },
  };
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

type RawDailySale = { date: string; unit_id: string; sales: number; orders_count: number };

function getPeriodStart(dateStr: string, gran: Granularity): string {
  if (gran === "month") return dateStr.slice(0, 7) + "-01";
  if (gran === "week") {
    const d = new Date(dateStr + "T00:00:00Z");
    const daysSinceMon = (d.getUTCDay() + 6) % 7;
    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() - daysSinceMon);
    return mon.toISOString().slice(0, 10);
  }
  return dateStr;
}

// ── Revenue chart ──────────────────────────────────────────────────────────────

export async function getRevenueChart(
  supabase: SupabaseClient,
  dateParams: DateParams,
  _unitId: string,
  gran: Granularity
): Promise<RevenueChartPoint[]> {
  const cur = resolveRange(dateParams);
  const prev = shiftYear(cur, -1);

  const [{ data: curData, error: e1 }, { data: prevData, error: e2 }] = await Promise.all([
    supabase.from("daily_sales").select("date,unit_id,sales").gte("date", cur.from).lte("date", cur.to),
    supabase.from("daily_sales").select("date,unit_id,sales").gte("date", prev.from).lte("date", prev.to),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const rows = (curData as Pick<RawDailySale, "date" | "unit_id" | "sales">[]) ?? [];
  const prevRows = (prevData as Pick<RawDailySale, "date" | "unit_id" | "sales">[]) ?? [];
  const unitIds = new Set<string>();

  const byPeriod = new Map<string, { revenue: number; byUnit: Map<string, number> }>();
  for (const row of rows) {
    const period = getPeriodStart(row.date, gran);
    unitIds.add(row.unit_id);
    if (!byPeriod.has(period)) byPeriod.set(period, { revenue: 0, byUnit: new Map() });
    const entry = byPeriod.get(period)!;
    entry.revenue += Number(row.sales);
    entry.byUnit.set(row.unit_id, (entry.byUnit.get(row.unit_id) ?? 0) + Number(row.sales));
  }

  const prevByPeriodTotal = new Map<string, number>();
  const prevByPeriodUnit = new Map<string, Map<string, number>>();
  const prevByUnitAll = new Map<string, number>();
  for (const row of prevRows) {
    const period = getPeriodStart(shiftDateByYear(row.date, 1), gran);
    const sales = Number(row.sales);
    prevByPeriodTotal.set(period, (prevByPeriodTotal.get(period) ?? 0) + sales);
    prevByUnitAll.set(row.unit_id, (prevByUnitAll.get(row.unit_id) ?? 0) + sales);
    if (!prevByPeriodUnit.has(period)) prevByPeriodUnit.set(period, new Map());
    const uMap = prevByPeriodUnit.get(period)!;
    uMap.set(row.unit_id, (uMap.get(row.unit_id) ?? 0) + sales);
  }

  const lflIds = [...unitIds].filter((id) => (prevByUnitAll.get(id) ?? 0) > 0);
  const nameMap = await fetchUnitNames(supabase, [...unitIds]);

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => {
      const prevUnitMap = prevByPeriodUnit.get(date) ?? new Map<string, number>();
      const lfl = lflIds.reduce((s, id) => s + (entry.byUnit.get(id) ?? 0), 0);
      const lflPrevYear = lflIds.reduce((s, id) => s + (prevUnitMap.get(id) ?? 0), 0);
      return {
        date,
        revenue: entry.revenue,
        revenuePrevYear: prevByPeriodTotal.get(date) ?? 0,
        lfl,
        lflPrevYear,
        byUnit: [...entry.byUnit.entries()]
          .map(([id, revenue]) => ({ id, name: nameMap.get(id) ?? id, revenue }))
          .sort((a, b) => b.revenue - a.revenue),
      };
    });
}

// ── Orders chart ──────────────────────────────────────────────────────────────

export async function getOrdersChart(
  supabase: SupabaseClient,
  dateParams: DateParams,
  gran: Granularity
): Promise<OrdersChartPoint[]> {
  const cur = resolveRange(dateParams);
  const prev = shiftYear(cur, -1);

  const [{ data: curData, error: e1 }, { data: prevData, error: e2 }] = await Promise.all([
    supabase.from("daily_sales").select("date,unit_id,sales,orders_count").gte("date", cur.from).lte("date", cur.to),
    supabase.from("daily_sales").select("date,unit_id,sales,orders_count").gte("date", prev.from).lte("date", prev.to),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const rows = (curData as RawDailySale[]) ?? [];
  const prevRows = (prevData as RawDailySale[]) ?? [];
  const unitIds = new Set<string>();

  const byPeriod = new Map<string, { orders: number; revenue: number; byUnit: Map<string, { orders: number; revenue: number }> }>();
  for (const row of rows) {
    const period = getPeriodStart(row.date, gran);
    unitIds.add(row.unit_id);
    if (!byPeriod.has(period)) byPeriod.set(period, { orders: 0, revenue: 0, byUnit: new Map() });
    const entry = byPeriod.get(period)!;
    entry.orders += Number(row.orders_count);
    entry.revenue += Number(row.sales);
    const u = entry.byUnit.get(row.unit_id) ?? { orders: 0, revenue: 0 };
    u.orders += Number(row.orders_count);
    u.revenue += Number(row.sales);
    entry.byUnit.set(row.unit_id, u);
  }

  const prevByPeriodTotal = new Map<string, { orders: number; revenue: number }>();
  const prevByPeriodUnit = new Map<string, Map<string, { orders: number; revenue: number }>>();
  const prevByUnitAll = new Map<string, number>();
  for (const row of prevRows) {
    const period = getPeriodStart(shiftDateByYear(row.date, 1), gran);
    const sales = Number(row.sales);
    const ords = Number(row.orders_count);
    const tot = prevByPeriodTotal.get(period) ?? { orders: 0, revenue: 0 };
    tot.orders += ords; tot.revenue += sales;
    prevByPeriodTotal.set(period, tot);
    prevByUnitAll.set(row.unit_id, (prevByUnitAll.get(row.unit_id) ?? 0) + sales);
    if (!prevByPeriodUnit.has(period)) prevByPeriodUnit.set(period, new Map());
    const uMap = prevByPeriodUnit.get(period)!;
    const pu = uMap.get(row.unit_id) ?? { orders: 0, revenue: 0 };
    pu.orders += ords; pu.revenue += sales;
    uMap.set(row.unit_id, pu);
  }

  const lflIds = [...unitIds].filter((id) => (prevByUnitAll.get(id) ?? 0) > 0);
  const nameMap = await fetchUnitNames(supabase, [...unitIds]);

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => {
      const prevEntry = prevByPeriodTotal.get(date) ?? { orders: 0, revenue: 0 };
      const prevUnitMap = prevByPeriodUnit.get(date) ?? new Map<string, { orders: number; revenue: number }>();
      const lflOrd = lflIds.reduce((s, id) => s + (entry.byUnit.get(id)?.orders ?? 0), 0);
      const lflRev = lflIds.reduce((s, id) => s + (entry.byUnit.get(id)?.revenue ?? 0), 0);
      const lflPrevOrd = lflIds.reduce((s, id) => s + (prevUnitMap.get(id)?.orders ?? 0), 0);
      const lflPrevRev = lflIds.reduce((s, id) => s + (prevUnitMap.get(id)?.revenue ?? 0), 0);
      return {
        date,
        orders: entry.orders,
        ordersPrevYear: prevEntry.orders,
        avgCheck: entry.orders > 0 ? Math.round(entry.revenue / entry.orders) : 0,
        avgCheckPrevYear: prevEntry.orders > 0 ? Math.round(prevEntry.revenue / prevEntry.orders) : 0,
        lflOrders: lflOrd,
        lflOrdersPrevYear: lflPrevOrd,
        lflAvgCheck: lflOrd > 0 ? Math.round(lflRev / lflOrd) : 0,
        lflAvgCheckPrevYear: lflPrevOrd > 0 ? Math.round(lflPrevRev / lflPrevOrd) : 0,
        byUnit: [...entry.byUnit.entries()]
          .map(([id, u]) => ({
            id,
            name: nameMap.get(id) ?? id,
            orders: u.orders,
            avgCheck: u.orders > 0 ? Math.round(u.revenue / u.orders) : 0,
          }))
          .sort((a, b) => b.orders - a.orders),
      };
    });
}

// ── Units table ────────────────────────────────────────────────────────────────

export async function getUnitsTable(
  supabase: SupabaseClient,
  dateParams: DateParams,
  gran: Granularity
): Promise<{ units: UnitRow[]; totals: Totals }> {
  const cur = resolveRange(dateParams);
  const comp = shift364Days(cur);

  const [curByUnitRes, compByUnitRes, unitsData] = await Promise.all([
    rpcSumSalesByUnit(supabase, cur.from, cur.to),
    rpcSumSalesByUnit(supabase, comp.from, comp.to),
    fetchUnitsInfo(supabase),
  ]);

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
  for (const unitInfo of unitsData) {
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
