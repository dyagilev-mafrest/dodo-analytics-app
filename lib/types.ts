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

export interface UnitOrders {
  id: string;
  name: string;
  orders: number;
  avgCheck: number;
}

export interface OrdersChartPoint {
  date: string;
  orders: number;
  ordersPrevYear: number;
  avgCheck: number;
  avgCheckPrevYear: number;
  byUnit: UnitOrders[];
}

export interface KpiData {
  revenue: number;
  orders: number;
  avgCheck: number;
  prevRevenue: number;
  prevOrders: number;
  prevAvgCheck: number;
  revenueDelta: number;
  ordersDelta: number;
  avgCheckDelta: number;
  lflRevenue: number;
  lflOrders: number;
  yoyRevenue: number;
  yoyOrders: number;
}
