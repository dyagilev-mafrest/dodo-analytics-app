export interface UnitRevenue {
  id: string;
  name: string;
  revenue: number;
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
  revenuePrevYear: number;
  byUnit: UnitRevenue[];
}

export interface UnitRow {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  avgCheck: number;
  lflRevenue: number | null;
  lflOrders: number | null;
  yoyRevenue: number | null;
  yoyOrders: number | null;
}

export interface Totals {
  revenue: number;
  orders: number;
  avgCheck: number;
  lflRevenue: number;
  lflOrders: number;
  yoyRevenue: number;
  yoyOrders: number;
}

export interface KpiData {
  revenue: number;
  orders: number;
  avgCheck: number;
  revenueDelta: number;
  ordersDelta: number;
  avgCheckDelta: number;
  lflRevenue: number;
  lflOrders: number;
  yoyRevenue: number;
  yoyOrders: number;
}
