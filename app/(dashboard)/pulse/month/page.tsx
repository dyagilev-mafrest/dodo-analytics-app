import { createServerSupabase } from "@/lib/supabase-server";
import { getKpis } from "@/lib/queries/overview";
import { TrendingUp, TrendingDown, Zap, ShieldAlert, Users, Star, Package } from "lucide-react";

// ─── period helpers ───────────────────────────────────────────────────────────

function getYakutskNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function computePrevMonth(): { from: string; to: string } {
  const now = getYakutskNow();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from: toDateStr(from), to: toDateStr(to) };
}

function formatDateRange(from: string, to: string) {
  const f = new Date(from + "T00:00:00Z");
  const t = new Date(to + "T00:00:00Z");
  const monthName = f.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return `${f.getUTCDate()} — ${t.getUTCDate()} ${monthName}`;
}

// ─── format helpers ───────────────────────────────────────────────────────────

function fmtRub(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ─── components ───────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} className="text-[#ff4e00] shrink-0" />
      <h2 className="text-sm font-semibold text-[#120f0c] dark:text-[#FBF3E6] shrink-0" style={{ fontFamily: '"Rooftop", sans-serif' }}>
        {title}
      </h2>
      <div className="flex-1 h-px bg-[#ddd0b5] dark:bg-[#3d352c]" />
    </div>
  );
}

interface MetricRow { label: string; value: string; prev?: string; delta?: number }

function ChannelCard({ title, metrics }: { title: string; metrics: MetricRow[] | null }) {
  return (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] p-4">
      <p className="text-[10px] uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>
        {title}
      </p>
      {metrics ? (
        <div className="space-y-4">
          {metrics.map((m, i) => (
            <div key={i}>
              {i > 0 && <div className="border-t border-[#ddd0b5] dark:border-[#3d352c] -mx-4 mb-4" />}
              <p className="text-[10px] uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a] mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{m.label}</p>
              <p className="text-xl font-extrabold text-[#120f0c] dark:text-[#FBF3E6] leading-none mb-1" style={{ fontFamily: '"Rooftop", sans-serif' }}>{m.value}</p>
              {m.prev !== undefined && (
                <div className="flex items-center gap-2 text-xs flex-wrap" style={{ fontFamily: "Inter, sans-serif" }}>
                  <span className="text-[#7d6f5e] dark:text-[#a0907a]">год назад: {m.prev}</span>
                  {m.delta !== undefined && (
                    <span className={`flex items-center gap-0.5 font-medium ${m.delta >= 0 ? "text-[#16a34a] dark:text-[#4ade80]" : "text-[#dc2626] dark:text-[#f87171]"}`}>
                      {m.delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {m.delta >= 0 ? "+" : ""}{m.delta.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 min-h-[80px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd0b5] dark:bg-[#3d352c] shrink-0" />
          <p className="text-sm text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>Подключается</p>
        </div>
      )}
    </div>
  );
}

function LflPill({ label, value, isTeal }: { label: string; value: string; isTeal?: boolean }) {
  const num = parseFloat(value);
  const color = isNaN(num) || num === 0 ? "#7d6f5e" : num < 0 ? "#dc2626" : isTeal ? "#0d9488" : "#16a34a";
  return (
    <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-[#ddd0b5] dark:border-[#3d352c] px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a] mb-1.5" style={{ fontFamily: "Inter, sans-serif" }}>{label}</p>
      <p className="text-lg font-bold leading-none" style={{ fontFamily: '"Rooftop", sans-serif', color }}>{value}</p>
    </div>
  );
}

function PlaceholderSection({ icon, title, items }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; items: string[] }) {
  return (
    <div className="space-y-3">
      <SectionHeader icon={icon} title={title} />
      <div className="bg-white dark:bg-[#1e1710] rounded-xl border border-dashed border-[#ddd0b5] dark:border-[#3d352c] px-5 py-4">
        <p className="text-xs text-[#a0907a] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>Подключается</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="text-xs px-2.5 py-1 rounded-md bg-[#f0e4cc] dark:bg-[#241f18] text-[#7d6f5e] dark:text-[#a0907a]" style={{ fontFamily: "Inter, sans-serif" }}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function PulseMonthPage() {
  const period = computePrevMonth();
  const supabase = await createServerSupabase();
  const kpis = await getKpis(supabase, { from: period.from, to: period.to }, "all", "week");

  const networkMetrics: MetricRow[] = [
    { label: "Выручка",     value: fmtRub(kpis.revenue),  prev: fmtRub(kpis.prevRevenue),  delta: kpis.revenueDelta },
    { label: "Заказы",      value: fmt(kpis.orders),       prev: fmt(kpis.prevOrders),       delta: kpis.ordersDelta },
    { label: "Средний чек", value: fmtRub(kpis.avgCheck), prev: fmtRub(kpis.prevAvgCheck), delta: kpis.avgCheckDelta },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl text-[#120f0c] dark:text-[#FBF3E6]" style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 700 }}>
          Бизнес-пульс — Месяц
        </h1>
        <p className="text-sm text-[#7d6f5e] dark:text-[#a0907a] mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
          {formatDateRange(period.from, period.to)}
        </p>
      </div>

      {/* Продажи */}
      <div className="space-y-4">
        <SectionHeader icon={TrendingUp} title="Продажи" />
        <div className="grid grid-cols-3 gap-4">
          <ChannelCard title="Сеть" metrics={networkMetrics} />
          <ChannelCard title="Доставка" metrics={null} />
          <ChannelCard title="Ресторан" metrics={null} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <LflPill label="LFL выручки" value={fmtPct(kpis.lflRevenue)} isTeal />
          <LflPill label="YoY выручки" value={fmtPct(kpis.yoyRevenue)} />
          <LflPill label="LFL заказов" value={fmtPct(kpis.lflOrders)} isTeal />
          <LflPill label="YoY заказов" value={fmtPct(kpis.yoyOrders)} />
        </div>
      </div>

      <PlaceholderSection icon={Zap} title="Операционная эффективность" items={["Производительность кухни (шт/чел)", "Производительность кухни (₽/чел/час)", "Дисконт", "Дисконт доставки", "Дисконт ресторана", "Дисконт по категориям"]} />
      <PlaceholderSection icon={ShieldAlert} title="Качество и стопы" items={["Стопы по пиццериям", "Стопы по секторам", "Стопы продуктов", "Стопы ключевых ингредиентов", "Потери и излишки"]} />
      <PlaceholderSection icon={Users} title="Персонал" items={["Заявки на курьеров", "Закрытые заявки на курьеров", "Уволенные курьеры", "Заявки на линейных сотрудников", "Принятые сотрудники", "Уволенные сотрудники"]} />
      <PlaceholderSection icon={Star} title="Клиентский опыт" items={["SCONT", "Рейтинг клиентского опыта", "Рейтинг клиента", "Коэффициент проблемности сети"]} />
      <PlaceholderSection icon={Package} title="Склад и логистика" items={["Остатки ТЗ в рублях (конец месяца)", "Сумма товаров в пути", "Сумма списаний центрального склада"]} />
    </div>
  );
}
