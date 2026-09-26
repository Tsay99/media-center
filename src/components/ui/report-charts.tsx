"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NumberTicker } from "./number-ticker";

export type DailyChartPoint = {
  day: string;
  plan: number;
  fact: number;
};

export type PlatformChartPoint = {
  name: string;
  value: number;
};

export type ProductChartPoint = {
  name: string;
  plan: number;
  fact: number;
};

export type RadarChartPoint = {
  metric: string;
  hours: number;
};

export type ProductRadarChartPoint = {
  product: string;
  hours: number;
};

const REPORT_COLORS = ["#2563eb", "#0891b2", "#db2777", "#4f46e5", "#059669", "#d97706"];

const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15, 23, 42, .08)",
  fontSize: 12,
};

function axisName(value: string | number) {
  const name = String(value);
  return name.length > 14 ? name.slice(0, 13) + "…" : name;
}

export function ReportCharts({
  dailyData,
  platformChartData,
  productChartData,
  monthLabel,
  readOnly,
}: {
  dailyData: DailyChartPoint[];
  platformChartData: PlatformChartPoint[];
  productChartData: ProductChartPoint[];
  monthLabel: string;
  readOnly: boolean;
}) {
  return (
    <>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
        <section className="report-card min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="ui-section-title"><h3>Динамика месяца</h3></div>
              <p className="mt-1 text-xs text-gray-500">Плановые материалы и факт-публикации по дням</p>
            </div>
            <span className="ui-badge ui-badge--accent">{monthLabel}</span>
          </div>
          <div className="mt-4 h-[250px] w-full sm:h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="report-plan-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="report-fact-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e6efeb" strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#7c8b85" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#7c8b85" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dce8e2", boxShadow: "0 8px 24px rgba(21, 35, 31, .08)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="plan" name="Плановые материалы" stroke="#2563eb" strokeWidth={2} fill="url(#report-plan-fill)" />
                <Area type="monotone" dataKey="fact" name="Опубликовано" stroke="#059669" strokeWidth={2} fill="url(#report-fact-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="report-card min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
          <div className="ui-section-title"><h3>Опубликовано по площадкам</h3></div>
          <p className="mt-1 text-xs text-gray-500">Распределение публикаций за месяц</p>
          {platformChartData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-center text-sm text-gray-400">
              Пока нет публикаций
              <br />
              для диаграммы
            </div>
          ) : (
            <div className="mt-3 h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformChartData} dataKey="value" nameKey="name" cx="50%" cy="44%" innerRadius="55%" outerRadius="78%" paddingAngle={3} stroke="none">
                    {platformChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend verticalAlign="bottom" height={34} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="report-card mt-4 min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ui-section-title"><h3>План и факт по продуктам</h3></div>
            <p className="mt-1 text-xs text-gray-500">Сравнение целевых публикаций и результата</p>
          </div>
          <span className={readOnly ? "ui-badge" : "ui-badge ui-badge--success"}>{readOnly ? "Просмотр" : "Рабочий отчёт"}</span>
        </div>
        <div className="mt-4 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productChartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#e6efeb" strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={axisName} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#7c8b85" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dce8e2", boxShadow: "0 8px 24px rgba(21, 35, 31, .08)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="plan" name="План" fill="#a7c3ba" radius={[5, 5, 0, 0]} />
              <Bar dataKey="fact" name="Опубликовано" fill="#10b981" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}

export function WorkloadRadarCharts({
  processData,
  productData,
  totalHours,
}: {
  processData: RadarChartPoint[];
  productData: ProductRadarChartPoint[];
  totalHours: number;
}) {
  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/80 bg-white/75 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Радар нагрузки</p>
            <h3 className="mt-1 text-base font-bold text-blue-950">Часы по процессам</h3>
            <p className="mt-1 text-xs text-blue-900/60">Как распределяется рабочее время внутри производства.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
            <NumberTicker value={totalHours} decimalPlaces={1} /> ч
          </span>
        </div>
        {processData.some((item) => item.hours > 0) ? (
          <div className="mt-2 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={processData} outerRadius="72%">
                <PolarGrid stroke="#dbeafe" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#334155" }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} />
                <Radar name="Часы" dataKey="hours" stroke="#2563eb" fill="#2563eb" fillOpacity={0.18} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dbeafe", fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">Нет часов для отображения</div>
        )}
      </section>

      <section className="rounded-2xl border border-white/80 bg-white/75 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Радар нагрузки</p>
            <h3 className="mt-1 text-base font-bold text-blue-950">Часы по продуктам</h3>
            <p className="mt-1 text-xs text-blue-900/60">Сколько времени забирает каждый продукт по текущему плану.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{productData.length} продуктов</span>
        </div>
        {productData.length > 0 ? (
          <div className="mt-2 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={productData} outerRadius="72%">
                <PolarGrid stroke="#d1fae5" />
                <PolarAngleAxis dataKey="product" tick={{ fontSize: 10, fill: "#334155" }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} />
                <Radar name="Часы" dataKey="hours" stroke="#059669" fill="#10b981" fillOpacity={0.18} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d1fae5", fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">Заполните контент-план, чтобы увидеть нагрузку</div>
        )}
      </section>
    </div>
  );
}
