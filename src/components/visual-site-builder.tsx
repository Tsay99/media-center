"use client";

import "@puckeditor/core/puck.css";

import { Puck, type Config, type Data } from "@puckeditor/core";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { SiteSettings, VisualLayout } from "@/lib/types";

type BlockType = "PageHeader" | "ProductGrid" | "MetricCards" | "Sidebar" | "CalendarToolbar" | "Background";
type BuilderBlock = { type: BlockType; props: Record<string, unknown> };

const BLOCK_TYPES: BlockType[] = ["PageHeader", "ProductGrid", "MetricCards", "Sidebar", "CalendarToolbar", "Background"];
const option = (label: string, value: string | number) => ({ label, value });

const DEFAULT_DATA = {
  root: { props: {} },
  content: [
    { type: "PageHeader", props: { id: "page-header", tone: "blue", align: "left", density: "comfortable", showEyebrow: "true" } },
    { type: "ProductGrid", props: { id: "product-grid", columnsDesktop: 3, columnsMobile: 2, gap: "comfortable", sort: "manual" } },
    { type: "MetricCards", props: { id: "metric-cards", columnsDesktop: 4, columnsMobile: 2, showPlan: "true", showFact: "true", showCompletion: "true", showActiveDays: "true" } },
    { type: "Sidebar", props: { id: "sidebar", density: "comfortable", tone: "navy", showTagline: "false" } },
    { type: "CalendarToolbar", props: { id: "calendar-toolbar", density: "comfortable", showViewSwitch: "true", showFilters: "true" } },
    { type: "Background", props: { id: "background", overlay: "soft", blur: "none" } },
  ],
} as Data;

