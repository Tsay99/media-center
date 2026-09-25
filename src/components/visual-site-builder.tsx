"use client";

import "@puckeditor/core/puck.css";

import { Puck, type Config, type Data } from "@puckeditor/core";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SiteSettings, VisualLayout } from "@/lib/types";

type BlockType = "PageHeader" | "ProductGrid" | "MetricCards" | "Sidebar" | "CalendarToolbar" | "Background";
type BuilderBlock = { type: BlockType; props: Record<string, unknown> };

const BLOCK_TYPES: BlockType[] = ["PageHeader", "ProductGrid", "MetricCards", "Sidebar", "CalendarToolbar", "Background"];
const option = (label: string, value: string | number) => ({ label, value });

const DEFAULT_DATA = {
  root: { props: {} },
  content: [
    { type: "PageHeader", props: { id: "page-header", tone: "blue", align: "left", paddingXpx: 20, paddingYpx: 20, radiusPx: 16, titleSizePx: 24, showEyebrow: "true" } },
    { type: "ProductGrid", props: { id: "product-grid", columnsDesktop: 3, columnsMobile: 2, gapPx: 12, sort: "manual" } },
    { type: "MetricCards", props: { id: "metric-cards", columnsDesktop: 4, columnsMobile: 2, gapPx: 8, showPlan: "true", showFact: "true", showCompletion: "true", showActiveDays: "true" } },
    { type: "Sidebar", props: { id: "sidebar", navItemHeightPx: 40, navGapPx: 4, logoOffsetLeftPx: 20, logoOffsetTopPx: 22, tone: "navy", showTagline: "false" } },
    { type: "CalendarToolbar", props: { id: "calendar-toolbar", paddingYpx: 6, gapPx: 6, showViewSwitch: "true", showFilters: "true" } },
    { type: "Background", props: { id: "background", overlayOpacityPercent: 10, blurPx: 0 } },
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
        paddingXpx: { type: "number", label: "Отступ слева / справа, px", min: 8, max: 64, step: 1 },
        paddingYpx: { type: "number", label: "Отступ сверху / снизу, px", min: 8, max: 48, step: 1 },
        radiusPx: { type: "number", label: "Скругление, px", min: 0, max: 32, step: 1 },
        titleSizePx: { type: "number", label: "Размер заголовка, px", min: 16, max: 40, step: 1 },
        showEyebrow: { type: "radio", label: "Показывать рубрику", options: [option("Да", "true"), option("Нет", "false")] },
      },
      render: ({ tone, align, paddingXpx, paddingYpx, radiusPx, titleSizePx, showEyebrow }: Record<string, unknown>) => <BuilderPreview title="Заголовок страницы" description={`Отступы: ${paddingXpx} × ${paddingYpx} px · скругление: ${radiusPx} px · заголовок: ${titleSizePx} px · ${align === "center" ? "по центру" : "слева"}.`} accent={tone === "emerald" ? "bg-emerald-500" : tone === "violet" ? "bg-violet-500" : "bg-blue-600"}>{showEyebrow !== "false" && <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Рубрика страницы</span>}</BuilderPreview>,
    },
    ProductGrid: {
      label: "Карточки продуктов", defaultProps: DEFAULT_DATA.content[1].props,
      fields: {
        columnsDesktop: { type: "select", label: "Колонки на desktop", options: [option("2", 2), option("3", 3), option("4", 4)] },
        columnsMobile: { type: "select", label: "Колонки на телефоне", options: [option("1", 1), option("2", 2)] },
        gapPx: { type: "number", label: "Расстояние между карточками, px", min: 4, max: 32, step: 1 },
        sort: { type: "select", label: "Порядок", options: [option("Как в справочнике", "manual"), option("По выполнению", "completion"), option("По названию", "name")] },
      },
      render: ({ columnsDesktop, columnsMobile, gapPx, sort }: Record<string, unknown>) => <BuilderPreview title="Карточки продуктов" description={`${columnsDesktop} колонки на desktop, ${columnsMobile} на телефоне; промежуток ${gapPx} px; порядок: ${sort}.`} accent="bg-fuchsia-500"><div className="mt-3 grid grid-cols-3" style={{ gap: `${gapPx}px` }}><span className="h-8 rounded-lg bg-slate-100" /><span className="h-8 rounded-lg bg-slate-100" /><span className="h-8 rounded-lg bg-slate-100" /></div></BuilderPreview>,
    },
    MetricCards: {
      label: "Карточки показателей", defaultProps: DEFAULT_DATA.content[2].props,
      fields: {
        columnsDesktop: { type: "select", label: "Колонки на desktop", options: [option("2", 2), option("3", 3), option("4", 4)] },
        columnsMobile: { type: "select", label: "Колонки на телефоне", options: [option("1", 1), option("2", 2)] },
        gapPx: { type: "number", label: "Расстояние между показателями, px", min: 4, max: 32, step: 1 },
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
        navItemHeightPx: { type: "number", label: "Высота пункта меню, px", min: 28, max: 56, step: 1 },
        navGapPx: { type: "number", label: "Расстояние между пунктами, px", min: 0, max: 16, step: 1 },
        logoOffsetLeftPx: { type: "number", label: "Отступ логотипа слева, px", min: 0, max: 32, step: 1 },
        logoOffsetTopPx: { type: "number", label: "Отступ логотипа сверху, px", min: 0, max: 32, step: 1 },
        tone: { type: "select", label: "Цвет", options: [option("Тёмно-синий", "navy"), option("Графит", "slate"), option("Индиго", "indigo")] },
        showTagline: { type: "radio", label: "Показывать подпись", options: [option("Да", "true"), option("Нет", "false")] },
      },
      render: ({ tone, navItemHeightPx, navGapPx, logoOffsetLeftPx, logoOffsetTopPx, showTagline }: Record<string, unknown>) => <BuilderPreview title="Sidebar" description={`Пункты: высота ${navItemHeightPx} px, интервал ${navGapPx} px · логотип: отступы ${logoOffsetLeftPx} / ${logoOffsetTopPx} px · тема: ${tone}.`} accent="bg-indigo-500">{showTagline === "true" && <p className="mt-2 text-xs font-semibold text-slate-500">Подпись под логотипом включена</p>}</BuilderPreview>,
    },
    CalendarToolbar: {
      label: "Панель календаря", defaultProps: DEFAULT_DATA.content[4].props,
      fields: {
        paddingYpx: { type: "number", label: "Вертикальный отступ, px", min: 0, max: 24, step: 1 },
        gapPx: { type: "number", label: "Расстояние между контролами, px", min: 0, max: 16, step: 1 },
        showViewSwitch: { type: "radio", label: "Месяц / Список", options: [option("Показывать", "true"), option("Скрыть", "false")] },
        showFilters: { type: "radio", label: "Фильтры", options: [option("Показывать", "true"), option("Скрыть", "false")] },
      },
      render: ({ paddingYpx, gapPx, showViewSwitch, showFilters }: Record<string, unknown>) => <BuilderPreview title="Панель календаря" description={`Отступ ${paddingYpx} px · промежуток ${gapPx} px · переключатель: ${showViewSwitch !== "false" ? "виден" : "скрыт"}; фильтры: ${showFilters !== "false" ? "видны" : "скрыты"}.`} accent="bg-amber-500" />,
    },
    Background: {
      label: "Фон", defaultProps: DEFAULT_DATA.content[5].props,
      fields: {
        overlayOpacityPercent: { type: "number", label: "Затемнение, %", min: 0, max: 40, step: 1 },
        blurPx: { type: "number", label: "Размытие, px", min: 0, max: 12, step: 1 },
      },
      render: ({ overlayOpacityPercent, blurPx }: Record<string, unknown>) => <BuilderPreview title="Фон" description={`Затемнение ${overlayOpacityPercent}% · размытие ${blurPx} px. Изображение и положение меняются в основных настройках.`} accent="bg-emerald-500" />,
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
  const px = (value: unknown, fallback: number, min: number, max: number) => { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? Math.round(Math.min(max, Math.max(min, parsed))) : fallback; };
  const header = props("PageHeader"); const grid = props("ProductGrid"); const metrics = props("MetricCards"); const sidebar = props("Sidebar"); const toolbar = props("CalendarToolbar"); const background = props("Background");
  return {
    pageHeader: { tone: optionValue(header.tone, ["blue", "violet", "emerald"] as const, "blue"), align: optionValue(header.align, ["left", "center"] as const, "left"), paddingXpx: px(header.paddingXpx, 20, 8, 64), paddingYpx: px(header.paddingYpx, 20, 8, 48), radiusPx: px(header.radiusPx, 16, 0, 32), titleSizePx: px(header.titleSizePx, 24, 16, 40), showEyebrow: booleanValue(header.showEyebrow, true) },
    productGrid: { columnsDesktop: optionValue(grid.columnsDesktop, [2, 3, 4] as const, 3), columnsMobile: optionValue(grid.columnsMobile, [1, 2] as const, 2), gapPx: px(grid.gapPx, 12, 4, 32), sort: optionValue(grid.sort, ["manual", "completion", "name"] as const, "manual") },
    metricCards: { columnsDesktop: optionValue(metrics.columnsDesktop, [2, 3, 4] as const, 4), columnsMobile: optionValue(metrics.columnsMobile, [1, 2] as const, 2), gapPx: px(metrics.gapPx, 8, 4, 32), showPlan: booleanValue(metrics.showPlan, true), showFact: booleanValue(metrics.showFact, true), showCompletion: booleanValue(metrics.showCompletion, true), showActiveDays: booleanValue(metrics.showActiveDays, true) },
    sidebar: { navItemHeightPx: px(sidebar.navItemHeightPx, 40, 28, 56), navGapPx: px(sidebar.navGapPx, 4, 0, 16), logoOffsetLeftPx: px(sidebar.logoOffsetLeftPx, 20, 0, 32), logoOffsetTopPx: px(sidebar.logoOffsetTopPx, 22, 0, 32), tone: optionValue(sidebar.tone, ["navy", "slate", "indigo"] as const, "navy"), showTagline: booleanValue(sidebar.showTagline, false) },
    calendarToolbar: { paddingYpx: px(toolbar.paddingYpx, 6, 0, 24), gapPx: px(toolbar.gapPx, 6, 0, 16), showViewSwitch: booleanValue(toolbar.showViewSwitch, true), showFilters: booleanValue(toolbar.showFilters, true) },
    background: { overlayOpacityPercent: px(background.overlayOpacityPercent, 10, 0, 40), blurPx: px(background.blurPx, 0, 0, 12) },
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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const settingsFor = (nextData: Data): SiteSettings => {
    const layout = layoutFromPuckData(nextData);
    return { ...settings, logoSidebarHorizontalPadding: layout.sidebar?.logoOffsetLeftPx, logoSidebarTopOffset: layout.sidebar?.logoOffsetTopPx, visualEditor: { puckData: nextData as unknown as Record<string, unknown>, layout } };
  };
  const sendPreview = (nextSettings: SiteSettings) => {
    onPreview(nextSettings);
    frameRef.current?.contentWindow?.postMessage({ type: "media-center-visual-preview", siteSettings: nextSettings }, window.location.origin);
  };
  useEffect(() => {
    const receiveReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow || event.data?.type !== "media-center-visual-preview-ready") return;
      const layout = layoutFromPuckData(data);
      const nextSettings = { ...settings, logoSidebarHorizontalPadding: layout.sidebar?.logoOffsetLeftPx, logoSidebarTopOffset: layout.sidebar?.logoOffsetTopPx, visualEditor: { puckData: data as unknown as Record<string, unknown>, layout } };
      onPreview(nextSettings);
      frameRef.current?.contentWindow?.postMessage({ type: "media-center-visual-preview", siteSettings: nextSettings }, window.location.origin);
    };
    window.addEventListener("message", receiveReady);
    return () => window.removeEventListener("message", receiveReady);
  }, [data, settings, onPreview]);
  const preview = (nextData: Data) => { const safeData = normalizeData(nextData); setData(safeData); sendPreview(settingsFor(safeData)); };
  const publish = (nextData: Data) => { const safeData = normalizeData(nextData); const nextSettings = settingsFor(safeData); onPublish(nextSettings); };
  const sendCurrentPreview = () => sendPreview(settingsFor(data));
  return <div className="site-builder grid gap-4"><div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><ShieldCheck size={19} /></span><div><p className="text-sm font-bold text-slate-900">Защищённый конструктор интерфейса</p><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Правьте блоки и сразу смотрите изменения в настоящем интерфейсе. Размеры и интервалы задаются в px; публикация сохранит черновик.</p></div></div><button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><ArrowLeft size={15} /> К настройкам</button></div><div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"><section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-900">Настройки элементов</h2><p className="mt-0.5 text-xs text-slate-500">Числовые размеры можно вводить в px</p></div></div><Puck config={config} data={data} onChange={preview} onPublish={publish} headerTitle="Конструктор Медиа Центра" height="calc(78vh - 4rem)" permissions={{ insert: false, delete: false, duplicate: false, drag: true, edit: true }} /></section><section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Предпросмотр сайта</h2><p className="mt-0.5 text-xs text-slate-500">Обновляется при каждом изменении настройки</p></div><iframe ref={frameRef} title="Живой предпросмотр сайта" src="/?visualPreview=1" onLoad={sendCurrentPreview} className="h-[70vh] min-h-[520px] w-full bg-slate-50" /></section></div></div>;
}