function BuilderPreview({ title, description, accent = "bg-blue-600", children }: { title: string; description: string; accent?: string; children?: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${accent}`} /><div className="min-w-0"><p className="text-sm font-bold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>{children}</div></div></section>;
}

const config = {
  categories: { workspace: { title: "Защищённые блоки", components: BLOCK_TYPES, defaultExpanded: true } },
  components: {
    PageHeader: {
      label: "Заголовок страницы", defaultProps: DEFAULT_DATA.content[0].props,
      fields: {
        tone: { type: "select", label: "Акцент", options: [option("Синий", "blue"), option("Фиолетовый", "violet"), option("Зелёный", "emerald")] },
        align: { type: "select", label: "Выравнивание", options: [option("Слева", "left"), option("По центру", "center")] },
        density: { type: "select", label: "Высота", options: [option("Компактно", "compact"), option("Комфортно", "comfortable")] },
        showEyebrow: { type: "radio", label: "Показывать рубрику", options: [option("Да", "true"), option("Нет", "false")] },
      },
      render: ({ tone, align, density, showEyebrow }: Record<string, unknown>) => <BuilderPreview title="Заголовок страницы" description={`Акцент: ${tone}; ${align === "center" ? "по центру" : "слева"}; ${density === "compact" ? "компактный" : "обычный"} размер.`} accent={tone === "emerald" ? "bg-emerald-500" : tone === "violet" ? "bg-violet-500" : "bg-blue-600"}>{showEyebrow !== "false" && <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Рубрика страницы</span>}</BuilderPreview>,
    },
    ProductGrid: {
      label: "Карточки продуктов", defaultProps: DEFAULT_DATA.content[1].props,
      fields: {
        columnsDesktop: { type: "select", label: "Колонки на desktop", options: [option("2", 2), option("3", 3), option("4", 4)] },
        columnsMobile: { type: "select", label: "Колонки на телефоне", options: [option("1", 1), option("2", 2)] },
        gap: { type: "select", label: "Расстояние", options: [option("Компактно", "compact"), option("Комфортно", "comfortable")] },
        sort: { type: "select", label: "Порядок", options: [option("Как в справочнике", "manual"), option("По выполнению", "completion"), option("По названию", "name")] },
      },
      render: ({ columnsDesktop, columnsMobile, gap, sort }: Record<string, unknown>) => <BuilderPreview title="Карточки продуктов" description={`${columnsDesktop} колонки на desktop, ${columnsMobile} на телефоне; ${gap === "compact" ? "компактный" : "обычный"} интервал; сортировка: ${sort}.`} accent="bg-fuchsia-500"><div className="mt-3 grid grid-cols-3 gap-1.5"><span className="h-8 rounded-lg bg-slate-100" /><span className="h-8 rounded-lg bg-slate-100" /><span className="h-8 rounded-lg bg-slate-100" /></div></BuilderPreview>,
    },
    MetricCards: {
      label: "Карточки показателей", defaultProps: DEFAULT_DATA.content[2].props,
      fields: {
        columnsDesktop: { type: "select", label: "Колонки на desktop", options: [option("2", 2), option("3", 3), option("4", 4)] },
        columnsMobile: { type: "select", label: "Колонки на телефоне", options: [option("1", 1), option("2", 2)] },
        showPlan: { type: "radio", label: "Показывать план", options: [option("Да", "true"), option("Нет", "false")] },
        showFact: { type: "radio", label: "Показывать факт", options: [option("Да", "true"), option("Нет", "false")] },
        showCompletion: { type: "radio", label: "Показывать выполнение", options: [option("Да", "true"), option("Нет", "false")] },
        showActiveDays: { type: "radio", label: "Показывать активные дни", options: [option("Да", "true"), option("Нет", "false")] },
      },
      render: () => <BuilderPreview title="Карточки показателей" description="Количество колонок и видимость четырёх показателей в главной сводке." accent="bg-sky-500"><div className="mt-3 flex gap-1.5"><span className="h-8 flex-1 rounded-lg bg-blue-50" /><span className="h-8 flex-1 rounded-lg bg-blue-50" /><span className="h-8 flex-1 rounded-lg bg-blue-50" /></div></BuilderPreview>,
    },
    Sidebar: {
      label: "Sidebar", defaultProps: DEFAULT_DATA.content[3].props,
      fields: {
        density: { type: "select", label: "Плотность меню", options: [option("Компактно", "compact"), option("Комфортно", "comfortable")] },
        tone: { type: "select", label: "Цвет", options: [option("Тёмно-синий", "navy"), option("Графит", "slate"), option("Индиго", "indigo")] },
        showTagline: { type: "radio", label: "Показывать подпись", options: [option("Да", "true"), option("Нет", "false")] },
      },
      render: ({ tone, density, showTagline }: Record<string, unknown>) => <BuilderPreview title="Sidebar" description={`Тема: ${tone}; ${density === "compact" ? "компактное" : "обычное"} меню.`} accent="bg-indigo-500">{showTagline === "true" && <p className="mt-2 text-xs font-semibold text-slate-500">Подпись под логотипом включена</p>}</BuilderPreview>,
    },
    CalendarToolbar: {
      label: "Панель календаря", defaultProps: DEFAULT_DATA.content[4].props,
      fields: {
        density: { type: "select", label: "Плотность", options: [option("Компактно", "compact"), option("Комфортно", "comfortable")] },
        showViewSwitch: { type: "radio", label: "Месяц / Список", options: [option("Показывать", "true"), option("Скрыть", "false")] },
        showFilters: { type: "radio", label: "Фильтры", options: [option("Показывать", "true"), option("Скрыть", "false")] },
      },
      render: ({ density, showViewSwitch, showFilters }: Record<string, unknown>) => <BuilderPreview title="Панель календаря" description={`${density === "compact" ? "Компактная" : "Обычная"} панель; переключатель: ${showViewSwitch !== "false" ? "виден" : "скрыт"}; фильтры: ${showFilters !== "false" ? "видны" : "скрыты"}.`} accent="bg-amber-500" />,
    },
    Background: {
      label: "Фон", defaultProps: DEFAULT_DATA.content[5].props,
      fields: {
        overlay: { type: "select", label: "Затемнение", options: [option("Без слоя", "none"), option("Мягкое", "soft"), option("Сильное", "strong")] },
        blur: { type: "select", label: "Размытие", options: [option("Без размытия", "none"), option("Мягкое", "soft")] },
      },
      render: ({ overlay, blur }: Record<string, unknown>) => <BuilderPreview title="Фон" description={`Слой: ${overlay}; размытие: ${blur}. Само изображение, прозрачность и положение меняются в основных настройках.`} accent="bg-emerald-500" />,
    },
  },
} as Config;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isBlock(value: unknown): value is BuilderBlock { return isRecord(value) && typeof value.type === "string" && BLOCK_TYPES.includes(value.type as BlockType) && isRecord(value.props); }
function booleanValue(value: unknown, fallback: boolean) { return value === true || value === "true" ? true : value === false || value === "false" ? false : fallback; }
function optionValue<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T) { return allowed.includes(value as T) ? value as T : fallback; }

export function layoutFromPuckData(value: unknown): VisualLayout {
  const blocks = isRecord(value) && Array.isArray(value.content) ? value.content.filter(isBlock) : [];
  const props = (type: BlockType) => blocks.find((block) => block.type === type)?.props ?? {};
  const header = props("PageHeader"); const grid = props("ProductGrid"); const metrics = props("MetricCards"); const sidebar = props("Sidebar"); const toolbar = props("CalendarToolbar"); const background = props("Background");
  return {
    pageHeader: { tone: optionValue(header.tone, ["blue", "violet", "emerald"] as const, "blue"), align: optionValue(header.align, ["left", "center"] as const, "left"), density: optionValue(header.density, ["compact", "comfortable"] as const, "comfortable"), showEyebrow: booleanValue(header.showEyebrow, true) },
    productGrid: { columnsDesktop: optionValue(grid.columnsDesktop, [2, 3, 4] as const, 3), columnsMobile: optionValue(grid.columnsMobile, [1, 2] as const, 2), gap: optionValue(grid.gap, ["compact", "comfortable"] as const, "comfortable"), sort: optionValue(grid.sort, ["manual", "completion", "name"] as const, "manual") },
    metricCards: { columnsDesktop: optionValue(metrics.columnsDesktop, [2, 3, 4] as const, 4), columnsMobile: optionValue(metrics.columnsMobile, [1, 2] as const, 2), showPlan: booleanValue(metrics.showPlan, true), showFact: booleanValue(metrics.showFact, true), showCompletion: booleanValue(metrics.showCompletion, true), showActiveDays: booleanValue(metrics.showActiveDays, true) },
    sidebar: { density: optionValue(sidebar.density, ["compact", "comfortable"] as const, "comfortable"), tone: optionValue(sidebar.tone, ["navy", "slate", "indigo"] as const, "navy"), showTagline: booleanValue(sidebar.showTagline, false) },
    calendarToolbar: { density: optionValue(toolbar.density, ["compact", "comfortable"] as const, "comfortable"), showViewSwitch: booleanValue(toolbar.showViewSwitch, true), showFilters: booleanValue(toolbar.showFilters, true) },
    background: { overlay: optionValue(background.overlay, ["none", "soft", "strong"] as const, "soft"), blur: optionValue(background.blur, ["none", "soft"] as const, "none") },
  };
}

function normalizeData(value: unknown): Data {
  const incoming = isRecord(value) && Array.isArray(value.content) ? value.content.filter(isBlock) : [];
  const unique = incoming.filter((block, index) => incoming.findIndex((candidate) => candidate.type === block.type) === index);
  const missing = DEFAULT_DATA.content.filter((block) => !unique.some((candidate) => candidate.type === block.type));
  return { root: { props: {} }, content: [...unique, ...missing] } as Data;
}

export default function VisualSiteBuilder({ settings, onPreview, onPublish, onClose }: { settings: SiteSettings; onPreview: (next: SiteSettings) => void; onPublish: (next: SiteSettings) => void; onClose: () => void }) {
  const initialData = useMemo(() => normalizeData(settings.visualEditor?.puckData), [settings.visualEditor?.puckData]);
  const [data, setData] = useState<Data>(initialData);
  const preview = (nextData: Data) => { const safeData = normalizeData(nextData); setData(safeData); onPreview({ ...settings, visualEditor: { puckData: safeData as unknown as Record<string, unknown>, layout: layoutFromPuckData(safeData) } }); };
  const publish = (nextData: Data) => { const safeData = normalizeData(nextData); onPublish({ ...settings, visualEditor: { puckData: safeData as unknown as Record<string, unknown>, layout: layoutFromPuckData(safeData) } }); };
  return <div className="site-builder grid gap-4"><div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><ShieldCheck size={19} /></span><div><p className="text-sm font-bold text-slate-900">Защищённый конструктор интерфейса</p><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Меняйте только шесть разрешённых блоков. Календарь, задачи, публикации и данные Supabase остаются защищёнными.</p></div></div><button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><ArrowLeft size={15} /> К настройкам</button></div><Puck config={config} data={data} onChange={preview} onPublish={publish} headerTitle="Конструктор Медиа Центра" height="calc(100vh - 11rem)" permissions={{ insert: false, delete: false, duplicate: false, drag: true, edit: true }} /></div>;
}
