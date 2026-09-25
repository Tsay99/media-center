"use client";

import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, isSameMonth, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { ChangeEvent, createContext, CSSProperties, DragEvent as ReactDragEvent, FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { IconType } from "react-icons";
import { SiFacebook, SiInstagram, SiPinterest, SiTelegram, SiThreads, SiTiktok, SiVk, SiWhatsapp, SiYoutube } from "react-icons/si";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { AppState, CONTENT_TYPES, ContentItem, ContentType, MonthPlan, PersonalTask, Platform, Product, Publication, SiteSettings, TaskPriority, TaskStatus, VisualLayout, WorkloadBreakdown, WorkloadSettings } from "../lib/types";
import { DistributionExisting, DistributionSeries, distributeContent } from "../lib/distribution-engine";
import { cloneDemoState, getOrCreatePlan } from "../lib/demo-data";
import { designerEmail, getWorkspaceSession, isSupabaseConfigured, loadPersonalTasks, loadWorkspaceState, ownerEmail, savePersonalTasks, saveWorkspaceState, signInWorkspace, signOutOwner } from "../lib/supabase";
import { Highlighter } from "./ui/highlighter";
import { NumberTicker } from "./ui/number-ticker";
import { AnimatedGradient } from "./ui/animated-gradient-with-svg";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput, NumberFieldScrubArea } from "./ui/reui-number-field";
import { Component as CircularCommandMenu } from "./ui/circular-command-menu";
import { FeatureBento } from "./ui/feature-bento";
import { SlotText } from "./ui/slot-text";
import ExampleUsage from "./ui/dashboard-overview";
import { Description, Label, ListBox, Select } from "./ui/heroui-select";
import { SelectorChips } from "./ui/selector-chips";
import { MouseFollowingEyes } from "./ui/mouse-following-eyes";
import { GuestProductTour } from "./ui/guest-product-tour";
import { Tooltip as AppTooltip, TooltipContent as AppTooltipContent, TooltipProvider as AppTooltipProvider, TooltipTrigger as AppTooltipTrigger } from "./ui/tooltip";
import { motion } from "motion/react";
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Download, Gauge, KeyRound, LayoutGrid, List, LogIn, LogOut, Menu, MessageCircle, Package, Pencil, Plus, RotateCcw, Search, Settings, Share2, SlidersHorizontal, Sparkles, Target, Trash2, Upload, X } from "lucide-react";

function ChartPlaceholder() {
  return <div className="mt-4 grid gap-4 xl:grid-cols-2"><div className="h-[250px] animate-pulse rounded-2xl border border-gray-100 bg-gray-50" /><div className="h-[250px] animate-pulse rounded-2xl border border-gray-100 bg-gray-50" /></div>;
}

const ReportCharts = dynamic(() => import("./ui/report-charts").then((module) => module.ReportCharts), { ssr: false, loading: () => <ChartPlaceholder /> });
const WorkloadRadarCharts = dynamic(() => import("./ui/report-charts").then((module) => module.WorkloadRadarCharts), { ssr: false, loading: () => <ChartPlaceholder /> });
const VisualSiteBuilder = dynamic(() => import("./visual-site-builder"), { ssr: false, loading: () => <div className="grid min-h-80 place-items-center rounded-2xl border border-blue-100 bg-white text-sm font-semibold text-blue-700 shadow-sm">Загружаем конструктор…</div> });

type View = "dashboard" | "today" | "calendar" | "tasks" | "load" | "plan" | "directory" | "settings";
type UserRole = "guest" | "owner" | "designer";
type LoginAccount = "owner" | "designer";
type LoginResult = { ok: boolean; message?: string };
type SyncState = "local" | "loading" | "synced" | "syncing" | "error";
type DirectoryKind = "products" | "platforms";
type DirectoryDetails = { company?: string; shortName?: string; ownerName?: string; whatsappNumber?: string; instagramAccountUrl?: string; accountUrl?: string; color?: string };
type DirectoryPatch = DirectoryDetails & { name?: string };
type AppSelectOption = { id: string; label: ReactNode; textValue?: string; description?: string };
type QuickPreset = { id: string; label: string; channelIds: string[] };
type CalendarEditor = { kind: "new"; date: string } | { kind: "content"; contentId: string } | { kind: "publication"; publicationId: string };
type CalendarEvent = { id: string; kind: "plan" | "publication"; recordId: string; label: string; calendarLabel?: string; date: string; productId: string; platformId?: string; platformName?: string; title?: string; contentType?: ContentType; brief?: string; productColor?: string };
type DeleteRequest = { kind: "content" | "publication"; id: string };
type BulkChannel = { id: string; platformId: string; platformName: string; type: ContentType; label: string };
type BulkPublicationInput = { date: string; productIds: string[]; channels: Array<Pick<BulkChannel, "platformId" | "type" | "id">>; titles: Record<string, string> };
type BulkUndo = { contentIds: string[]; publicationIds: string[]; resetContentIds?: string[] };
type PublicationHistoryEntry = { id: string; label: string; createdAt: string; snapshot: AppState };
type RepurposeRule = { id: string; sourceType: ContentType; targetType: ContentType; label: string; description: string; offsetDays: number };

const STORAGE_KEY = "content-plan-fact-local-v1";
const AUTH_STORAGE_KEY = "content-plan-fact-role-v1";
const CONTACT_URL = "https://wa.me/77057495634";
const TODAY = format(new Date(), "yyyy-MM-dd");
const NAV_ITEMS: { id: View; label: string; icon: typeof BarChart3 }[] = [
  { id: "dashboard", label: "Главная", icon: BarChart3 },
  { id: "today", label: "Сегодня", icon: Sparkles },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "tasks", label: "Задачи", icon: ClipboardList },
  { id: "load", label: "Нагрузка", icon: Gauge },
  { id: "settings", label: "Настройки сайта", icon: Settings },
  { id: "plan", label: "Контент-план", icon: BarChart3 },
  { id: "directory", label: "Справочники", icon: Package },
];
const GUEST_NAV_ORDER: View[] = ["dashboard", "calendar", "load"];
const TASKS_STORAGE_KEY = "content-plan-fact-personal-tasks-v1";
const inputClass = "ui-input";
const REPORT_COLORS = ["#2563eb", "#0891b2", "#db2777", "#4f46e5", "#059669", "#d97706"];
const DEFAULT_BACKGROUND_IMAGE = "https://cdn.21st.dev/assets/mirror/4a/4a036b28b8c09c74e3c094c95910fc41dfad836e8f93894f3f9b26b56ec20f63.jpg";
const DEFAULT_SITE_SETTINGS: SiteSettings = { brandName: "Медиа Центр", brandTagline: "By Tsay Maxim", logoSrc: "/media-center-logo.png", logoScale: 100, logoContainerWidth: 216, logoContainerHeight: 44, logoContainerRadius: 12, logoContainerPadding: 8, logoSidebarHorizontalPadding: 20, logoSidebarTopOffset: 22, logoContainerBackground: "transparent", backgroundImage: DEFAULT_BACKGROUND_IMAGE, backgroundImages: {}, backgroundOpacity: 35, backgroundPositionX: 50, backgroundPositionY: 50, guestViews: ["dashboard", "calendar", "load"], showSyncStatus: true, showContact: true };
const DEFAULT_VISUAL_LAYOUT: Required<VisualLayout> = {
  pageHeader: { tone: "blue", align: "left", paddingXpx: 20, paddingYpx: 20, radiusPx: 16, titleSizePx: 24, showEyebrow: true },
  productGrid: { columnsDesktop: 3, columnsMobile: 2, gapPx: 12, sort: "manual" },
  metricCards: { columnsDesktop: 4, columnsMobile: 2, gapPx: 8, showPlan: true, showFact: true, showCompletion: true, showActiveDays: true },
  sidebar: { navItemHeightPx: 40, navGapPx: 4, logoOffsetLeftPx: 20, logoOffsetTopPx: 22, tone: "navy", showTagline: false },
  calendarToolbar: { paddingYpx: 6, gapPx: 6, showViewSwitch: true, showFilters: true },
  background: { overlayOpacityPercent: 10, blurPx: 0 },
};
const VisualLayoutContext = createContext<Required<VisualLayout>>(DEFAULT_VISUAL_LAYOUT);
function useVisualLayout() { return useContext(VisualLayoutContext); }
function resolveVisualLayout(layout?: VisualLayout): Required<VisualLayout> {
  return {
    pageHeader: { ...DEFAULT_VISUAL_LAYOUT.pageHeader, ...(layout?.pageHeader ?? {}) },
    productGrid: { ...DEFAULT_VISUAL_LAYOUT.productGrid, ...(layout?.productGrid ?? {}) },
    metricCards: { ...DEFAULT_VISUAL_LAYOUT.metricCards, ...(layout?.metricCards ?? {}) },
    sidebar: { ...DEFAULT_VISUAL_LAYOUT.sidebar, ...(layout?.sidebar ?? {}) },
    calendarToolbar: { ...DEFAULT_VISUAL_LAYOUT.calendarToolbar, ...(layout?.calendarToolbar ?? {}) },
    background: { ...DEFAULT_VISUAL_LAYOUT.background, ...(layout?.background ?? {}) },
  };
}
const ALL_PRODUCTS_ID = "__all-products__";
const PRODUCT_WEEKDAYS_KEY = "__product__";
const CONTENT_PLATFORM_MAP: Record<ContentType, string> = { Reels: "Instagram", Пост: "Instagram", Stories: "Instagram", Threads: "Threads", TikTok: "TikTok", LinkedIn: "LinkedIn", YouTube: "YouTube", Shorts: "YouTube", Другое: "Instagram" };
const REPURPOSE_RULES: RepurposeRule[] = [
  { id: "reels-tiktok", sourceType: "Reels", targetType: "TikTok", label: "TikTok", description: "Повторить Reels в TikTok в тот же день", offsetDays: 0 },
  { id: "reels-shorts", sourceType: "Reels", targetType: "Shorts", label: "Shorts", description: "Повторить Reels в YouTube Shorts на следующий день", offsetDays: 1 },
  { id: "post-threads", sourceType: "Пост", targetType: "Threads", label: "Threads", description: "Сделать короткую адаптацию поста в Threads", offsetDays: 0 },
  { id: "post-linkedin", sourceType: "Пост", targetType: "LinkedIn", label: "LinkedIn", description: "Адаптировать экспертный пост для LinkedIn через 2 дня", offsetDays: 2 },
  { id: "youtube-shorts-1", sourceType: "YouTube", targetType: "Shorts", label: "Shorts · +1 день", description: "Первый Short после длинного видео", offsetDays: 1 },
  { id: "youtube-shorts-3", sourceType: "YouTube", targetType: "Shorts", label: "Shorts · +3 дня", description: "Второй Short после длинного видео", offsetDays: 3 },
  { id: "youtube-shorts-7", sourceType: "YouTube", targetType: "Shorts", label: "Shorts · +7 дней", description: "Третий Short после длинного видео", offsetDays: 7 },
];

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function dateInput(date: Date) { return format(date, "yyyy-MM-dd"); }
function monthKey(date: Date) { return format(date, "yyyy-MM"); }
function monthLabel(date: Date) { const value = format(date, "LLLL yyyy", { locale: ru }); return value.charAt(0).toUpperCase() + value.slice(1); }
function percent(value: number, total: number) { return total ? Math.round((value / total) * 100) : 0; }
function productName(state: AppState, productId: string) { return state.products.find((product) => product.id === productId)?.name ?? "Без продукта"; }
function productAccent(product: Product, index = 0) { return product.color || REPORT_COLORS[index % REPORT_COLORS.length]; }
function productShortName(product: Product) { const explicit = product.shortName?.trim(); if (explicit) return explicit.slice(0, 5); const compact = product.name.replace(/\s+/g, ""); return compact.slice(0, 4) || product.name.slice(0, 4); }
function instagramAccountKey(product: Product) { return product.instagramAccountUrl?.trim().toLowerCase() || product.id; }
function withAlpha(color: string, alpha: number) { const hex = color.replace("#", ""); if (hex.length !== 6) return color; const red = Number.parseInt(hex.slice(0, 2), 16); const green = Number.parseInt(hex.slice(2, 4), 16); const blue = Number.parseInt(hex.slice(4, 6), 16); return `rgba(${red}, ${green}, ${blue}, ${alpha})`; }
const SOCIAL_ICONS: Record<string, { Icon: IconType; color: string }> = {
  facebook: { Icon: SiFacebook, color: "#1877f2" },
  instagram: { Icon: SiInstagram, color: "#e4405f" },
  linkedin: { Icon: FaLinkedin, color: "#0a66c2" },
  pinterest: { Icon: SiPinterest, color: "#bd081c" },
  telegram: { Icon: SiTelegram, color: "#229ed9" },
  threads: { Icon: SiThreads, color: "#111827" },
  tiktok: { Icon: SiTiktok, color: "#111827" },
  twitter: { Icon: FaXTwitter, color: "#111827" },
  vk: { Icon: SiVk, color: "#0077ff" },
  whatsapp: { Icon: SiWhatsapp, color: "#25d366" },
  youtube: { Icon: SiYoutube, color: "#ff0000" },
};
function SocialPlatformIcon({ name, size = 14 }: { name: string; size?: number }) { const entry = SOCIAL_ICONS[name.trim().toLowerCase()]; if (!entry) return <Share2 size={size} aria-hidden="true" className="text-gray-400" />; const { Icon, color } = entry; return <Icon size={size} aria-hidden="true" style={{ color }} />; }
function logoContainerBackgroundClass(background: SiteSettings["logoContainerBackground"]) { if (background === "white") return "bg-white"; if (background === "sidebar") return "bg-[#0e1d35]"; return "bg-transparent"; }
function normalizeImageSource(value?: string) { const source = value?.trim() ?? ""; return /^(https?:\/\/|\/|data:image\/)/i.test(source) ? source : ""; }
function backgroundForView(settings: SiteSettings, view: View) { return normalizeImageSource(settings.backgroundImages?.[view]) || normalizeImageSource(settings.backgroundImage); }
function viewLabel(view: string) { return NAV_ITEMS.find((item) => item.id === view)?.label ?? view; }
function normalizeState(value: AppState): AppState { const fallback = cloneDemoState(); const plans = Object.fromEntries(Object.entries(value.plans ?? {}).map(([key, plan]) => [key, { ...plan, platforms: plan.platforms ?? fallback.plans[key]?.platforms ?? {} }])); return { ...fallback, ...value, plans, siteSettings: { ...DEFAULT_SITE_SETTINGS, ...(value.siteSettings ?? {}), guestViews: value.siteSettings?.guestViews?.length ? value.siteSettings.guestViews : DEFAULT_SITE_SETTINGS.guestViews } }; }
function platformNameForContentType(type: ContentType) { return CONTENT_PLATFORM_MAP[type] ?? "Instagram"; }
function platformIdForContentType(type: ContentType, platforms: Platform[]) { const name = platformNameForContentType(type).toLowerCase(); return platforms.find((platform) => platform.name.trim().toLowerCase() === name)?.id; }
function bulkChannelsForPlatform(platform: Platform): BulkChannel[] { const normalized = platform.name.trim().toLowerCase(); if (normalized === "instagram") return (["Reels", "Пост", "Stories"] as ContentType[]).map((type) => ({ id: `${platform.id}:${type}`, platformId: platform.id, platformName: platform.name, type, label: type })); if (normalized === "youtube") return (["YouTube", "Shorts"] as ContentType[]).map((type) => ({ id: `${platform.id}:${type}`, platformId: platform.id, platformName: platform.name, type, label: type })); const knownType = (["Threads", "TikTok", "LinkedIn"] as ContentType[]).find((type) => platformNameForContentType(type).toLowerCase() === normalized); return [{ id: `${platform.id}:${knownType ?? "Другое"}`, platformId: platform.id, platformName: platform.name, type: knownType ?? "Другое", label: platform.name }]; }
function channelPlanValue(plan: MonthPlan, productId: string, channel: BulkChannel, platforms: Platform[]) { const values = plan.channels?.[productId]; if (values && Object.prototype.hasOwnProperty.call(values, channel.id)) return Number(values[channel.id] ?? 0); const platform = platforms.find((item) => item.id === channel.platformId); const primaryChannelId = platform ? bulkChannelsForPlatform(platform)[0]?.id : channel.id; const legacyValue = Number(plan.platforms?.[productId]?.[channel.platformId] ?? plan.platforms?.[productId]?.[channel.platformName] ?? 0); return channel.id === primaryChannelId ? legacyValue : 0; }
 function productWeekdays(plan: MonthPlan, productId: string) { const values = plan.weekdays?.[productId] ?? {}; const saved = values[PRODUCT_WEEKDAYS_KEY] ?? Object.values(values).find((days) => days !== undefined); return saved ?? [1, 3, 5]; }
function channelWeekdays(plan: MonthPlan, productId: string, channelId: string) { void channelId; return productWeekdays(plan, productId); }
function exclusiveFormat(type: ContentType) { return type === "Reels" || type === "Пост" ? type : null; }
function hasExclusiveConflict(used: Set<string>, productId: string, date: string, type: ContentType) { const format = exclusiveFormat(type); if (!format) return false; const other = format === "Reels" ? "Пост" : "Reels"; return used.has(`${productId}|${date}|${other}`); }
function reserveExclusiveDate(used: Set<string>, productId: string, date: string, type: ContentType) { const format = exclusiveFormat(type); if (format) used.add(`${productId}|${date}|${format}`); }
function bulkChannelNeedsTitle(type: ContentType) { return type === "Reels" || type === "Пост" || type === "YouTube" || type === "Shorts"; }
function readableDate(value: string) { return format(new Date(`${value}T12:00:00`), "d MMMM yyyy", { locale: ru }); }
function moveDateToMonth(value: string, targetMonth: Date) { const day = Number(value.slice(-2)); const lastDay = Number(format(endOfMonth(targetMonth), "d")); return `${monthKey(targetMonth)}-${String(Math.min(day, lastDay)).padStart(2, "0")}`; }
function repurposeDate(sourceDate: string, offsetDays: number) { return dateInput(addDays(new Date(`${sourceDate}T12:00:00`), offsetDays)); }

function Button({ children, onClick, variant = "primary", type = "button", className = "", disabled = false }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; type?: "button" | "submit"; className?: string; disabled?: boolean }) { return <button type={type} onClick={onClick} disabled={disabled} className={`ui-button ui-button--${variant} ${className}`}>{children}</button>; }
function IconButton({ children, label, onClick, disabled = false }: { children: ReactNode; label: string; onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void; disabled?: boolean }) { return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="ui-icon-button">{children}</button>; }
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" }) { return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>; }
function Progress({ value, tone = "accent" }: { value: number; tone?: "accent" | "success" }) { return <div className={`ui-progress ${tone === "success" ? "ui-progress--success" : ""}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="ui-field"><span>{label}</span>{children}</label>; }
function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="ui-section-title"><h3>{title}</h3>{action}</div>; }
function AppSelect({ value, onChange, options, ariaLabel, className = "", triggerClassName = "" }: { value: string; onChange: (value: string) => void; options: AppSelectOption[]; ariaLabel: string; className?: string; triggerClassName?: string }) {
  return <Select value={value} onValueChange={onChange} options={options.map((option) => ({ ...option, textValue: option.textValue ?? option.id }))} className={`ui-select ${className}`}>
    <Select.Trigger aria-label={ariaLabel} className={`ui-select__trigger ${triggerClassName}`}><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.id} id={option.id} textValue={option.textValue ?? option.id} description={option.description}>{option.label}</ListBox.Item>)}</ListBox></Select.Popover>
  </Select>;
}
function MultiFilter({ label, options, selectedIds, onChange }: { label: string; options: Array<{ id: string; label: string }>; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  return <details className="relative shrink-0">
    <summary className="ui-select__trigger flex h-7 list-none cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-semibold [&::-webkit-details-marker]:hidden"><SlidersHorizontal size={12} />{selectedIds.length ? `${label} · ${selectedIds.length}` : label}<ChevronRight size={12} className="rotate-90 text-gray-400" /></summary>
    <div className="absolute left-0 top-full z-[80] mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl shadow-gray-900/10">
      <button type="button" onClick={() => onChange([])} className={`mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${selectedIds.length === 0 ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}><span>Все {label.toLowerCase()}</span>{selectedIds.length === 0 && <Check size={13} />}</button>
      <div className="grid max-h-56 gap-0.5 overflow-y-auto">
        {options.map((option) => <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"><input type="checkbox" checked={selectedIds.includes(option.id)} onChange={() => toggle(option.id)} className="h-3.5 w-3.5 accent-blue-600" /><span className="min-w-0 truncate">{option.label}</span></label>)}
      </div>
    </div>
  </details>;
}
function FormSelect({ name, defaultValue = "", options, ariaLabel }: { name: string; defaultValue?: string; options: AppSelectOption[]; ariaLabel: string }) { const [value, setValue] = useState(defaultValue); return <><AppSelect value={value} onChange={setValue} options={options} ariaLabel={ariaLabel} /><input type="hidden" name={name} value={value} readOnly /></>; }
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) { const titleId = `modal-title-${title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-")}`; useEffect(() => { function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); } document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }, [onClose]); return <div className="ui-modal-overlay fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`ui-modal ml-auto flex h-full flex-col ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}><div className="ui-modal__header sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4"><h2 id={titleId} className="min-w-0 pr-3 text-lg font-semibold text-gray-900">{title}</h2><IconButton label="Закрыть" onClick={onClose}><X size={18} /></IconButton></div><div className="ui-modal__body flex-1 p-4 sm:p-5">{children}</div></div></div>; }
function AuthLoadingScreen() { return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6" aria-busy="true" aria-live="polite"><div className="text-center"><div className="loading-dots" aria-hidden="true"><span /><span /><span /></div><p className="mt-4 text-sm font-semibold text-gray-700">Загружаем рабочую панель</p><p className="mt-1 text-xs text-gray-400">Синхронизируем данные</p></div></main>; }
function WorkspaceSidebar({ view, visibleNavItems, openView, role, siteSettings, mobileOpen, setMobileOpen, sidebarCollapsed, setSidebarCollapsed, onLogout, onLogin }: { view: View; visibleNavItems: typeof NAV_ITEMS; openView: (next: View) => void; role: UserRole; siteSettings: SiteSettings; mobileOpen: boolean; setMobileOpen: (value: boolean) => void; sidebarCollapsed: boolean; setSidebarCollapsed: (value: boolean) => void; onLogout: () => void; onLogin: () => void }) {
  const visualLayout = useVisualLayout();
  const logoScale = Math.min(140, Math.max(60, siteSettings.logoScale ?? DEFAULT_SITE_SETTINGS.logoScale ?? 100)) / 100;
  const logoContainerWidth = Math.min(228, Math.max(160, siteSettings.logoContainerWidth ?? DEFAULT_SITE_SETTINGS.logoContainerWidth ?? 216));
  const logoContainerHeight = Math.min(58, Math.max(36, siteSettings.logoContainerHeight ?? DEFAULT_SITE_SETTINGS.logoContainerHeight ?? 44));
  const logoContainerRadius = Math.min(24, Math.max(0, siteSettings.logoContainerRadius ?? DEFAULT_SITE_SETTINGS.logoContainerRadius ?? 12));
  const logoContainerPadding = Math.min(24, Math.max(0, siteSettings.logoContainerPadding ?? DEFAULT_SITE_SETTINGS.logoContainerPadding ?? 8));
  const logoSidebarHorizontalPadding = Math.min(32, Math.max(0, siteSettings.logoSidebarHorizontalPadding ?? DEFAULT_SITE_SETTINGS.logoSidebarHorizontalPadding ?? 20));
  const logoSidebarTopOffset = Math.min(32, Math.max(0, siteSettings.logoSidebarTopOffset ?? DEFAULT_SITE_SETTINGS.logoSidebarTopOffset ?? 22));
  const sidebarEdgeInset = 12;
  const navButtonClass = (active: boolean) => `flex w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${sidebarCollapsed ? "justify-center px-2" : ""} ${active ? "bg-blue-400/15 text-blue-100" : "text-white/55 hover:bg-white/[.07] hover:text-white"}`;
  const navButtonStyle = { height: `${Math.min(56, Math.max(28, visualLayout.sidebar.navItemHeightPx ?? 40))}px` };
  const primaryNavItems = visibleNavItems;
  const sidebarTone = visualLayout.sidebar.tone === "slate" ? "bg-slate-900" : visualLayout.sidebar.tone === "indigo" ? "bg-indigo-950" : "bg-[#0e1d35]";
  return <aside onMouseEnter={() => { if (sidebarCollapsed) setSidebarCollapsed(false); }} onFocus={() => { if (sidebarCollapsed) setSidebarCollapsed(false); }} className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col overflow-hidden border-r border-white/10 ${sidebarTone} px-3 py-3 text-white transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
    <div className={`flex h-16 shrink-0 items-center border-b border-white/10 ${sidebarCollapsed ? "justify-center" : "justify-between"}`} style={sidebarCollapsed ? undefined : { paddingLeft: `${Math.max(0, logoSidebarHorizontalPadding - sidebarEdgeInset)}px`, paddingRight: `${Math.max(0, logoSidebarHorizontalPadding - sidebarEdgeInset)}px` }}>
      <button type="button" onClick={() => openView("dashboard")} aria-label="Открыть главную" className={`relative shrink-0 overflow-hidden transition hover:opacity-90 ${sidebarCollapsed ? "h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500" : logoContainerBackgroundClass(siteSettings.logoContainerBackground)}`} style={sidebarCollapsed ? undefined : { width: `${logoContainerWidth}px`, height: `${logoContainerHeight}px`, borderRadius: `${logoContainerRadius}px`, padding: `${logoContainerPadding}px`, transform: `translateY(${logoSidebarTopOffset - 22}px)` }}><Image src={siteSettings.logoSrc || DEFAULT_SITE_SETTINGS.logoSrc!} alt={siteSettings.brandName} width={216} height={80} priority style={{ transform: sidebarCollapsed ? undefined : `scale(${logoScale})` }} className={sidebarCollapsed ? "hidden" : "h-full w-full object-contain"} />{sidebarCollapsed && <span className="absolute inset-0 grid place-items-center text-lg font-bold text-white">{siteSettings.brandName.trim().charAt(0) || "М"}</span>}</button>
      {!sidebarCollapsed && <button type="button" aria-label="Свернуть меню" title="Свернуть меню" onClick={() => setSidebarCollapsed(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"><Menu size={17} /></button>}
    </div>
    {visualLayout.sidebar.showTagline && !sidebarCollapsed && <p className="px-2 pt-2 text-[10px] font-semibold text-white/35">{siteSettings.brandTagline}</p>}
    <div className={`${visualLayout.sidebar.showTagline && !sidebarCollapsed ? "mt-3" : "mt-5"} min-h-0 flex-1 overflow-y-auto ${sidebarCollapsed ? "px-0" : "px-1"}`}>
      {!sidebarCollapsed && <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/30">Рабочая панель</div>}
      <nav data-tour="guest-navigation" aria-label="Основная навигация" className="grid" style={{ gap: `${Math.min(16, Math.max(0, visualLayout.sidebar.navGapPx ?? 4))}px` }}>{primaryNavItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => { openView(item.id); setMobileOpen(false); }} title={sidebarCollapsed ? item.label : undefined} style={navButtonStyle} className={navButtonClass(view === item.id)}><Icon size={17} /><span className={sidebarCollapsed ? "sr-only lg:hidden" : "truncate"}>{item.label}</span></button>; })}</nav>
    </div>
    <div className={`shrink-0 border-t border-white/10 pt-3 ${sidebarCollapsed ? "px-0" : "px-1"}`}>
      {!sidebarCollapsed && <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/30">{role === "owner" ? "Максим Цай · Редактор" : role === "designer" ? "Есей · Дизайнер" : "Гость · Только просмотр"}</div>}
      {siteSettings.showContact && <button data-tour="guest-contact" type="button" onClick={() => window.open(CONTACT_URL, "_blank", "noopener,noreferrer")} aria-label="Связаться" title="Связаться" style={navButtonStyle} className={navButtonClass(false)}><MessageCircle size={17} /><span className={sidebarCollapsed ? "sr-only lg:hidden" : ""}>Связаться</span></button>}
      {role === "guest" ? <button type="button" aria-label="Войти" title="Войти" onClick={onLogin} style={navButtonStyle} className={`${navButtonClass(false)} text-blue-200`}><KeyRound size={17} /><span className={sidebarCollapsed ? "sr-only lg:hidden" : ""}>Войти</span></button> : <button type="button" aria-label="Выйти" title="Выйти" onClick={onLogout} style={navButtonStyle} className={navButtonClass(false)}><LogOut size={17} /><span className={sidebarCollapsed ? "sr-only lg:hidden" : ""}>Выйти</span></button>}
      {sidebarCollapsed && <button type="button" aria-label="Развернуть меню" title="Развернуть меню" onClick={() => setSidebarCollapsed(false)} className="mt-1 flex h-10 w-full items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white"><Menu size={17} /></button>}
    </div>
  </aside>;
}
function OwnerLoginDialog({ onClose, onLogin }: { onClose: () => void; onLogin: (account: LoginAccount, password: string) => Promise<LoginResult> }) {
  const [account, setAccount] = useState<LoginAccount>("owner");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); try { const result = await onLogin(account, password); if (result.ok) onClose(); else setError(result.message ?? "Не удалось войти"); } catch { setError("Не удалось войти. Проверьте пароль и попробуйте ещё раз."); } finally { setLoading(false); } }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-gray-950/35 p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="owner-login-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><KeyRound size={18} /></div><h2 id="owner-login-title" className="mt-4 text-lg font-bold text-gray-900">Войти</h2><p className="mt-1 text-sm leading-5 text-gray-500">Выберите аккаунт для доступа к рабочей панели.</p></div><IconButton label="Закрыть" onClick={onClose}><X size={18} /></IconButton></div><div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-1"><button type="button" onClick={() => { setAccount("owner"); setPassword(""); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${account === "owner" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Макс</button><button type="button" onClick={() => { setAccount("designer"); setPassword(""); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${account === "designer" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Есей</button></div><form onSubmit={submit} className="mt-3 grid gap-3"><label className="grid gap-1.5 text-sm"><span className="text-xs font-semibold text-gray-500">Пароль {account === "owner" ? "Макса" : "Есея"}</span><input autoFocus type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Введите пароль" className={inputClass} /></label>{account === "designer" && <p className="text-xs leading-5 text-gray-400">Есей видит календарь и ТЗ, но не изменяет данные.</p>}{error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}<div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Отмена</Button><Button type="submit" className="w-full sm:w-auto"><LogIn size={15} />{loading ? "Проверяем…" : "Войти"}</Button></div></form></section></div>;
}
function SiteSettingsPage({ settings, onPreview, onSave, onDiscardPreview, onNotify }: { settings: SiteSettings; onPreview: (next: SiteSettings) => void; onSave: (next: SiteSettings) => void; onDiscardPreview: () => void; onNotify: (message: string) => void }) {
  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [backgroundTarget, setBackgroundTarget] = useState<"all" | View>("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const guestOptions = NAV_ITEMS.filter((item) => GUEST_NAV_ORDER.includes(item.id));
  const logoScale = Math.min(140, Math.max(60, draft.logoScale ?? DEFAULT_SITE_SETTINGS.logoScale ?? 100));
  const logoContainerWidth = Math.min(228, Math.max(160, draft.logoContainerWidth ?? DEFAULT_SITE_SETTINGS.logoContainerWidth ?? 216));
  const logoContainerHeight = Math.min(58, Math.max(36, draft.logoContainerHeight ?? DEFAULT_SITE_SETTINGS.logoContainerHeight ?? 44));
  const logoContainerRadius = Math.min(24, Math.max(0, draft.logoContainerRadius ?? DEFAULT_SITE_SETTINGS.logoContainerRadius ?? 12));
  const logoContainerPadding = Math.min(24, Math.max(0, draft.logoContainerPadding ?? DEFAULT_SITE_SETTINGS.logoContainerPadding ?? 8));
  const logoSidebarHorizontalPadding = Math.min(32, Math.max(0, draft.logoSidebarHorizontalPadding ?? DEFAULT_SITE_SETTINGS.logoSidebarHorizontalPadding ?? 20));
  const logoSidebarTopOffset = Math.min(32, Math.max(0, draft.logoSidebarTopOffset ?? DEFAULT_SITE_SETTINGS.logoSidebarTopOffset ?? 22));
  const selectedBackground = backgroundTarget === "all" ? draft.backgroundImage ?? "" : draft.backgroundImages?.[backgroundTarget] ?? "";
  const previewBackground = selectedBackground || (backgroundTarget !== "all" ? draft.backgroundImage ?? "" : "");
  const backgroundOpacity = Math.min(100, Math.max(0, draft.backgroundOpacity ?? DEFAULT_SITE_SETTINGS.backgroundOpacity ?? 35));
  const backgroundPositionX = Math.min(100, Math.max(0, draft.backgroundPositionX ?? DEFAULT_SITE_SETTINGS.backgroundPositionX ?? 50));
  const backgroundPositionY = Math.min(100, Math.max(0, draft.backgroundPositionY ?? DEFAULT_SITE_SETTINGS.backgroundPositionY ?? 50));

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  useEffect(() => { onPreview(draft); }, [draft, onPreview]);

  function updateDraft(patch: Partial<SiteSettings>) { setDraft((current) => ({ ...current, ...patch })); }
  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_500_000) {
      onNotify("Выберите изображение до 1,5 МБ");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateDraft({ logoSrc: typeof reader.result === "string" ? reader.result : undefined });
    reader.readAsDataURL(file);
  }
  function updateBackground(value: string) {
    setDraft((current) => backgroundTarget === "all"
      ? { ...current, backgroundImage: value }
      : { ...current, backgroundImages: { ...(current.backgroundImages ?? {}), [backgroundTarget]: value } });
  }
  function handleBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_500_000) {
      onNotify("Выберите изображение до 1,5 МБ");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBackground(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }
  function clearBackground() {
    if (backgroundTarget === "all") updateDraft({ backgroundImage: "" });
    else {
      const next = { ...(draft.backgroundImages ?? {}) };
      delete next[backgroundTarget];
      updateDraft({ backgroundImages: next });
    }
  }
  function toggleGuestView(id: View) {
    const next = draft.guestViews.includes(id) ? draft.guestViews.filter((value) => value !== id) : [...draft.guestViews, id];
    updateDraft({ guestViews: next });
  }
  function save() {
    const backgroundImages = Object.fromEntries(Object.entries(draft.backgroundImages ?? {}).filter(([, value]) => Boolean(normalizeImageSource(value))));
    onSave({ ...draft, brandName: draft.brandName.trim() || DEFAULT_SITE_SETTINGS.brandName, brandTagline: draft.brandTagline.trim() || DEFAULT_SITE_SETTINGS.brandTagline, backgroundImage: normalizeImageSource(draft.backgroundImage), backgroundImages, backgroundOpacity, backgroundPositionX, backgroundPositionY, guestViews: draft.guestViews.length ? draft.guestViews : ["dashboard"] });
  }

  function discard() {
    setDraft(settings);
    onDiscardPreview();
    onNotify("Черновик дизайна отменён");
  }

  if (builderOpen) return <VisualSiteBuilder settings={settings} onPreview={onPreview} onPublish={(next) => { onSave(next); setBuilderOpen(false); }} onClose={() => { onDiscardPreview(); setBuilderOpen(false); }} />;

  return <div className="grid gap-5">
    <PageHeader eyebrow="Настройки владельца" title="Настройки сайта" description="Управляйте брендом, логотипом и тем, какие разделы доступны гостевому просмотру." />
    <section className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-lg shadow-blue-950/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><SlidersHorizontal size={17} /></span><div><p className="text-sm font-bold text-gray-900">Визуальный редактор · live preview</p><p className="mt-0.5 text-xs leading-5 text-gray-500">Все изменения сразу видны в Sidebar, фоне и интерфейсе. До сохранения они остаются черновиком.</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" onClick={() => setBuilderOpen(true)}><Sparkles size={14} /> Конструктор</Button><Badge tone={isDirty ? "accent" : "success"}>{isDirty ? "Есть несохранённые изменения" : "Сохранено"}</Badge><Button variant="secondary" onClick={discard} disabled={!isDirty}><RotateCcw size={14} /> Отменить</Button><Button onClick={save} disabled={!isDirty}><Check size={14} /> Сохранить всё</Button></div>
    </section>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
      <section className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-white p-4 shadow-sm sm:p-5">
        <SectionTitle title="Бренд и логотип" />
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-3">
            <Field label="Название сайта"><input className={inputClass} value={draft.brandName} onChange={(event) => updateDraft({ brandName: event.target.value })} placeholder="Медиа Центр" /></Field>
            <Field label="Подпись"><input className={inputClass} value={draft.brandTagline} onChange={(event) => updateDraft({ brandTagline: event.target.value })} placeholder="By Tsay Maxim" /></Field>
            <label className="grid gap-1.5 text-sm"><span className="text-xs font-semibold text-gray-500">Файл логотипа</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogo} className="block w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /><span className="text-[11px] text-gray-400">PNG с прозрачностью выглядит лучше всего. Максимум 1,5 МБ.</span></label>
            <label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Размер логотипа</span><span className="font-bold text-blue-700">{logoScale}%</span></span><input type="range" min="60" max="140" step="5" value={logoScale} onChange={(event) => updateDraft({ logoScale: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /><span className="text-[11px] text-gray-400">Меняет размер в Sidebar и в предпросмотре.</span></label>
            <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-gray-500">Контейнер логотипа</span><span className="text-[11px] font-semibold text-gray-400">{logoContainerWidth} × {logoContainerHeight}px</span></div><Field label="Фон контейнера"><AppSelect value={draft.logoContainerBackground ?? "transparent"} onChange={(value) => updateDraft({ logoContainerBackground: value as SiteSettings["logoContainerBackground"] })} options={[{ id: "transparent", label: "Прозрачный" }, { id: "white", label: "Белый" }, { id: "sidebar", label: "Фон Sidebar" }]} ariaLabel="Фон контейнера логотипа" /></Field><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Ширина контейнера</span><span className="font-bold text-blue-700">{logoContainerWidth}px</span></span><input type="range" min="160" max="228" step="4" value={logoContainerWidth} onChange={(event) => updateDraft({ logoContainerWidth: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /></label><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Высота контейнера</span><span className="font-bold text-blue-700">{logoContainerHeight}px</span></span><input type="range" min="36" max="58" step="2" value={logoContainerHeight} onChange={(event) => updateDraft({ logoContainerHeight: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /></label><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Внутренний отступ от края</span><span className="font-bold text-blue-700">{logoContainerPadding}px</span></span><input type="range" min="0" max="24" step="2" value={logoContainerPadding} onChange={(event) => updateDraft({ logoContainerPadding: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /></label><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Отступ слева/справа от Sidebar</span><span className="font-bold text-blue-700">{logoSidebarHorizontalPadding}px</span></span><input type="range" min="0" max="32" step="2" value={logoSidebarHorizontalPadding} onChange={(event) => updateDraft({ logoSidebarHorizontalPadding: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /></label><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Отступ сверху от Sidebar</span><span className="font-bold text-blue-700">{logoSidebarTopOffset}px</span></span><input type="range" min="0" max="32" step="2" value={logoSidebarTopOffset} onChange={(event) => updateDraft({ logoSidebarTopOffset: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /></label><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Скругление</span><span className="font-bold text-blue-700">{logoContainerRadius}px</span></span><input type="range" min="0" max="24" step="2" value={logoContainerRadius} onChange={(event) => updateDraft({ logoContainerRadius: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /></label></div>
            <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" onClick={() => updateDraft({ logoSrc: DEFAULT_SITE_SETTINGS.logoSrc })}><RotateCcw size={14} /> Вернуть логотип</Button><span className="text-xs font-medium text-blue-700">Предпросмотр обновляется сразу</span></div>
          </div>
          <div className="grid min-h-40 place-items-center rounded-2xl border border-gray-200 bg-[#0e1d35] p-4"><div className="grid gap-3 text-center"><div className={`mx-auto flex items-center justify-center overflow-hidden px-2 ${logoContainerBackgroundClass(draft.logoContainerBackground)}`} style={{ width: `${Math.min(220, logoContainerWidth)}px`, height: `${Math.min(58, logoContainerHeight)}px`, borderRadius: `${logoContainerRadius}px`, padding: `${logoContainerPadding}px` }}><Image src={draft.logoSrc || DEFAULT_SITE_SETTINGS.logoSrc!} alt="Предпросмотр логотипа" width={216} height={80} unoptimized style={{ transform: `scale(${logoScale / 100})` }} className="h-full w-full object-contain" /></div><div><p className="text-sm font-bold text-white">{draft.brandName || "Без названия"}</p><p className="mt-0.5 text-xs text-white/50">{draft.brandTagline || "Без подписи"}</p></div></div></div>
        </div>
      </section>
      <section className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-white p-4 shadow-sm sm:p-5">
        <SectionTitle title="Фон страниц" />
        <p className="mt-1 text-xs leading-5 text-gray-500">Задайте изображение для всех страниц или отдельное переопределение, затем настройте его видимость и положение.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Где применять"><AppSelect value={backgroundTarget} onChange={(value) => setBackgroundTarget(value === "all" ? "all" : value as View)} options={[{ id: "all", label: "Все страницы" }, ...NAV_ITEMS.map((item) => ({ id: item.id, label: item.label }))]} ariaLabel="Область фонового изображения" /></Field>
          <label className="grid gap-1.5 text-sm"><span className="text-xs font-semibold text-gray-500">Изображение-файл</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBackground} className="block w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /><span className="text-[11px] text-gray-400">Можно загрузить файл до 1,5 МБ или использовать ссылку ниже.</span></label>
          <Field label="Ссылка на изображение"><input className={inputClass} value={selectedBackground} onChange={(event) => updateBackground(event.target.value)} placeholder="https://..." inputMode="url" /></Field>
          <label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Видимость фона</span><span className="font-bold text-blue-700">{backgroundOpacity}%</span></span><input type="range" min="0" max="100" step="5" value={backgroundOpacity} onChange={(event) => updateDraft({ backgroundOpacity: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /><span className="text-[11px] text-gray-400">0% — полностью прозрачный, 100% — без прозрачности.</span></label>
          <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Положение по горизонтали</span><span className="font-bold text-blue-700">{backgroundPositionX}%</span></span><input type="range" min="0" max="100" step="5" value={backgroundPositionX} onChange={(event) => updateDraft({ backgroundPositionX: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /><span className="text-[11px] text-gray-400">0% — слева, 100% — справа.</span></label><label className="grid gap-1.5 text-sm"><span className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Положение по вертикали</span><span className="font-bold text-blue-700">{backgroundPositionY}%</span></span><input type="range" min="0" max="100" step="5" value={backgroundPositionY} onChange={(event) => updateDraft({ backgroundPositionY: Number(event.target.value) })} className="h-2 w-full cursor-pointer accent-blue-600" /><span className="text-[11px] text-gray-400">0% — сверху, 100% — снизу.</span></label></div>
          <div className="relative min-h-32 overflow-hidden rounded-2xl border border-gray-200 bg-[#f3f6fb]"><div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: previewBackground ? `url("${previewBackground.replace(/"/g, "\\\"")}")` : undefined, backgroundPosition: `${backgroundPositionX}% ${backgroundPositionY}%`, opacity: backgroundOpacity / 100 }} /><div className="relative flex min-h-32 items-center justify-center px-4 text-center"><span className="rounded-full bg-gray-950/60 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">{previewBackground ? `Предпросмотр: ${backgroundTarget === "all" ? "все страницы" : selectedBackground ? viewLabel(backgroundTarget) : "наследуется общий фон"}` : "Фон не задан"}</span></div></div>
          <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" onClick={clearBackground}><X size={14} /> Убрать этот фон</Button><span className="text-xs font-medium text-blue-700">Фон страницы меняется сразу</span></div>
        </div>
      </section>
      <section className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-white p-4 shadow-sm sm:p-5">
        <SectionTitle title="Гостевой доступ" />
        <p className="mt-1 text-xs leading-5 text-gray-500">Гость увидит только выбранные рабочие разделы. Настройки, справочники, задачи и план остаются владельцу.</p>
        <div className="mt-4 grid gap-2">{guestOptions.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50/40"><input type="checkbox" checked={draft.guestViews.includes(item.id)} onChange={() => toggleGuestView(item.id)} className="h-4 w-4 accent-blue-600" /><span className="min-w-0 flex-1">{item.label}</span><span className="text-[11px] text-gray-400">просмотр</span></label>)}</div>
        <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4"><label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-700"><input type="checkbox" checked={draft.showSyncStatus} onChange={(event) => updateDraft({ showSyncStatus: event.target.checked })} className="h-4 w-4 accent-blue-600" />Показывать статус синхронизации</label><label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-700"><input type="checkbox" checked={draft.showContact} onChange={(event) => updateDraft({ showContact: event.target.checked })} className="h-4 w-4 accent-blue-600" />Показывать кнопку связи</label></div>
        <p className="mt-5 text-center text-xs leading-5 text-gray-400">Сохраните все изменения общей кнопкой в верхней панели редактора.</p>
      </section>
    </div>
  </div>;
}
export default function ContentPlanFactApp() {
  const [state, setState] = useState<AppState>(() => cloneDemoState());
  const [hydrated, setHydrated] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [role, setRole] = useState<UserRole>("guest");
  const [syncState, setSyncState] = useState<SyncState>(isSupabaseConfigured ? "loading" : "local");
  const cloudLoadedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [month, setMonth] = useState(new Date());
  const [directoryKind, setDirectoryKind] = useState<DirectoryKind>("products");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [siteSettingsPreview, setSiteSettingsPreview] = useState<SiteSettings | null>(null);
  const [visualPreviewMode, setVisualPreviewMode] = useState(false);
  const [ownerLoginOpen, setOwnerLoginOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [tasksHydrated, setTasksHydrated] = useState(false);
  const [lastBulkUndo, setLastBulkUndo] = useState<BulkUndo | null>(null);
  const [publicationHistory, setPublicationHistory] = useState<PublicationHistoryEntry[]>([]);
  const undoStackRef = useRef<AppState[]>([]);
  const lastStateRef = useRef<AppState>(state);
  const skipHistoryRef = useRef(false);
  const tasksRef = useRef<PersonalTask[]>([]);
  const tasksLocalFallbackRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { const stored = window.localStorage.getItem(STORAGE_KEY); if (stored) { try { setState(normalizeState(JSON.parse(stored) as AppState)); } catch { window.localStorage.removeItem(STORAGE_KEY); } } setHydrated(true); }, []);
  useEffect(() => { window.localStorage.removeItem("content-plan-fact-background-v1"); }, []);
  useEffect(() => {
    let cancelled = false;
    async function hydrateAuthAndCloud() {
      const localRole: UserRole = "guest";

      if (!isSupabaseConfigured) {
        setRole("guest");
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, "guest");
        setView("dashboard");
        setSyncState("local");
        setAuthHydrated(true);
        return;
      }

      setRole(localRole);
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, localRole);
      setView("dashboard");
      setSyncState("loading");
      setAuthHydrated(true);

      const sessionPromise = getWorkspaceSession();
      const cloudPromise = loadWorkspaceState();

      try {
        const session = await sessionPromise;
        if (!cancelled && session) {
          const sessionEmail = session.user.email?.trim().toLowerCase();
          const authenticatedRole: UserRole = sessionEmail && ownerEmail && sessionEmail === ownerEmail.toLowerCase()
            ? "owner"
            : sessionEmail && designerEmail && sessionEmail === designerEmail.toLowerCase()
              ? "designer"
              : "guest";
          setRole(authenticatedRole);
          window.sessionStorage.setItem(AUTH_STORAGE_KEY, authenticatedRole);
          setView(authenticatedRole === "owner" ? "dashboard" : authenticatedRole === "designer" ? "calendar" : "dashboard");
        }
      } catch {
        // A cached guest view can still render while Supabase Auth recovers.
      }

      try {
        const cloudState = await cloudPromise;
        if (!cancelled) {
          if (cloudState) setState(normalizeState(cloudState));
          cloudLoadedRef.current = true;
          setSyncState(cloudState ? "synced" : "loading");
        }
      } catch {
        if (!cancelled) {
          cloudLoadedRef.current = true;
          setSyncState("error");
        }
      }
    }

    void hydrateAuthAndCloud();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => { if (!hydrated || !authHydrated) return; let cancelled = false; async function hydrateTasks() { setTasksHydrated(false); tasksLocalFallbackRef.current = false; if (role !== "owner") { setTasks([]); setTasksHydrated(true); return; } try { if (isSupabaseConfigured) { setTasks(await loadPersonalTasks()); } else { const stored = window.localStorage.getItem(TASKS_STORAGE_KEY); setTasks(stored ? JSON.parse(stored) as PersonalTask[] : []); tasksLocalFallbackRef.current = true; } } catch { if (!cancelled) { const stored = window.localStorage.getItem(TASKS_STORAGE_KEY); setTasks(stored ? JSON.parse(stored) as PersonalTask[] : []); tasksLocalFallbackRef.current = true; setToast("Таблица задач ещё не применена — локальный режим для разработки"); } } finally { if (!cancelled) setTasksHydrated(true); } } void hydrateTasks(); return () => { cancelled = true; }; }, [hydrated, authHydrated, role]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, hydrated]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { if (hydrated && tasksHydrated && role === "owner" && !isSupabaseConfigured) window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks)); }, [hydrated, tasksHydrated, role, tasks]);
  useEffect(() => { if (!hydrated || !authHydrated) { lastStateRef.current = state; return; } if (lastStateRef.current === state) return; if (skipHistoryRef.current) { skipHistoryRef.current = false; lastStateRef.current = state; return; } undoStackRef.current = [...undoStackRef.current.slice(-24), lastStateRef.current]; lastStateRef.current = state; }, [state, hydrated, authHydrated]);
  useEffect(() => { function handleUndo(event: KeyboardEvent) { if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return; const target = event.target as HTMLElement | null; if (target?.matches("input, textarea, select, [contenteditable='true']")) return; event.preventDefault(); const previous = undoStackRef.current.pop(); if (!previous) { setToast("Нет изменений для отмены"); return; } skipHistoryRef.current = true; lastStateRef.current = previous; setState(previous); setLastBulkUndo(null); setToast("Последнее изменение отменено"); } window.addEventListener("keydown", handleUndo); return () => window.removeEventListener("keydown", handleUndo); }, [hydrated, authHydrated]);
  useEffect(() => { if (!hydrated || !isSupabaseConfigured || role !== "owner" || !cloudLoadedRef.current) return; if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current); syncTimerRef.current = window.setTimeout(() => { setSyncState("syncing"); void saveWorkspaceState(state).then(() => setSyncState("synced")).catch(() => { setSyncState("error"); notify("Не удалось сохранить изменения в облаке"); }); }, 500); return () => { if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current); }; }, [state, hydrated, role]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => { setToast(null); setLastBulkUndo(null); }, 4200); return () => window.clearTimeout(timer); }, [toast]);

  const activeProducts = useMemo(() => state.products.filter((item) => !item.archived).sort((a, b) => a.order - b.order), [state.products]);
  const activePlatforms = useMemo(() => state.platforms.filter((item) => !item.archived).sort((a, b) => a.order - b.order), [state.platforms]);
  const persistedSiteSettings = state.siteSettings ?? DEFAULT_SITE_SETTINGS;
  const siteSettings = siteSettingsPreview ?? persistedSiteSettings;
  const visualLayout = useMemo(() => resolveVisualLayout(siteSettings.visualEditor?.layout), [siteSettings.visualEditor?.layout]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("visualPreview") && window.parent !== window) {
      window.parent.postMessage({ type: "media-center-visual-preview-ready" }, window.location.origin);
    }
  }, []);
  useEffect(() => {
    function receiveVisualPreview(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source === window || !event.data || event.data.type !== "media-center-visual-preview") return;
      const incoming = event.data.siteSettings as SiteSettings | undefined;
      if (!incoming || typeof incoming !== "object" || !incoming.visualEditor?.layout) return;
      setVisualPreviewMode(true);
      const layout = incoming.visualEditor.layout;
      setSiteSettingsPreview({
        ...persistedSiteSettings,
        logoSidebarHorizontalPadding: layout.sidebar?.logoOffsetLeftPx ?? persistedSiteSettings.logoSidebarHorizontalPadding,
        logoSidebarTopOffset: layout.sidebar?.logoOffsetTopPx ?? persistedSiteSettings.logoSidebarTopOffset,
        visualEditor: incoming.visualEditor,
      });
    }
    window.addEventListener("message", receiveVisualPreview);
    return () => window.removeEventListener("message", receiveVisualPreview);
  }, [persistedSiteSettings]);
  const currentPlan = useMemo(() => getOrCreatePlan(state, monthKey(month)), [state, month]);
  const currentPublications = useMemo(() => state.publications.filter((item) => item.date.startsWith(monthKey(month))), [state.publications, month]);
  const actual = (productId: string, platformId: string) => currentPublications.filter((publication) => publication.platformId === platformId && state.content.find((item) => item.id === publication.contentId)?.productId === productId).length;
  const actualChannel = (productId: string, channel: BulkChannel) => currentPublications.filter((publication) => publication.platformId === channel.platformId && state.content.find((item) => item.id === publication.contentId)?.productId === productId && state.content.find((item) => item.id === publication.contentId)?.type === channel.type).length;

  function notify(message: string) { setToast(message); }
  const previewSiteSettings = useCallback((next: SiteSettings) => { setSiteSettingsPreview(next); }, []);
  const discardSiteSettingsPreview = useCallback(() => { setSiteSettingsPreview(null); }, []);
  function updateSiteSettings(next: SiteSettings) { setState((previous) => ({ ...previous, siteSettings: { ...DEFAULT_SITE_SETTINGS, ...(previous.siteSettings ?? {}), ...next } })); setSiteSettingsPreview(null); notify("Настройки сайта сохранены"); }
  function recordPublicationHistory(label: string) { setPublicationHistory((current) => [{ id: makeId("publication-history"), label, createdAt: new Date().toISOString(), snapshot: state }, ...current].slice(0, 16)); }
  function undoPublicationHistory(entryId: string) { const entry = publicationHistory.find((item) => item.id === entryId); if (!entry) return; skipHistoryRef.current = true; lastStateRef.current = entry.snapshot; setState(entry.snapshot); setPublicationHistory((current) => current.filter((item) => item.id !== entryId)); setLastBulkUndo(null); setToast(`Отменено: ${entry.label}`); }
  function undoLastBulkAdd() { if (!lastBulkUndo) return; const { contentIds, publicationIds, resetContentIds = [] } = lastBulkUndo; setState((previous) => ({ ...previous, content: previous.content.filter((item) => !contentIds.includes(item.id)).map((item) => resetContentIds.includes(item.id) ? { ...item, status: "approval", actualPublishDate: undefined, updatedAt: TODAY } : item), publications: previous.publications.filter((item) => !publicationIds.includes(item.id)) })); setLastBulkUndo(null); setToast("Массовая отметка отменена"); }
  async function login(nextRole: LoginAccount, password = ""): Promise<LoginResult> {
    if (!isSupabaseConfigured) return { ok: false, message: "Авторизация не настроена. Подключите Supabase Auth." };
    const email = nextRole === "owner" ? ownerEmail : designerEmail;
    if (!email) return { ok: false, message: `Добавьте email ${nextRole === "owner" ? "владельца" : "дизайнера"} в настройках Supabase/Vercel` };
    try {
      const user = await signInWorkspace(email, password);
      if (!user?.email || user.email.trim().toLowerCase() !== email.toLowerCase()) return { ok: false, message: "Не удалось подтвердить аккаунт" };
      setRole(nextRole);
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, nextRole);
      setView(nextRole === "owner" ? "dashboard" : "calendar");
      if (nextRole === "owner") {
        const cloudState = await loadWorkspaceState();
        cloudLoadedRef.current = true;
        if (cloudState) { setState(normalizeState(cloudState)); setSyncState("synced"); } else { await saveWorkspaceState(state); setSyncState("synced"); }
      }
      return { ok: true };
    } catch { return { ok: false, message: "Проверьте email и пароль Supabase" }; }
  }
  function logout() { if (isSupabaseConfigured && role !== "guest") void signOutOwner(); setRole("guest"); window.sessionStorage.setItem(AUTH_STORAGE_KEY, "guest"); setView("dashboard"); setMobileOpen(false); }
  function openView(next: View) { if (role !== "owner" && next !== "dashboard" && next !== "calendar" && next !== "load") { setView("dashboard"); } else { setView(next); } setMobileOpen(false); }
  function commitTasks(next: PersonalTask[], message?: string) { const previous = tasksRef.current; tasksRef.current = next; setTasks(next); if (isSupabaseConfigured && role === "owner" && !tasksLocalFallbackRef.current) void savePersonalTasks(next).catch(() => { if (process.env.NODE_ENV === "development") { tasksLocalFallbackRef.current = true; window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(next)); setToast("Таблица задач недоступна — изменения сохранены локально для разработки"); } else { tasksRef.current = previous; setTasks(previous); setToast("Не удалось сохранить задачу"); } }); else if (tasksLocalFallbackRef.current || !isSupabaseConfigured) window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(next)); if (message) notify(message); }
  function createTask(input: NewTaskInput) { const now = new Date().toISOString(); const task: PersonalTask = { id: makeId("task"), title: input.title.trim(), description: input.description, dueDate: input.dueDate, dueTime: input.dueTime, priority: input.priority, status: input.status, completedAt: input.status === "completed" ? now : undefined, createdAt: now, updatedAt: now }; commitTasks([task, ...tasksRef.current], "Задача добавлена"); }
  function updateTask(taskId: string, patch: Partial<NewTaskInput>) { const now = new Date().toISOString(); const next = tasksRef.current.map((task) => { if (task.id !== taskId) return task; const status = patch.status ?? task.status; return { ...task, ...patch, title: patch.title?.trim() || task.title, status, completedAt: status === "completed" ? task.completedAt ?? now : undefined, updatedAt: now }; }); commitTasks(next, "Задача обновлена"); }
  function deleteTask(taskId: string) { if (!window.confirm("Удалить эту личную задачу?")) return; commitTasks(tasksRef.current.filter((task) => task.id !== taskId), "Задача удалена"); }
  function updatePlan(productId: string, platformId: string, value: number) { setState((previous) => { const key = monthKey(month); const oldPlan = getOrCreatePlan(previous, key); return { ...previous, plans: { ...previous.plans, [key]: { ...oldPlan, platforms: { ...(oldPlan.platforms ?? {}), [productId]: { ...(oldPlan.platforms?.[productId] ?? {}), [platformId]: Math.max(0, value) } } } } }; }); }
  function updateChannelPlan(productId: string, channelId: string, value: number) { setState((previous) => { const key = monthKey(month); const oldPlan = getOrCreatePlan(previous, key); return { ...previous, plans: { ...previous.plans, [key]: { ...oldPlan, channels: { ...(oldPlan.channels ?? {}), [productId]: { ...(oldPlan.channels?.[productId] ?? {}), [channelId]: Math.max(0, value) } } } } }; }); }
  function updateProductWeekdays(productId: string, weekdays: number[]) { setState((previous) => { const key = monthKey(month); const oldPlan = getOrCreatePlan(previous, key); return { ...previous, plans: { ...previous.plans, [key]: { ...oldPlan, weekdays: { ...(oldPlan.weekdays ?? {}), [productId]: { ...(oldPlan.weekdays?.[productId] ?? {}), [PRODUCT_WEEKDAYS_KEY]: weekdays } } } } }; }); }
  function updateWorkloadSettings(next: WorkloadSettings) { setState((previous) => ({ ...previous, workload: next })); }
  function copyPreviousMonth() { const sourceMonth = subMonths(month, 1); const sourceKey = monthKey(sourceMonth); const targetKey = monthKey(month); let copiedCells = 0; let copiedCalendar = 0; setState((previous) => { const sourcePlan = getOrCreatePlan(previous, sourceKey); const targetPlan = getOrCreatePlan(previous, targetKey); const activeProductsInState = previous.products.filter((item) => !item.archived); const activePlatformsInState = previous.platforms.filter((item) => !item.archived); const nextPlatforms = { ...(targetPlan.platforms ?? {}) }; const nextChannels = { ...(targetPlan.channels ?? {}) }; const nextWeekdays = { ...(targetPlan.weekdays ?? {}) }; activeProductsInState.forEach((product) => { const sourceValues = sourcePlan.platforms?.[product.id] ?? {}; const targetValues = { ...(nextPlatforms[product.id] ?? {}) }; activePlatformsInState.forEach((platform) => { const sourceValue = Number(sourceValues[platform.id] ?? sourceValues[platform.name] ?? 0); const targetValue = Number(targetValues[platform.id] ?? targetValues[platform.name] ?? 0); if (sourceValue > 0 && targetValue === 0) { targetValues[platform.id] = sourceValue; copiedCells += 1; } }); nextPlatforms[product.id] = targetValues; const sourceChannelValues = sourcePlan.channels?.[product.id] ?? {}; const targetChannelValues = { ...(nextChannels[product.id] ?? {}) }; const sourceWeekdayValues = sourcePlan.weekdays?.[product.id] ?? {}; const targetWeekdayValues = { ...(nextWeekdays[product.id] ?? {}) }; activePlatformsInState.flatMap(bulkChannelsForPlatform).forEach((channel) => { const channelPlatform = activePlatformsInState.find((platform) => platform.id === channel.platformId); const primaryChannelId = channelPlatform ? bulkChannelsForPlatform(channelPlatform)[0]?.id : channel.id; const sourceValue = Number(sourceChannelValues[channel.id] ?? (channel.id === primaryChannelId ? sourceValues[channel.platformId] ?? sourceValues[channel.platformName] ?? 0 : 0)); const targetValue = Number(targetChannelValues[channel.id] ?? 0); if (sourceValue > 0 && targetValue === 0) { targetChannelValues[channel.id] = sourceValue; copiedCells += 1; } const sourceDays = sourceWeekdayValues[channel.id]; if (sourceDays?.length && !targetWeekdayValues[channel.id]) targetWeekdayValues[channel.id] = sourceDays; }); nextChannels[product.id] = targetChannelValues; nextWeekdays[product.id] = targetWeekdayValues; }); const targetContentKeys = new Set(previous.content.filter((item) => item.plannedPublishDate?.startsWith(targetKey)).map((item) => `${item.plannedPublishDate}|${item.productId}|${item.type}|${item.title.trim().toLowerCase()}`)); const clonedContent = previous.content.filter((item) => item.plannedPublishDate?.startsWith(sourceKey)).filter((item) => { const plannedDate = moveDateToMonth(item.plannedPublishDate!, month); const key = `${plannedDate}|${item.productId}|${item.type}|${item.title.trim().toLowerCase()}`; if (targetContentKeys.has(key)) return false; targetContentKeys.add(key); return true; }).map((item) => ({ ...item, id: makeId("content"), plannedPublishDate: moveDateToMonth(item.plannedPublishDate!, month), actualPublishDate: undefined, status: "approval" as const, createdAt: TODAY, updatedAt: TODAY })); copiedCalendar = clonedContent.length; return { ...previous, content: [...clonedContent, ...previous.content], plans: { ...previous.plans, [targetKey]: { ...targetPlan, month: targetKey, platforms: nextPlatforms, channels: nextChannels, weekdays: nextWeekdays } } }; }); notify(copiedCells || copiedCalendar ? `Перенесено: ${copiedCells} ячеек плана · ${copiedCalendar} записей календаря` : `В ${monthLabel(month).toLowerCase()} уже есть этот план`); }
  function markCalendarTaskComplete(contentId: string) {
    const target = state.content.find((item) => item.id === contentId);
    if (!target) { notify("Материал календаря не найден"); return; }
    const activePlatformsInState = state.platforms.filter((platform) => !platform.archived);
    const date = target.plannedPublishDate;
    const platformId = target.plannedPlatformId ?? platformIdForContentType(target.type, activePlatformsInState);
    if (!date || !platformId) {
      notify("Нельзя отметить публикацию: у записи нет даты публикации или соцсети");
      return;
    }
    const existing = state.publications.find((publication) => publication.contentId === contentId && publication.platformId === platformId);
    if (existing) {
      if (target.status !== "published" || target.actualPublishDate !== existing.date) {
        setState((previous) => ({ ...previous, content: previous.content.map((item) => item.id === contentId ? { ...item, status: "published", actualPublishDate: existing.date, updatedAt: TODAY } : item) }));
      }
      notify("Публикация уже отмечена");
      return;
    }
    const publication = { id: makeId("publication"), contentId, platformId, date };
    recordPublicationHistory(`Публикация отмечена: ${target.title}`);
    setState((previous) => ({ ...previous, content: previous.content.map((item) => item.id === contentId ? { ...item, status: "published", actualPublishDate: date, updatedAt: TODAY } : item), publications: [publication, ...previous.publications] }));
    notify("Публикация отмечена как факт");
  }
  function markPlannedAsPublished(date: string, onlyContentIds?: string[]) { const activePlatformsInState = state.platforms.filter((platform) => !platform.archived); const allowedIds = onlyContentIds ? new Set(onlyContentIds) : null; const plannedRows = state.content.filter((item) => item.plannedPublishDate === date && (!allowedIds || allowedIds.has(item.id))).map((content) => ({ content, platformId: content.plannedPlatformId ?? platformIdForContentType(content.type, activePlatformsInState) })).filter((row): row is { content: ContentItem; platformId: string } => Boolean(row.platformId)); const existingContentPlatforms = new Set(state.publications.map((publication) => `${publication.contentId}|${publication.platformId}`)); const pendingRows = plannedRows.filter((row) => !existingContentPlatforms.has(`${row.content.id}|${row.platformId}`)); if (!pendingRows.length) { notify("Все выбранные планы уже отмечены как факт"); return; } const publicationIds = pendingRows.map(() => makeId("publication")); const newPublications = pendingRows.map((row, index) => ({ id: publicationIds[index], contentId: row.content.id, platformId: row.platformId, date })); const completedIds = new Set(pendingRows.map((row) => row.content.id)); recordPublicationHistory(`${newPublications.length} планов отмечено как опубликованные`); setState((previous) => ({ ...previous, content: previous.content.map((item) => completedIds.has(item.id) ? { ...item, status: "published", actualPublishDate: date, updatedAt: TODAY } : item), publications: [...newPublications, ...previous.publications] })); notify(`${newPublications.length} плановых публикаций отмечено как факт`); }
function markPlannedRangeAsPublished(startDate: string, endDate: string, platformIds: string[]) {
    const start = startDate <= endDate ? startDate : endDate;
    const end = startDate <= endDate ? endDate : startDate;
    const allowedPlatforms = new Set(platformIds);
    const activePlatformsInState = state.platforms.filter((platform) => !platform.archived);
    const plannedRows = state.content.filter((item) => {
      const date = item.plannedPublishDate;
      if (!date || date < start || date > end) return false;
      const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, activePlatformsInState);
      return platformId ? (!allowedPlatforms.size || allowedPlatforms.has(platformId)) : false;
    }).map((content) => ({ content, date: content.plannedPublishDate!, platformId: content.plannedPlatformId ?? platformIdForContentType(content.type, activePlatformsInState) })).filter((row): row is { content: ContentItem; date: string; platformId: string } => Boolean(row.platformId));
    const existingContentPlatforms = new Set(state.publications.map((publication) => publication.contentId + "|" + publication.platformId));
    const pendingRows = plannedRows.filter((row) => !existingContentPlatforms.has(row.content.id + "|" + row.platformId));
    if (!pendingRows.length) { notify("В выбранном периоде нет новых планов для отметки"); return; }
    const newPublications = pendingRows.map((row) => ({ id: makeId("publication"), contentId: row.content.id, platformId: row.platformId, date: row.date }));
    const completedDates = new Map(pendingRows.map((row) => [row.content.id, row.date]));
    recordPublicationHistory(`${newPublications.length} планов отмечено за период`); setState((previous) => ({ ...previous, content: previous.content.map((item) => completedDates.has(item.id) ? { ...item, status: "published", actualPublishDate: completedDates.get(item.id), updatedAt: TODAY } : item), publications: [...newPublications, ...previous.publications] }));
    notify(newPublications.length + " плановых публикаций отмечено за период");
  }

  function clearPlannedRangeFacts(startDate: string, endDate: string, platformIds: string[]) {
    const start = startDate <= endDate ? startDate : endDate;
    const end = startDate <= endDate ? endDate : startDate;
    const allowedPlatforms = new Set(platformIds);
    const plannedIds = new Set(state.content.filter((item) => {
      const date = item.plannedPublishDate;
      if (!date || date < start || date > end) return false;
      const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, state.platforms);
      return platformId ? (!allowedPlatforms.size || allowedPlatforms.has(platformId)) : false;
    }).map((item) => item.id));
    const publicationIds = state.publications.filter((publication) => {
      if (!plannedIds.has(publication.contentId)) return false;
      const content = state.content.find((item) => item.id === publication.contentId);
      return Boolean(content?.plannedPublishDate && content.plannedPublishDate >= start && content.plannedPublishDate <= end && (!allowedPlatforms.size || allowedPlatforms.has(publication.platformId)));
    }).map((publication) => publication.id);
    if (!publicationIds.length) { notify("В выбранном периоде нет отметок для снятия"); return; }
    setState((previous) => {
      const remainingPublications = previous.publications.filter((publication) => !publicationIds.includes(publication.id));
      return { ...previous, publications: remainingPublications, content: previous.content.map((item) => plannedIds.has(item.id) && !remainingPublications.some((publication) => publication.contentId === item.id) ? { ...item, status: "approval", actualPublishDate: undefined, updatedAt: TODAY } : item) };
    });
    notify("Отметки по выбранному периоду сняты");
  }
  function clearPlannedFacts(date: string) { const plannedIds = new Set(state.content.filter((item) => item.plannedPublishDate === date).map((item) => item.id)); const publicationIds = state.publications.filter((publication) => plannedIds.has(publication.contentId) && publication.date === date).map((publication) => publication.id); if (!publicationIds.length) { notify("В плане нет отмеченных публикаций"); return; } recordPublicationHistory(`Сняты отметки за ${readableDate(date)}`); setState((previous) => { const remainingPublications = previous.publications.filter((publication) => !publicationIds.includes(publication.id)); return { ...previous, publications: remainingPublications, content: previous.content.map((item) => plannedIds.has(item.id) && !remainingPublications.some((publication) => publication.contentId === item.id) ? { ...item, status: "approval", actualPublishDate: undefined, updatedAt: TODAY } : item) }; }); notify("Отметки по плану сняты"); }
  function addItem(kind: DirectoryKind, value: string, details: DirectoryDetails = {}) { const name = value.trim(); if (!name) return; setState((previous) => { if (kind === "products") { if (previous.products.some((item) => item.name.toLowerCase() === name.toLowerCase())) return previous; const order = previous.products.length; return { ...previous, products: [...previous.products, { id: makeId("product"), name, company: details.company?.trim() || "", shortName: details.shortName?.trim().slice(0, 5) || undefined, ownerName: details.ownerName?.trim() || undefined, whatsappNumber: details.whatsappNumber?.trim() || undefined, instagramAccountUrl: details.instagramAccountUrl?.trim() || undefined, color: details.color || REPORT_COLORS[order % REPORT_COLORS.length], archived: false, order }] }; } if (previous.platforms.some((item) => item.name.toLowerCase() === name.toLowerCase())) return previous; const order = previous.platforms.length; return { ...previous, platforms: [...previous.platforms, { id: makeId("platform"), name, shortName: details.shortName?.trim().slice(0, 5) || undefined, accountUrl: details.accountUrl?.trim() || undefined, color: details.color || REPORT_COLORS[order % REPORT_COLORS.length], archived: false, order }] }; }); notify(`${kind === "products" ? "Продукт" : "Соцсеть"} добавлена`); }
  function renameDirectoryItem(kind: DirectoryKind, itemId: string, patch: DirectoryPatch) { const name = patch.name?.trim(); const source = kind === "products" ? state.products : state.platforms; if (name && source.some((item) => item.id !== itemId && item.name.toLowerCase() === name.toLowerCase())) { notify("Такое название уже есть"); return; } setState((previous) => kind === "products" ? { ...previous, products: previous.products.map((item) => item.id === itemId ? { ...item, ...(name ? { name } : {}), company: patch.company?.trim() ?? item.company ?? "", shortName: patch.shortName?.trim().slice(0, 5) || item.shortName, ownerName: patch.ownerName?.trim() || undefined, whatsappNumber: patch.whatsappNumber?.trim() || undefined, instagramAccountUrl: patch.instagramAccountUrl?.trim() || item.instagramAccountUrl, color: patch.color || item.color || productAccent(item) } : item) } : { ...previous, platforms: previous.platforms.map((item) => item.id === itemId ? { ...item, ...(name ? { name } : {}), shortName: patch.shortName?.trim().slice(0, 5) || item.shortName, accountUrl: patch.accountUrl?.trim() || item.accountUrl, color: patch.color || item.color || REPORT_COLORS[item.order % REPORT_COLORS.length] } : item) }); notify(`${kind === "products" ? "Продукт" : "Соцсеть"} обновлена`); }
  function toggleArchive(kind: DirectoryKind, itemId: string) { setState((previous) => kind === "products" ? { ...previous, products: previous.products.map((item) => item.id === itemId ? { ...item, archived: !item.archived } : item) } : { ...previous, platforms: previous.platforms.map((item) => item.id === itemId ? { ...item, archived: !item.archived } : item) }); }
  function moveDirectoryItem(kind: DirectoryKind, itemId: string, direction: -1 | 1) { setState((previous) => { const source = kind === "products" ? previous.products : previous.platforms; const list = [...source].sort((a, b) => a.order - b.order); const index = list.findIndex((item) => item.id === itemId); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return previous; [list[index], list[nextIndex]] = [list[nextIndex], list[index]]; const normalized = list.map((item, order) => ({ ...item, order })); return kind === "products" ? { ...previous, products: normalized as Product[] } : { ...previous, platforms: normalized as Platform[] }; }); }
  function addBulkPublications(data: BulkPublicationInput) { const selectedProducts = [...new Set(data.productIds)].filter((productId) => activeProducts.some((product) => product.id === productId)); const selectedChannels = data.channels.filter((channel, index, channels) => channels.findIndex((item) => item.id === channel.id) === index && activePlatforms.some((platform) => platform.id === channel.platformId)); if (!selectedProducts.length || !selectedChannels.length) { notify("Выберите хотя бы один продукт и одну площадку"); return; } const existingKeys = new Set(state.publications.flatMap((publication) => { const content = state.content.find((item) => item.id === publication.contentId); return content ? [`${publication.date}|${content.productId}|${publication.platformId}|${content.type}`] : []; })); const items: ContentItem[] = []; const publications: AppState["publications"] = []; let skipped = 0; selectedProducts.forEach((productId) => selectedChannels.forEach((channel) => { const key = `${data.date}|${productId}|${channel.platformId}|${channel.type}`; if (existingKeys.has(key)) { skipped += 1; return; } existingKeys.add(key); const contentId = makeId("content"); const title = data.titles[channel.id]?.trim() || `Публикация · ${productName(state, productId)} · ${channel.type}`; items.push({ id: contentId, title, productId, type: channel.type, priority: "medium", status: "published", actualPublishDate: data.date, coauthors: [], createdAt: TODAY, updatedAt: TODAY }); publications.push({ id: makeId("publication"), contentId, platformId: channel.platformId, date: data.date }); })); if (!publications.length) { notify("Все выбранные комбинации уже отмечены"); return; } recordPublicationHistory(`${publications.length} публикаций отмечено вручную`); setState((previous) => ({ ...previous, content: [...items, ...previous.content], publications: [...publications, ...previous.publications] })); setLastBulkUndo({ contentIds: items.map((item) => item.id), publicationIds: publications.map((publication) => publication.id) }); notify(`${publications.length} публикаций добавлено${skipped ? ` · ${skipped} дублей пропущено` : ""}`); }
  function addPlannedContent(data: { title: string; brief?: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }) { const title = data.title.trim() || `План · ${productName(state, data.productId)} · ${data.type}`; const content: ContentItem = { id: makeId("content"), title, brief: data.brief?.trim() || undefined, productId: data.productId, type: data.type, priority: "medium", status: "approval", plannedPublishDate: data.plannedPublishDate, plannedPlatformId: data.plannedPlatformId, coauthors: [], createdAt: TODAY, updatedAt: TODAY }; setState((previous) => ({ ...previous, content: [content, ...previous.content] })); notify("Плановая публикация добавлена"); }
  function addPlannedContentBatch(items: Array<{ title: string; brief?: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }>) { const content = items.map((data) => ({ id: makeId("content"), title: data.title.trim() || `План · ${productName(state, data.productId)} · ${data.type}`, brief: data.brief?.trim() || undefined, productId: data.productId, type: data.type, priority: "medium" as const, status: "approval" as const, plannedPublishDate: data.plannedPublishDate, plannedPlatformId: data.plannedPlatformId, coauthors: [], createdAt: TODAY, updatedAt: TODAY })); if (!content.length) return; setState((previous) => ({ ...previous, content: [...content, ...previous.content] })); notify(`${content.length} плановых публикаций распределено по месяцу`); }
  function addRepurposedContent(sourceIds: string[], ruleIds: string[]) {
    const rules = REPURPOSE_RULES.filter((rule) => ruleIds.includes(rule.id));
    let created = 0;
    let skipped = 0;

    setState((previous) => {
      const activePlatformsInState = previous.platforms.filter((platform) => !platform.archived);
      const sourceItems = previous.content.filter(
        (item) => sourceIds.includes(item.id) && Boolean(item.plannedPublishDate),
      );
      const existingKeys = new Set(
        previous.content
          .filter((item) => item.sourceContentId)
          .map(
            (item) =>
              [item.sourceContentId, item.type, item.plannedPlatformId, item.plannedPublishDate].join("|"),
          ),
      );
      const items: ContentItem[] = [];

      sourceItems.forEach((source) => {
        rules
          .filter((rule) => rule.sourceType === source.type)
          .forEach((rule) => {
            const platformId = platformIdForContentType(rule.targetType, activePlatformsInState);
            if (!platformId || !source.plannedPublishDate) return;

            const plannedPublishDate = repurposeDate(source.plannedPublishDate, rule.offsetDays);
            const key = [source.id, rule.targetType, platformId, plannedPublishDate].join("|");
            if (existingKeys.has(key)) {
              skipped += 1;
              return;
            }

            existingKeys.add(key);
            items.push({
              id: makeId("content"),
              sourceContentId: source.id,
              title: rule.label + " · " + source.title,
              brief: source.brief,
              productId: source.productId,
              type: rule.targetType,
              priority: source.priority,
              status: "approval",
              plannedPublishDate,
              plannedPlatformId: platformId,
              coauthors: [],
              createdAt: TODAY,
              updatedAt: TODAY,
            });
          });
      });

      if (!items.length) return previous;

      const key = monthKey(month);
      const oldPlan = getOrCreatePlan(previous, key);
      const nextChannels = { ...(oldPlan.channels ?? {}) };

      items
        .filter((item) => item.plannedPublishDate?.startsWith(key))
        .forEach((item) => {
          const platform = activePlatformsInState.find((entry) => entry.id === item.plannedPlatformId);
          const channel = platform
            ? bulkChannelsForPlatform(platform).find((entry) => entry.type === item.type)
            : undefined;
          if (!channel) return;

          const current = Number(
            nextChannels[item.productId]?.[channel.id] ??
              channelPlanValue(oldPlan, item.productId, channel, activePlatformsInState),
          );
          nextChannels[item.productId] = {
            ...(nextChannels[item.productId] ?? {}),
            [channel.id]: current + 1,
          };
        });

      created = items.length;
      return {
        ...previous,
        content: [...items, ...previous.content],
        plans: {
          ...previous.plans,
          [key]: { ...oldPlan, channels: nextChannels },
        },
      };
    });

    notify(
      created
        ? "Создано адаптаций: " + created + (skipped ? " · уже были: " + skipped : "")
        : "Все выбранные адаптации уже есть в плане",
    );
  }
  function updateContent(contentId: string, patch: Partial<ContentItem>) { setState((previous) => ({ ...previous, content: previous.content.map((item) => item.id === contentId ? { ...item, ...patch, updatedAt: TODAY } : item) })); notify("Изменения сохранены"); }
  function deleteContent(contentId: string) { setState((previous) => ({ ...previous, content: previous.content.filter((item) => item.id !== contentId), publications: previous.publications.filter((item) => item.contentId !== contentId) })); notify("Материал удален"); }
  function updatePublication(publicationId: string, patch: { date?: string; platformId?: string }) { setState((previous) => ({ ...previous, publications: previous.publications.map((item) => item.id === publicationId ? { ...item, ...patch } : item) })); notify("Дата публикации изменена"); }
  function deletePublication(publicationId: string) { const target = state.publications.find((publication) => publication.id === publicationId); if (!target) return; setState((previous) => { const publications = previous.publications.filter((item) => item.id !== publicationId); const hasOtherPublication = publications.some((publication) => publication.contentId === target.contentId); return { ...previous, publications, content: previous.content.map((item) => item.id === target.contentId && !hasOtherPublication ? { ...item, status: "approval", actualPublishDate: undefined, updatedAt: TODAY } : item) }; }); notify("Публикация снята с факта"); }
  function exportReport() { window.print(); notify("Откройте диалог печати и выберите «Сохранить как PDF»"); }

  if (!authHydrated) return <AuthLoadingScreen />;
  const guestViewIds = siteSettings.guestViews.length ? siteSettings.guestViews : ["dashboard"];
  const visibleNavItems = role !== "owner" ? NAV_ITEMS.filter((item) => GUEST_NAV_ORDER.includes(item.id) && guestViewIds.includes(item.id)) : NAV_ITEMS;
  const guestTourViews = visibleNavItems.map((item) => item.id).filter((id): id is "dashboard" | "calendar" | "load" => id === "dashboard" || id === "calendar" || id === "load");
  const pageBackground = backgroundForView(siteSettings, view);

  return (
    <VisualLayoutContext.Provider value={visualLayout}>
    <div className={`app-shell relative min-h-screen bg-[#f7f8fc] text-gray-900 ${pageBackground ? "has-page-background" : ""}`}>
      {pageBackground && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url(${pageBackground})`, backgroundPosition: `${Math.min(100, Math.max(0, siteSettings.backgroundPositionX ?? DEFAULT_SITE_SETTINGS.backgroundPositionX ?? 50))}% ${Math.min(100, Math.max(0, siteSettings.backgroundPositionY ?? DEFAULT_SITE_SETTINGS.backgroundPositionY ?? 50))}%`, opacity: Math.min(100, Math.max(0, siteSettings.backgroundOpacity ?? DEFAULT_SITE_SETTINGS.backgroundOpacity ?? 35)) / 100, filter: `blur(${Math.min(12, Math.max(0, visualLayout.background.blurPx ?? 0))}px)`, transform: "scale(1.03)" }} />}
      {pageBackground && (visualLayout.background.overlayOpacityPercent ?? 0) > 0 && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-slate-950" style={{ opacity: Math.min(40, Math.max(0, visualLayout.background.overlayOpacityPercent ?? 10)) / 100 }} />}
      <WorkspaceSidebar view={view} visibleNavItems={visibleNavItems} openView={openView} role={role} siteSettings={siteSettings} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} onLogout={logout} onLogin={() => setOwnerLoginOpen(true)} />
      {mobileOpen && <button type="button" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-[#080916]/35 lg:hidden" />}
      <main className={`relative z-10 min-h-screen min-w-0 overflow-x-clip transition-[padding] ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <div className="mobile-topbar flex min-w-0 items-center gap-3 px-4 lg:hidden"><button type="button" aria-label="Открыть меню" onClick={() => setMobileOpen(true)} className="mobile-menu-button inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm"><Menu size={19} /></button><div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-700">{siteSettings.brandName}</div><div className="truncate text-sm font-bold text-gray-900">{NAV_ITEMS.find((item) => item.id === view)?.label ?? "Главная"}</div></div>{siteSettings.showSyncStatus && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${syncState === "error" ? "bg-rose-500" : syncState === "loading" || syncState === "syncing" ? "bg-amber-400" : "bg-emerald-500"}`} title={syncState === "error" ? "Нет синхронизации" : syncState === "loading" ? "Загрузка данных" : syncState === "syncing" ? "Сохраняем изменения" : syncState === "synced" ? "Синхронизировано" : "Локальный режим"} />}</div>
        <div className="mx-auto max-w-[1400px] min-w-0 p-4 pb-24 sm:p-6 lg:px-8 lg:pb-8 lg:pt-6">{view === "dashboard" && <WorkReport state={state} month={month} setMonth={setMonth} products={activeProducts} platforms={activePlatforms} plan={currentPlan} readOnly={role !== "owner"} actual={actual} onExport={exportReport} syncState={syncState} />}{view === "today" && role === "owner" && <Today state={state} products={activeProducts} platforms={activePlatforms} onSubmit={addBulkPublications} onDirectory={() => { setDirectoryKind("products"); openView("directory"); }} onNotify={notify} onMarkPlanned={markPlannedAsPublished} onMarkPlannedRange={markPlannedRangeAsPublished} onClearPlanned={clearPlannedFacts} onClearPlannedRange={clearPlannedRangeFacts} onRemoveFact={deletePublication} publicationHistory={publicationHistory} onUndoPublication={undoPublicationHistory} />}{view === "calendar" && <Calendar state={state} month={month} setMonth={setMonth} products={activeProducts} readOnly={role !== "owner"} designerMode={role === "designer"} onNotify={notify} onCreatePlan={addPlannedContent} onUpdateContent={updateContent} onDeleteContent={deleteContent} onUpdatePublication={updatePublication} onDeletePublication={deletePublication} onMarkPlanned={markPlannedAsPublished} />}{view === "tasks" && role === "owner" && (tasksHydrated ? <TasksPage tasks={tasks} calendarItems={state.content} publications={state.publications} products={activeProducts} platforms={activePlatforms} onCreateTask={createTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} onCompleteCalendar={markCalendarTaskComplete} onOpenCalendar={(date) => { setMonth(new Date(`${date}T12:00:00`)); openView("calendar"); }} /> : <div className="grid min-h-64 place-items-center rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-gray-500">Загружаем личные задачи…</div>)}{view === "load" && <LoadPage month={month} setMonth={setMonth} products={activeProducts} platforms={activePlatforms} plan={currentPlan} settings={state.workload} readOnly={role !== "owner"} onUpdateSettings={updateWorkloadSettings} />}{view === "plan" && role === "owner" && <PlanFact month={month} setMonth={setMonth} products={activeProducts} platforms={activePlatforms} plan={currentPlan} plannedContent={state.content} publications={state.publications} readOnly={false} actual={actual} actualChannel={actualChannel} onSetPlan={updatePlan} onSetChannelPlan={updateChannelPlan} onSetProductWeekdays={updateProductWeekdays} onCopyPreviousMonth={copyPreviousMonth} onExport={exportReport} onCreatePlan={addPlannedContent} onCreateManyPlans={addPlannedContentBatch} onUpdateContent={updateContent} onDeleteContent={deleteContent} onCreateRepurposedContent={addRepurposedContent} />}{view === "directory" && role === "owner" && <DirectoryCatalog kind={directoryKind} state={state} onSwitch={setDirectoryKind} onAdd={addItem} onRename={renameDirectoryItem} onToggleArchive={toggleArchive} onMove={moveDirectoryItem} />}{view === "settings" && role === "owner" && <SiteSettingsPage settings={persistedSiteSettings} onPreview={previewSiteSettings} onSave={updateSiteSettings} onDiscardPreview={discardSiteSettingsPreview} onNotify={notify} />}</div>
        {role === "owner" && view !== "today" && <button type="button" onClick={() => openView("today")} className="fixed bottom-4 right-4 z-20 inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-300/40 transition hover:bg-blue-700 lg:hidden"><Plus size={17} /> Отметить</button>}
      </main>
      {!visualPreviewMode && <GuestProductTour enabled={authHydrated && role === "guest"} view={view} availableViews={guestTourViews} mobileOpen={mobileOpen} showContact={siteSettings.showContact} onOpenMobileMenu={() => setMobileOpen(true)} />}
      {ownerLoginOpen && <OwnerLoginDialog onClose={() => setOwnerLoginOpen(false)} onLogin={(account, password) => login(account, password)} />}{toast && <div role="status" className="fixed bottom-5 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-xl"><Check size={16} className="text-emerald-300" /><span>{toast}</span>{lastBulkUndo && <button type="button" onClick={undoLastBulkAdd} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-white/20">Отменить</button>}</div>}
    </div>
    </VisualLayoutContext.Provider>
  );
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title?: string; description?: string; actions?: ReactNode }) {
  const visualLayout = useVisualLayout();
  const header = visualLayout.pageHeader;
  const colors = header.tone === "emerald" ? ["#a7f3d0", "#6ee7b7", "#bfdbfe", "#d1fae5"] : header.tone === "violet" ? ["#ddd6fe", "#c4b5fd", "#bfdbfe", "#e9d5ff"] : ["#bfdbfe", "#93c5fd", "#c4b5fd", "#a7f3d0"];
  return <header className="app-page-header relative mb-4 overflow-hidden border border-blue-100/80 bg-blue-50 shadow-sm" style={{ borderRadius: `${header.radiusPx}px` }}>
    <AnimatedGradient colors={colors} speed={0.035} blur="medium" />
    <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" style={{ padding: `${header.paddingYpx ?? 20}px ${header.paddingXpx ?? 20}px` }}>
      <div className={`min-w-0 ${header.align === "center" ? "text-center sm:text-center" : ""}`}>
        {eyebrow && header.showEyebrow && <p className="text-[11px] font-bold uppercase tracking-[.14em] text-blue-800/75">{eyebrow}</p>}
        {title && <h2 className="mt-1 font-bold leading-tight tracking-tight text-blue-950" style={{ fontSize: `${header.titleSizePx ?? 24}px` }}>{title}</h2>}
        {description && <p className="mt-1 max-w-3xl text-sm leading-5 text-blue-950/70">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 print:hidden sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  </header>;
}

type CalendarTaskProjection = {
  kind: "calendar";
  id: string;
  contentId: string;
  title: string;
  dueDate: string;
  publishDate?: string;
  dueTime?: string;
  status: TaskStatus;
  priority: TaskPriority;
  productName: string;
  productShortName: string;
  productColor: string;
  contentType: ContentType;
  platformId?: string;
  platformName?: string;
};
type TaskListItem = (PersonalTask & { kind: "manual" }) | CalendarTaskProjection;
type TaskMode = "today" | "all" | "kanban";
type NewTaskInput = Pick<PersonalTask, "title" | "description" | "dueDate" | "dueTime" | "priority" | "status">;

const TASK_STATUS_COLUMNS: { id: TaskStatus; label: string; description: string }[] = [
  { id: "todo", label: "К выполнению", description: "Новые и ожидающие задачи" },
  { id: "in_progress", label: "В работе", description: "То, чем занимаются сейчас" },
  { id: "completed", label: "Выполнено", description: "Готовые задачи" },
];
const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Низкий", medium: "Обычный", high: "Высокий" };
const TASK_STATUS_LABELS: Record<TaskStatus, string> = { todo: "К выполнению", in_progress: "В работе", completed: "Выполнено" };

function taskDateLabel(value: string, today: string) {
  if (value === today) return "Сегодня";
  const tomorrow = dateInput(addDays(new Date(`${today}T12:00:00`), 1));
  if (value === tomorrow) return "Завтра";
  return format(new Date(`${value}T12:00:00`), "EEE, d MMM", { locale: ru });
}

function calendarTaskStatus(item: ContentItem, publications: Publication[]): TaskStatus {
  if (item.status === "published" || publications.some((publication) => publication.contentId === item.id)) return "completed";
  if (item.status === "shoot" || item.status === "shot" || item.status === "editing") return "in_progress";
  return "todo";
}

function TaskForm({ task, defaultDate, onSave, onCancel }: { task?: PersonalTask; defaultDate: string; onSave: (input: NewTaskInput) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDate);
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !dueDate) return;
    onSave({ title: title.trim(), description: description.trim() || undefined, dueDate, dueTime: dueTime || undefined, priority, status });
  }

  return <form onSubmit={submit} className="grid gap-4">
    <Field label="Название"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Что нужно сделать?" className={inputClass} required /></Field>
    <Field label="Описание"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Короткая заметка или контекст" className={`${inputClass} min-h-24 resize-y`} /></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Дата"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} required /></Field><Field label="Время"><input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} className={inputClass} /></Field></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Приоритет"><AppSelect value={priority} onChange={(value) => setPriority(value as TaskPriority)} ariaLabel="Приоритет задачи" options={Object.entries(TASK_PRIORITY_LABELS).map(([id, label]) => ({ id, label }))} /></Field><Field label="Статус"><AppSelect value={status} onChange={(value) => setStatus(value as TaskStatus)} ariaLabel="Статус задачи" options={Object.entries(TASK_STATUS_LABELS).map(([id, label]) => ({ id, label }))} /></Field></div>
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onCancel} className="w-full sm:w-auto">Отмена</Button><Button type="submit" className="w-full sm:w-auto"><Check size={15} />{task ? "Сохранить" : "Добавить задачу"}</Button></div>
  </form>;
}

function TaskCard({ item, today, onComplete, onTomorrow, onEdit, onDelete, onOpenCalendar, onDragStart }: { item: TaskListItem; today: string; onComplete: () => void; onTomorrow?: () => void; onEdit?: () => void; onDelete?: () => void; onOpenCalendar?: () => void; onDragStart?: (event: ReactDragEvent<HTMLElement>) => void }) {
  const manual = item.kind === "manual";
  const overdue = item.dueDate < today && item.status !== "completed";
  const completed = item.status === "completed";
  return <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}><article draggable={manual} onDragStart={onDragStart} onClick={manual ? onEdit : onOpenCalendar} className={`group cursor-pointer rounded-[var(--app-radius-md)] border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md ${overdue ? "border-rose-200 bg-rose-50/40" : "border-[var(--app-border)]"} ${completed ? "opacity-70" : ""}`}>
    <div className="flex items-start gap-3"><button type="button" onClick={(event) => { event.stopPropagation(); onComplete(); }} aria-label={completed ? "Публикация отмечена" : "Отметить выполненной"} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white text-transparent hover:border-blue-500"}`}><Check size={12} strokeWidth={3} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className={`truncate text-sm font-bold text-gray-900 ${completed ? "line-through" : ""}`}>{item.title}</h4>{item.priority === "high" && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Важно</span>}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500"><span className={overdue ? "font-bold text-rose-600" : "font-semibold text-gray-600"}>{overdue ? "Просрочено · " : ""}{taskDateLabel(item.dueDate, today)}</span>{item.dueTime && <span>· {item.dueTime}</span>}<span className="text-gray-300">·</span><span>{manual ? "Личная задача" : `${item.productShortName} · ${item.contentType}`}</span></div>{!manual && <p className="mt-1 truncate text-xs text-gray-400">Из календаря{item.platformName ? ` · ${item.platformName}` : ""}</p>}{manual && item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">{item.description}</p>}</div><div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">{manual && !completed && <IconButton label="На завтра" onClick={(event) => { event?.stopPropagation?.(); onTomorrow?.(); }}><ArrowRight size={14} /></IconButton>}{manual && <IconButton label="Редактировать" onClick={(event) => { event?.stopPropagation?.(); onEdit?.(); }}><Pencil size={14} /></IconButton>}{manual && <IconButton label="Удалить" onClick={(event) => { event?.stopPropagation?.(); onDelete?.(); }}><Trash2 size={14} /></IconButton>}</div></div>
  </article></motion.div>;
}

function TaskSection({ title, description, items, today, empty, onComplete, onTomorrow, onEdit, onDelete, onOpenCalendar }: { title: string; description?: string; items: TaskListItem[]; today: string; empty: string; onComplete: (item: TaskListItem) => void; onTomorrow: (item: TaskListItem) => void; onEdit: (item: PersonalTask) => void; onDelete: (item: PersonalTask) => void; onOpenCalendar: (item: CalendarTaskProjection) => void }) {
  return <section className="grid gap-3"><div><h3 className="text-sm font-bold text-gray-900">{title}</h3>{description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}</div>{items.length ? <div className="grid grid-cols-2 gap-2">{items.map((item) => <TaskCard key={`${item.kind}-${item.id}`} item={item} today={today} onComplete={() => onComplete(item)} onTomorrow={() => onTomorrow(item)} onEdit={item.kind === "manual" ? () => onEdit(item) : undefined} onDelete={item.kind === "manual" ? () => onDelete(item) : undefined} onOpenCalendar={item.kind === "calendar" ? () => onOpenCalendar(item) : undefined} />)}</div> : <div className="rounded-[var(--app-radius-md)] border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-subtle)] px-4 py-5 text-center text-xs text-gray-500">{empty}</div>}</section>;
}

function TasksPage({ tasks, calendarItems, publications, products, platforms, onCreateTask, onUpdateTask, onDeleteTask, onOpenCalendar, onCompleteCalendar }: { tasks: PersonalTask[]; calendarItems: ContentItem[]; publications: Publication[]; products: Product[]; platforms: Platform[]; onCreateTask: (input: NewTaskInput) => void; onUpdateTask: (taskId: string, patch: Partial<NewTaskInput>) => void; onDeleteTask: (taskId: string) => void; onOpenCalendar: (date: string) => void; onCompleteCalendar: (contentId: string) => void }) {
  const today = dateInput(new Date());
  const [mode, setMode] = useState<TaskMode>("today");
  const [query, setQuery] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDate, setQuickDate] = useState(today);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const calendarTasks = useMemo<CalendarTaskProjection[]>(() => calendarItems.flatMap((item, index) => {
    const dueDate = item.plannedPublishDate ?? item.plannedShootDate;
    if (!dueDate) return [];
    const product = products.find((entry) => entry.id === item.productId);
    const plannedPlatformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms);
    const platform = platforms.find((entry) => entry.id === plannedPlatformId);
    return [{ kind: "calendar" as const, id: `calendar-${item.id}`, contentId: item.id, title: item.title, dueDate, dueTime: item.plannedPublishDate ? item.plannedShootTime : item.plannedShootTime, status: calendarTaskStatus(item, publications), priority: "medium" as const, productName: product?.name ?? "Без продукта", productShortName: product ? productShortName(product) : "—", productColor: productAccent(product ?? { id: "", name: "", archived: false, order: index }), contentType: item.type, platformName: platform?.name, publishDate: item.plannedPublishDate, platformId: plannedPlatformId }];
  }), [calendarItems, platforms, products, publications]);
  const manualTasks = useMemo<TaskListItem[]>(() => tasks.map((task) => ({ ...task, kind: "manual" as const })), [tasks]);
  const allItems = useMemo<TaskListItem[]>(() => [...manualTasks, ...calendarTasks].filter((item) => !query.trim() || `${item.title} ${item.kind === "manual" ? item.description ?? "" : `${item.productName} ${item.contentType}`}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => `${a.dueDate} ${a.dueTime ?? ""}`.localeCompare(`${b.dueDate} ${b.dueTime ?? ""}`)), [calendarTasks, manualTasks, query]);
  const overdue = allItems.filter((item) => item.dueDate < today && item.status !== "completed");
  const todayItems = allItems.filter((item) => item.dueDate === today && item.status !== "completed");
  const completedToday = allItems.filter((item) => item.dueDate === today && item.status === "completed");
  const upcoming = allItems.filter((item) => item.dueDate > today).slice(0, 8);
  const activeCount = allItems.filter((item) => item.status !== "completed").length;
  const completedCount = allItems.filter((item) => item.status === "completed").length;

  function submitQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    onCreateTask({ title: quickTitle.trim(), dueDate: quickDate || today, priority: "medium", status: "todo" });
    setQuickTitle("");
    setQuickDate(today);
  }
  function saveDetails(input: NewTaskInput) {
    if (editingTask) onUpdateTask(editingTask.id, input);
    else onCreateTask(input);
    setDetailsOpen(false);
    setEditingTask(null);
  }
  function openEditor(task?: PersonalTask) { setEditingTask(task ?? null); setDetailsOpen(true); }
  function complete(item: TaskListItem) {
    if (item.kind === "manual") {
      if (item.status !== "completed") onUpdateTask(item.id, { status: "completed" });
      return;
    }
    onCompleteCalendar(item.contentId);
  }
  function tomorrow(item: TaskListItem) { if (item.kind === "manual") onUpdateTask(item.id, { dueDate: dateInput(addDays(new Date(`${item.dueDate}T12:00:00`), 1)) }); }
  function dropStatus(status: TaskStatus) { if (draggedTaskId) onUpdateTask(draggedTaskId, { status }); setDraggedTaskId(null); }

  return <div className="grid gap-5">
    <PageHeader eyebrow="Личные задачи" title="Задачи" description="Собирайте личные задачи и публикации календаря в одном рабочем списке." />

    <section className="grid gap-4 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-sm)] sm:p-5"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-blue-700">Сегодня · {format(new Date(`${today}T12:00:00`), "d MMMM", { locale: ru })}</p><h3 className="mt-1 text-xl font-bold tracking-tight text-gray-900">Фокус на ближайшем</h3><p className="mt-1 text-sm text-gray-500">{activeCount ? `${activeCount} активных задач` : "Все задачи на сегодня закрыты"} · {completedCount} выполнено</p><div className="mt-3"><Button onClick={() => openEditor()}><Plus size={16} /> Новая задача</Button></div></div><div className="min-w-[180px]"><div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-500"><span>Прогресс</span><span>{completedToday.length}/{todayItems.length + completedToday.length}</span></div><Progress value={todayItems.length + completedToday.length ? (completedToday.length / (todayItems.length + completedToday.length)) * 100 : 0} tone="success" /></div></div><form onSubmit={submitQuick} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="Быстро добавить задачу…" className={inputClass} aria-label="Название новой задачи" /><input type="date" value={quickDate} onChange={(event) => setQuickDate(event.target.value)} className={`${inputClass} sm:w-[150px]`} aria-label="Дата новой задачи" /><Button type="submit" className="w-full sm:w-auto"><Plus size={15} /> Добавить</Button></form></section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-1 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface)] p-1"><button type="button" aria-pressed={mode === "today"} onClick={() => setMode("today")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "today" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Сегодня</button><button type="button" aria-pressed={mode === "all"} onClick={() => setMode("all")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "all" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Все задачи</button><button type="button" aria-pressed={mode === "kanban"} onClick={() => setMode("kanban")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "kanban" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Канбан</button></div><label className="relative block w-full sm:w-64"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти задачу…" className={`${inputClass} pl-9`} aria-label="Поиск задач" /></label></div>
    {mode === "today" && <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]"><div className="grid gap-6"><TaskSection title="Просрочено" description="Не исчезает, пока задача не выполнена или не перенесена." items={overdue} today={today} empty="Просроченных задач нет" onComplete={complete} onTomorrow={tomorrow} onEdit={openEditor} onDelete={(item) => onDeleteTask(item.id)} onOpenCalendar={(item) => onOpenCalendar(item.dueDate)} /><TaskSection title="Сегодня" description="Личные задачи и запланированные публикации на текущую дату." items={todayItems} today={today} empty="На сегодня всё свободно — можно добавить первую задачу." onComplete={complete} onTomorrow={tomorrow} onEdit={openEditor} onDelete={(item) => onDeleteTask(item.id)} onOpenCalendar={(item) => onOpenCalendar(item.dueDate)} /></div><div className="grid content-start gap-6"><TaskSection title="Выполнено сегодня" items={completedToday} today={today} empty="Выполненных задач пока нет" onComplete={complete} onTomorrow={tomorrow} onEdit={openEditor} onDelete={(item) => onDeleteTask(item.id)} onOpenCalendar={(item) => onOpenCalendar(item.dueDate)} /><TaskSection title="Дальше" description="Ближайшие 8 задач из календаря и личного списка." items={upcoming} today={today} empty="Будущих задач нет" onComplete={complete} onTomorrow={tomorrow} onEdit={openEditor} onDelete={(item) => onDeleteTask(item.id)} onOpenCalendar={(item) => onOpenCalendar(item.dueDate)} /></div></div>}
    {mode === "all" && <section className="grid gap-3"><div><h3 className="text-sm font-bold text-gray-900">Все задачи</h3><p className="mt-0.5 text-xs text-gray-500">Личные задачи редактируются здесь, календарные записи открываются в календаре.</p></div>{allItems.length ? <div className="grid gap-2">{allItems.map((item) => <TaskCard key={`${item.kind}-${item.id}`} item={item} today={today} onComplete={() => complete(item)} onTomorrow={() => tomorrow(item)} onEdit={item.kind === "manual" ? () => openEditor(item) : undefined} onDelete={item.kind === "manual" ? () => onDeleteTask(item.id) : undefined} onOpenCalendar={item.kind === "calendar" ? () => onOpenCalendar(item.dueDate) : undefined} />)}</div> : <div className="rounded-[var(--app-radius-md)] border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-subtle)] px-4 py-8 text-center text-sm text-gray-500">Ничего не найдено</div>}</section>}
    {mode === "kanban" && <section className="grid gap-3"><div><h3 className="text-sm font-bold text-gray-900">Канбан</h3><p className="mt-0.5 text-xs leading-5 text-gray-500">Перетаскивайте личные задачи между статусами. Публикации из календаря остаются связанными с календарём.</p></div><div className="grid gap-3 lg:grid-cols-3">{TASK_STATUS_COLUMNS.map((column) => { const columnItems = allItems.filter((item) => item.status === column.id); return <div key={column.id} onDragOver={(event) => { if (draggedTaskId) event.preventDefault(); }} onDrop={() => dropStatus(column.id)} className="min-h-44 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 transition data-[drag-over=true]:border-blue-400"><div className="mb-3 flex items-start justify-between gap-2"><div><h4 className="text-sm font-bold text-gray-900">{column.label}</h4><p className="mt-0.5 text-[11px] text-gray-500">{column.description}</p></div><span className="ui-badge">{columnItems.length}</span></div><div className="grid gap-2">{columnItems.map((item) => <TaskCard key={`${item.kind}-${item.id}`} item={item} today={today} onComplete={() => complete(item)} onTomorrow={() => tomorrow(item)} onEdit={item.kind === "manual" ? () => openEditor(item) : undefined} onDelete={item.kind === "manual" ? () => onDeleteTask(item.id) : undefined} onOpenCalendar={item.kind === "calendar" ? () => onOpenCalendar(item.dueDate) : undefined} onDragStart={item.kind === "manual" ? (event) => { setDraggedTaskId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); } : undefined} />)}</div></div>; })}</div></section>}
    {detailsOpen && <Modal title={editingTask ? "Редактировать задачу" : "Новая задача"} onClose={() => { setDetailsOpen(false); setEditingTask(null); }}><TaskForm key={editingTask?.id ?? "new"} task={editingTask ?? undefined} defaultDate={today} onSave={saveDetails} onCancel={() => { setDetailsOpen(false); setEditingTask(null); }} /></Modal>}
  </div>;
}

function MonthSwitcher({ month, setMonth }: { month: Date; setMonth: (month: Date) => void }) { return <div className="flex items-center gap-1 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-sm"><IconButton label="Предыдущий месяц" onClick={() => setMonth(subMonths(month, 1))}><ArrowLeft size={16} /></IconButton><span className="min-w-[115px] text-center text-sm font-semibold text-gray-900">{monthLabel(month)}</span><IconButton label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}><ArrowRight size={16} /></IconButton></div>; }

function MetricCard({ label, value, unit, description, accent = false, animate = true, trend = null }: { label: string; value: ReactNode; unit?: string; description: string; accent?: boolean; animate?: boolean; trend?: number | null }) { const animatedValue = animate && typeof value === "number" ? <NumberTicker value={value} className={accent ? "text-white" : "text-gray-900"} /> : value; return <div className={`metric-card relative overflow-hidden rounded-[var(--app-radius-lg)] border p-5 ${accent ? "border-blue-600 bg-blue-600 text-white" : "border-gray-100 bg-white text-gray-900"}`}><span className={`absolute bottom-0 left-0 top-0 w-1 ${accent ? "bg-blue-300" : "bg-blue-600"}`} /><p className={`text-[11px] font-semibold uppercase tracking-wide ${accent ? "text-blue-100" : "text-gray-500"}`}>{label}</p><p className="mt-3 flex items-baseline gap-2"><span className="text-3xl font-bold tracking-tight">{animatedValue}</span>{unit && <span className={`text-sm font-semibold ${accent ? "text-blue-100" : "text-gray-500"}`}>{unit}</span>}</p><p className={`mt-2 text-xs ${accent ? "text-blue-100" : "text-gray-500"}`}>{description}</p>{typeof trend === "number" && <span className={`mt-2 inline-flex items-center text-[11px] font-semibold ${accent ? "text-blue-100" : trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend)}% к прошлому месяцу</span>}</div>; }

type WorkloadProductRow = { product: Product; breakdown: WorkloadBreakdown; hours: number; publications: number };

const WORKLOAD_CAPACITY = 176;
const WORKLOAD_RATES: Record<string, WorkloadBreakdown> = {
  Reels: { organization: 2, shooting: 2.5, editing: 3, design: 0.5, publishing: 0.5 },
  Пост: { organization: 1, shooting: 0, editing: 1.5, design: 1.5, publishing: 0.5 },
  Stories: { organization: 0.1, shooting: 0, editing: 0, design: 0.25, publishing: 0.25 },
  Threads: { organization: 0.1, shooting: 0, editing: 0, design: 0, publishing: 0.2 },
  TikTok: { organization: 0, shooting: 0, editing: 0.25, design: 0, publishing: 0.25 },
  LinkedIn: { organization: 0.25, shooting: 0, editing: 0.25, design: 0.25, publishing: 0.25 },
  YouTube: { organization: 2, shooting: 2.5, editing: 6, design: 1, publishing: 0.5 },
  Shorts: { organization: 0, shooting: 0, editing: 0.5, design: 0, publishing: 0.25 },
  Другое: { organization: 0.25, shooting: 0, editing: 0.25, design: 0.25, publishing: 0.25 },
};
const DEFAULT_WORKLOAD_SETTINGS: WorkloadSettings = { capacityHours: WORKLOAD_CAPACITY, rates: WORKLOAD_RATES as WorkloadSettings["rates"] };

function emptyWorkload(): WorkloadBreakdown { return { organization: 0, shooting: 0, editing: 0, design: 0, publishing: 0 }; }
function addWorkload(target: WorkloadBreakdown, rate: WorkloadBreakdown, count: number) { target.organization += rate.organization * count; target.shooting += rate.shooting * count; target.editing += rate.editing * count; target.design += rate.design * count; target.publishing += rate.publishing * count; }
function workloadTotal(value: WorkloadBreakdown) { return value.organization + value.shooting + value.editing + value.design + value.publishing; }
function formatHours(value: number) { return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 }); }
function calculateWorkload(products: Product[], platforms: Platform[], plan: MonthPlan, settings: WorkloadSettings) {
  const channels = platforms.flatMap(bulkChannelsForPlatform);
  const productRows: WorkloadProductRow[] = products.map((product) => {
    const breakdown = emptyWorkload();
    let publications = 0;
    channels.forEach((channel) => { const count = channelPlanValue(plan, product.id, channel, platforms); publications += count; addWorkload(breakdown, settings.rates[channel.type] ?? settings.rates.Другое, count); });
    return { product, breakdown, hours: workloadTotal(breakdown), publications };
  });
  const breakdown = productRows.reduce((total, row) => { total.organization += row.breakdown.organization; total.shooting += row.breakdown.shooting; total.editing += row.breakdown.editing; total.design += row.breakdown.design; total.publishing += row.breakdown.publishing; return total; }, emptyWorkload());
  return { productRows, breakdown, hours: workloadTotal(breakdown), publications: productRows.reduce((sum, row) => sum + row.publications, 0) };
}

function LoadPage({ month, setMonth, products, platforms, plan, settings, readOnly = true, onUpdateSettings }: { month: Date; setMonth: (month: Date) => void; products: Product[]; platforms: Platform[]; plan: MonthPlan; settings?: WorkloadSettings; readOnly?: boolean; onUpdateSettings?: (next: WorkloadSettings) => void }) {
  const workloadSettings = settings ?? DEFAULT_WORKLOAD_SETTINGS;
  const summary = useMemo(() => calculateWorkload(products, platforms, plan, workloadSettings), [plan, platforms, products, workloadSettings]);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [scenarioProductId, setScenarioProductId] = useState(products[0]?.id ?? "");
  const [scenarioReels, setScenarioReels] = useState(0);
  const selectedRow = summary.productRows.find((row) => row.product.id === selectedProductId) ?? summary.productRows[0];
  const scenarioProduct = products.find((product) => product.id === scenarioProductId);
  const reelsHours = workloadTotal(workloadSettings.rates.Reels);
  const scenarioTotal = summary.hours + scenarioReels * reelsHours;
  const utilization = workloadSettings.capacityHours ? summary.hours / workloadSettings.capacityHours * 100 : 0;
  const scenarioUtilization = workloadSettings.capacityHours ? scenarioTotal / workloadSettings.capacityHours * 100 : 0;
  const status = utilization > 100 ? "Перегрузка" : utilization >= 90 ? "Почти весь ресурс занят" : utilization >= 80 ? "Высокая загрузка" : "Нормальная плановая загрузка";
  const statusClass = utilization > 100 ? "bg-rose-100 text-rose-700" : utilization >= 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  const categories = [{ key: "organization", label: "Организация", value: summary.breakdown.organization, icon: ClipboardList }, { key: "shooting", label: "Съёмка", value: summary.breakdown.shooting, icon: Clock3 }, { key: "editing", label: "Монтаж", value: summary.breakdown.editing, icon: Sparkles }, { key: "design", label: "Дизайн", value: summary.breakdown.design, icon: Target }, { key: "publishing", label: "Публикация", value: summary.breakdown.publishing, icon: Upload }];
  const workloadKeys: Array<keyof WorkloadBreakdown> = ["organization", "shooting", "editing", "design", "publishing"];
  const workloadLabels: Record<keyof WorkloadBreakdown, string> = { organization: "Организация", shooting: "Съёмка", editing: "Монтаж", design: "Дизайн", publishing: "Публикация" };
  const processRadarData = categories.map(({ label, value }) => ({ metric: label, hours: Number(value.toFixed(1)) }));
  const productRadarData = summary.productRows.filter((row) => row.hours > 0).map((row) => ({ product: productShortName(row.product), hours: Number(row.hours.toFixed(1)) }));
  function updateWorkloadRate(type: ContentType, key: keyof WorkloadBreakdown, value: number) { if (readOnly || !onUpdateSettings) return; onUpdateSettings({ ...workloadSettings, rates: { ...workloadSettings.rates, [type]: { ...workloadSettings.rates[type], [key]: Math.max(0, value) } } }); }
  function updateWorkloadCapacity(value: number) { if (readOnly || !onUpdateSettings) return; onUpdateSettings({ ...workloadSettings, capacityHours: Math.max(1, value) }); }

  return <div className="grid gap-4">
    <PageHeader eyebrow="Ресурс команды" title="Нагрузка" description="Показывает, сколько времени требует текущий контент-план по процессам и продуктам." />
    <FeatureBento>
      <div data-tour="workload-summary" className="grid gap-3 lg:grid-cols-12">
        <div className="rounded-2xl bg-blue-700 p-4 text-white shadow-lg shadow-blue-700/20 lg:col-span-7 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-100">Рабочий ресурс · {monthLabel(month)}</p><h3 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">План требует <NumberTicker value={summary.hours} decimalPlaces={1} className="font-bold" /> ч</h3><p className="mt-1.5 max-w-xl text-sm leading-5 text-blue-100">Расчёт учитывает производство контента и отдельную публикацию на каждой площадке.</p></div><div className="flex w-full shrink-0 flex-row items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end"><MonthSwitcher month={month} setMonth={setMonth} /><Gauge className="text-blue-200" size={26} /></div></div><div className="mt-4 flex flex-wrap items-end justify-between gap-3 sm:mt-5"><div><NumberTicker value={utilization} decimalPlaces={1} className="text-4xl font-bold tracking-tight" /><span className="ml-2 text-sm text-blue-100">%</span></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${utilization > 100 ? "bg-white text-rose-700" : "bg-white/15 text-white"}`}>{status}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className={`h-full rounded-full ${utilization > 100 ? "bg-rose-300" : utilization >= 80 ? "bg-amber-300" : "bg-emerald-300"}`} style={{ width: `${Math.min(utilization, 100)}%` }} /></div></div>
        <div className="grid grid-cols-2 gap-2 lg:col-span-5"><div className="rounded-2xl border border-white/80 bg-white/80 p-3 backdrop-blur-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-900/55">Запланировано</p><p className="mt-2 text-2xl font-bold text-blue-950"><SlotText text={String(summary.publications)} /></p><p className="mt-1 text-xs text-blue-900/55">публикаций в этом месяце</p></div><div className="rounded-2xl border border-white/80 bg-white/80 p-3 backdrop-blur-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-900/55">Свободно</p><p className={`mt-2 text-2xl font-bold ${summary.hours > workloadSettings.capacityHours ? "text-rose-600" : "text-blue-950"}`}><SlotText text={formatHours(Math.max(workloadSettings.capacityHours - summary.hours, 0))} /></p><p className="mt-1 text-xs text-blue-900/55">часов ресурса</p></div><div className="col-span-2 rounded-2xl border border-white/80 bg-white/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-900/55">Контроль фонда</p><p className="mt-1 text-sm font-semibold text-blue-950">Настроенный фонд: <SlotText text={formatHours(workloadSettings.capacityHours)} /> часов</p><p className="mt-1 text-xs text-blue-900/55">Это индикатор плановой загрузки, а не оценка эффективности.</p></div></div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3 lg:col-span-8"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Куда уходит время</p><p className="mt-1 text-sm font-semibold text-blue-950">Распределение по процессам</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass}`}>{formatHours(summary.hours)} ч всего</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{categories.map(({ key, label, value, icon: Icon }) => <div key={key} className="rounded-xl border border-white bg-white/80 p-3"><div className="flex items-center gap-2 text-blue-900/60"><Icon size={14} /><span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div><p className="mt-2 text-xl font-bold text-blue-950"><SlotText text={formatHours(value)} /> ч</p><p className="mt-1 text-[11px] text-blue-900/55">{summary.hours ? Math.round(value / summary.hours * 100) : 0}% от загрузки</p></div>)}</div></div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3 lg:col-span-4"><div className="flex items-center gap-2"><Target size={15} className="text-blue-700" /><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Что будет, если…</p></div><p className="mt-1 text-xs leading-5 text-blue-900/65">Временная модель не изменяет утверждённый план.</p><div className="mt-3 grid gap-2"><AppSelect value={scenarioProductId} onChange={setScenarioProductId} options={products.map((product) => ({ id: product.id, label: product.name, textValue: product.name }))} ariaLabel="Продукт для сценария" /><div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 p-2"><span className="text-xs font-semibold text-gray-600">Добавить Reels</span><NumberField value={scenarioReels} min={0} max={20} onValueChange={setScenarioReels} className="w-24"><NumberFieldGroup className="h-7"><NumberFieldInput aria-label="Дополнительные Reels" /><NumberFieldDecrement /><NumberFieldIncrement /></NumberFieldGroup></NumberField></div><div className="rounded-lg bg-blue-700 px-3 py-2 text-white"><div className="flex items-center justify-between text-xs"><span>Новая загрузка</span><strong><SlotText text={formatHours(scenarioTotal)} /> ч · <SlotText text={formatHours(scenarioUtilization)} />%</strong></div><p className="mt-1 text-[10px] text-blue-100">{scenarioProduct?.name ?? "Продукт"}: +{formatHours(scenarioReels * reelsHours)} ч</p></div></div></div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3 lg:col-span-7"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Продукты</p><p className="mt-1 text-sm font-semibold text-blue-950">Кто потребляет ресурс</p></div><span className="text-[11px] font-semibold text-blue-900/55">Нажмите для детализации</span></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{summary.productRows.map((row) => <button type="button" key={row.product.id} onClick={() => setSelectedProductId(row.product.id)} className={`rounded-xl border p-2.5 text-left transition ${selectedProductId === row.product.id ? "border-blue-300 bg-white shadow-sm" : "border-white bg-white/60 hover:bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs font-bold text-blue-950">{row.product.name}</span><span className="shrink-0 text-xs font-bold text-blue-700"><SlotText text={formatHours(row.hours)} /> ч</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${summary.hours ? Math.min(row.hours / summary.hours * 100, 100) : 0}%` }} /></div><div className="mt-1 text-[10px] text-blue-900/55"><SlotText text={String(row.publications)} /> публикаций</div></button>)}</div></div>
         <div className="rounded-2xl border border-white/80 bg-white/75 p-3 lg:col-span-5">{selectedRow ? <><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Детализация</p><h3 className="mt-1 text-lg font-bold text-blue-950">{selectedRow.product.name}</h3></div><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{formatHours(selectedRow.hours)} ч</span></div><div className="mt-4 grid gap-2">{categories.map(({ key, label, value }) => <div key={key} aria-label={`${label}: ${formatHours(value)} ч`} className="flex items-center justify-between border-b border-blue-100/70 pb-2 text-xs last:border-0 last:pb-0"><span className="text-blue-900/60">{label}</span><strong className="text-blue-950"><SlotText text={formatHours(selectedRow.breakdown[key as keyof WorkloadBreakdown])} /> ч</strong></div>)}</div></> : <p className="text-sm text-blue-900/60">Добавьте продукты в справочнике, чтобы увидеть детализацию.</p>}</div>
      </div>
      {!readOnly && <section className="mt-3 rounded-2xl border border-blue-100 bg-white/80 p-3 lg:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-900/55">Настройка нагрузки</p><h3 className="mt-1 text-base font-bold text-blue-950">Критерии и время на один выход</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-blue-900/65">Значения используются для расчёта по текущему «Контент-плану». Укажите часы на производство одного материала и общий фонд рабочего времени за месяц.</p></div>
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-2.5 py-2"><span className="text-[11px] font-semibold text-blue-900/70">Фонд, ч</span><NumberField value={workloadSettings.capacityHours} min={1} max={744} onValueChange={updateWorkloadCapacity} className="w-[116px]"><NumberFieldGroup className="h-8"><NumberFieldInput aria-label="Фонд рабочих часов" className="!min-w-[3.75rem] text-right" /><NumberFieldDecrement /><NumberFieldIncrement /></NumberFieldGroup></NumberField></div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-blue-100"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="border-b border-blue-100 bg-blue-50/55"><th className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-900/65">Формат</th>{workloadKeys.map((key) => <th key={key} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-900/65">{workloadLabels[key]}, ч</th>)}<th className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-900/65">Итого</th></tr></thead><tbody>{(Object.keys(workloadSettings.rates) as ContentType[]).map((type) => { const rate = workloadSettings.rates[type]; return <tr key={type} className="border-b border-blue-50 last:border-0"><td className="px-2.5 py-2 text-xs font-bold text-blue-950">{type}</td>{workloadKeys.map((key) => <td key={key} className="px-2.5 py-2"><NumberField value={rate[key]} min={0} max={100} step={0.25} onValueChange={(value) => updateWorkloadRate(type, key, value)} className="w-[116px]"><NumberFieldGroup className="h-8"><NumberFieldInput aria-label={`${type}: ${workloadLabels[key]}`} className="!min-w-[3.75rem] px-2 text-right" /><NumberFieldDecrement /><NumberFieldIncrement /></NumberFieldGroup></NumberField></td>)}<td className="px-2.5 py-2 text-xs font-bold text-blue-700">{formatHours(workloadTotal(rate))} ч</td></tr>; })}</tbody></table></div>
        <p className="mt-2 text-[11px] text-blue-900/55">Порядок критериев: организация, съёмка, монтаж, дизайн, выкладка. Изменения сохраняются автоматически.</p>
      </section>}
      <WorkloadRadarCharts processData={processRadarData} productData={productRadarData} totalHours={summary.hours} />
    </FeatureBento>
    <MouseFollowingEyes />
  </div>;
}

function CompletionRing({ value, color, compact = false }: { value: number; color: string; compact?: boolean }) { const safeValue = Math.min(Math.max(value, 0), 100); return <div role="img" aria-label={`Выполнение: ${value}%`} className={`flex shrink-0 items-center justify-center rounded-full ${compact ? "h-14 w-14" : "h-16 w-16"}`} style={{ background: `conic-gradient(${color} ${safeValue}%, #edf0f5 0)` }}><div className={`flex items-center justify-center rounded-full bg-white font-bold text-gray-900 ${compact ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"}`}><NumberTicker value={value} />%</div></div>; }
function ProductReportCard({ product, planned, fact, completion, index, platformStats, onOpen }: { product: Product; planned: number; fact: number; completion: number; index: number; platformStats: Array<{ platform: Platform; planned: number; fact: number }>; onOpen: () => void }) {
  const color = productAccent(product, index);
  const visiblePlatformStats = platformStats.filter(({ planned: platformPlan, fact: platformFact }) => platformPlan > 0 || platformFact > 0);
  const remaining = Math.max(planned - fact, 0);
  const updateSpotlight = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", String(event.clientX - rect.left) + "px");
    event.currentTarget.style.setProperty("--spotlight-y", String(event.clientY - rect.top) + "px");
  };
  return <article data-tour="product-card" role="button" tabIndex={0} aria-label={"Открыть подробности продукта " + product.name} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} onPointerMove={updateSpotlight} style={{ "--spotlight-color": withAlpha(color, 0.14) } as CSSProperties} className="product-report-card group relative isolate min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-950/[.02] transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400/40">
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-1 opacity-90" style={{ background: "linear-gradient(90deg, " + color + ", transparent)" }} />
    <div className="relative z-[1]">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-gray-400">Продукт</p><h3 className="mt-0.5 line-clamp-2 text-base font-bold leading-tight tracking-tight text-gray-900 sm:text-lg"><Highlighter action="highlight" color={withAlpha(color, 0.25)} strokeWidth={1.25} animationDuration={760} iterations={2} isView>{product.name}</Highlighter></h3></div><span data-tour="completion-ring" className="shrink-0"><CompletionRing value={completion} color={color} compact /></span></div>
      <div data-tour="product-socials" className="mt-2.5 flex min-h-6 flex-wrap gap-1.5" aria-label="Площадки продукта">
        {visiblePlatformStats.length === 0 ? <span className="text-[10px] text-gray-400">Нет плана по площадкам</span> : visiblePlatformStats.map(({ platform, planned: platformPlan, fact: platformFact }) => <span key={platform.id} title={platform.name + ": " + platformFact + " опубликовано из " + platformPlan + " по плану"} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-1.5 py-1 text-[10px] font-semibold text-gray-600"><SocialPlatformIcon name={platform.name} size={13} /><span className="max-w-[5.5rem] truncate">{platform.name}</span><span className="text-gray-400">{platformFact}/{platformPlan}</span></span>)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2"><span className="text-[10px] font-semibold text-gray-400">{remaining > 0 ? String(remaining) + " осталось" : planned > 0 ? "План закрыт" : "Добавьте план"}</span><span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-blue-700">Подробнее <ChevronRight size={13} /></span></div>
    </div>
  </article>;
}

function ProductDetailsDialog({ state, month, product, planned, fact, completion, platforms, plan, actual, onClose }: { state: AppState; month: Date; product: Product; planned: number; fact: number; completion: number; platforms: Platform[]; plan: MonthPlan; actual: (productId: string, platformId: string) => number; onClose: () => void }) {
  const key = monthKey(month);
  const color = productAccent(product);
  const channels = platforms.flatMap(bulkChannelsForPlatform);
  const platformRows = platforms.map((platform) => {
    const formatRows = channels.filter((channel) => channel.platformId === platform.id).map((channel) => {
      const channelPublications = state.publications.filter((publication) => publication.date.startsWith(key) && publication.platformId === platform.id && state.content.find((item) => item.id === publication.contentId)?.productId === product.id && state.content.find((item) => item.id === publication.contentId)?.type === channel.type).sort((a, b) => b.date.localeCompare(a.date));
      return { channel, planned: channelPlanValue(plan, product.id, channel, platforms), fact: channelPublications.length, publications: channelPublications };
    });
    const publications = state.publications.filter((publication) => publication.date.startsWith(key) && publication.platformId === platform.id && state.content.find((item) => item.id === publication.contentId)?.productId === product.id).sort((a, b) => b.date.localeCompare(a.date));
    return { platform, target: formatRows.reduce((sum, row) => sum + row.planned, 0), fact: actual(product.id, platform.id), publications, formatRows };
  });
  return <Modal title={"Подробности · " + product.name} onClose={onClose} wide>
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4" style={{ backgroundColor: withAlpha(color, 0.08) }}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color }}>Продукт</p><h3 className="mt-1 text-xl font-bold tracking-tight text-gray-900">{product.name}</h3><p className="mt-1 text-sm text-gray-500">{product.company?.trim() || "Компания не указана"}</p></div><CompletionRing value={completion} color={color} /></div><div className="mt-4 flex flex-wrap gap-4 text-sm"><span><b className="text-gray-900">{planned}</b> план</span><span><b className="text-gray-900">{fact}</b> факт</span><span><b style={{ color }}>{Math.max(planned - fact, 0)}</b> осталось</span></div></div>
      <div><SectionTitle title="По соцсетям" /><p className="mt-1 text-xs text-gray-500">План, факт и все форматы публикаций за {monthLabel(month).toLowerCase()}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{platformRows.map(({ platform, target, fact: platformFact, publications, formatRows }) => <article key={platform.id} className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><SocialPlatformIcon name={platform.name} size={17} /><h4 className="truncate text-sm font-bold text-gray-900">{platform.name}</h4></div><Badge tone={platformFact >= target && target > 0 ? "success" : "neutral"}>{platformFact >= target && target > 0 ? "Выполнено" : percent(platformFact, target) + "%"}</Badge></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-gray-50 px-2 py-2"><span className="block text-[10px] uppercase tracking-wide text-gray-400">План</span><strong className="mt-0.5 block text-base text-gray-900">{target}</strong></div><div className="rounded-xl bg-emerald-50 px-2 py-2"><span className="block text-[10px] uppercase tracking-wide text-emerald-600">Факт</span><strong className="mt-0.5 block text-base text-gray-900">{platformFact}</strong></div><div className="rounded-xl bg-blue-50 px-2 py-2"><span className="block text-[10px] uppercase tracking-wide text-blue-600">Осталось</span><strong className="mt-0.5 block text-base text-gray-900">{Math.max(target - platformFact, 0)}</strong></div></div><Progress value={percent(platformFact, target)} tone="success" /><div className="mt-3 flex flex-wrap gap-1.5">{formatRows.map(({ channel, planned: channelPlan, fact: channelFact }) => <span key={channel.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-600"><SocialPlatformIcon name={channel.platformName} size={12} /><span>{channel.type}</span><span className="text-gray-400">{channelFact}/{channelPlan}</span></span>)}</div><div className="mt-3 grid gap-1.5">{publications.length === 0 ? <p className="rounded-xl bg-gray-50/70 px-2.5 py-2 text-xs text-gray-400">Публикаций за месяц нет</p> : publications.map((publication) => { const content = state.content.find((item) => item.id === publication.contentId); const channel = formatRows.find((row) => row.channel.type === content?.type); return <div key={publication.id} className="flex items-start gap-2 rounded-xl bg-gray-50/70 px-2.5 py-2"><span className="mt-0.5 shrink-0"><SocialPlatformIcon name={platform.name} size={13} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-gray-700">{content?.title ?? "Без темы"}</p><p className="mt-0.5 truncate text-[11px] text-gray-400">{channel?.channel.type ?? content?.type ?? "Публикация"} · {platform.name}</p></div><span className="shrink-0 text-[11px] text-gray-400">{format(new Date(publication.date + "T12:00:00"), "d MMM", { locale: ru })}</span></div>; })}</div></article>)}</div></div>
    </div>
  </Modal>;
}
function WorkReport({ state, month, setMonth, products, platforms, plan, readOnly = false, actual, onExport, syncState = "local" }: { state: AppState; month: Date; setMonth: (month: Date) => void; products: Product[]; platforms: Platform[]; plan: MonthPlan; readOnly?: boolean; actual: (productId: string, platformId: string) => number; onExport: () => void; syncState?: SyncState }) {
  const visualLayout = useVisualLayout();
  const [actionProductFilter, setActionProductFilter] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [publicationSearch, setPublicationSearch] = useState("");
  const [publicationProductFilter, setPublicationProductFilter] = useState("all");
  const [publicationPlatformFilter, setPublicationPlatformFilter] = useState("all");
  const [publicationSort, setPublicationSort] = useState<"date-desc" | "date-asc">("date-desc");
  const [publicationPage, setPublicationPage] = useState(1);
  const key = monthKey(month);
  const channels = platforms.flatMap(bulkChannelsForPlatform);
  const channelFact = (productId: string, channel: BulkChannel) => state.publications.filter((publication) => publication.date.startsWith(key) && publication.platformId === channel.platformId && state.content.find((item) => item.id === publication.contentId)?.productId === productId && state.content.find((item) => item.id === publication.contentId)?.type === channel.type).length;
  const countedPublication = (publication: AppState["publications"][number]) => { const content = state.content.find((item) => item.id === publication.contentId); return Boolean(content && products.some((product) => product.id === content.productId) && channels.some((channel) => channel.platformId === publication.platformId && channel.type === content.type)); };
  const productRows = products.map((product) => {
    const planned = channels.reduce((sum, channel) => sum + channelPlanValue(plan, product.id, channel, platforms), 0);
    const fact = channels.reduce((sum, channel) => sum + channelFact(product.id, channel), 0);
    const platformStats = platforms.map((platform) => { const platformChannels = channels.filter((channel) => channel.platformId === platform.id); return { platform, planned: platformChannels.reduce((sum, channel) => sum + channelPlanValue(plan, product.id, channel, platforms), 0), fact: platformChannels.reduce((sum, channel) => sum + channelFact(product.id, channel), 0) }; });
    return { product, planned, fact, completion: percent(fact, planned), platformStats };
  });
  const platformRows = platforms.map((platform) => {
    const platformChannels = channels.filter((channel) => channel.platformId === platform.id);
    const planned = products.reduce((sum, product) => sum + platformChannels.reduce((inner, channel) => inner + channelPlanValue(plan, product.id, channel, platforms), 0), 0);
    const fact = products.reduce((sum, product) => sum + platformChannels.reduce((inner, channel) => inner + channelFact(product.id, channel), 0), 0);
    return { platform, planned, fact, completion: percent(fact, planned) };
  });
  const plannedByDay = new Map<string, number>();
  const factByDay = new Map<string, number>();
  state.content.forEach((item) => {
    if (item.plannedPublishDate?.startsWith(key)) plannedByDay.set(item.plannedPublishDate, (plannedByDay.get(item.plannedPublishDate) ?? 0) + 1);
  });
  state.publications.forEach((publication) => {
    if (publication.date.startsWith(key)) factByDay.set(publication.date, (factByDay.get(publication.date) ?? 0) + 1);
  });
  const dailyData = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).map((day) => {
    const date = dateInput(day);
    return { day: format(day, "d"), plan: plannedByDay.get(date) ?? 0, fact: factByDay.get(date) ?? 0 };
  });
  const publicationRows = state.publications.filter((publication) => publication.date.startsWith(key)).map((publication) => {
    const content = state.content.find((item) => item.id === publication.contentId);
    return {
      publication,
      content,
      product: products.find((product) => product.id === content?.productId),
      platform: platforms.find((platform) => platform.id === publication.platformId),
    };
  }).sort((a, b) => b.publication.date.localeCompare(a.publication.date));
  const actionRows = publicationRows.flatMap(({ publication, content, product, platform }) => product ? [{ publication, content, product, platform }] : []);
  const actionProductRows = products.map((product) => ({ product, rows: actionRows.filter((row) => row.product.id === product.id) })).filter((row) => row.rows.length > 0);
  const visibleActionProductRows = actionProductFilter === "all" ? actionProductRows : actionProductRows.filter((row) => row.product.id === actionProductFilter);
  const visibleActionRows = visibleActionProductRows.flatMap((row) => row.rows);
  const countedPublications = state.publications.filter((publication) => publication.date.startsWith(key) && countedPublication(publication));
  const totalPlan = productRows.reduce((sum, row) => sum + row.planned, 0);
  const totalFact = productRows.reduce((sum, row) => sum + row.fact, 0);
  const activeDays = new Set(countedPublications.map((publication) => publication.date)).size;
  const activeProductCount = productRows.filter((row) => row.planned > 0 || row.fact > 0).length;
  const productChartData = productRows.map((row) => ({ name: row.product.name, plan: row.planned, fact: row.fact }));
  const platformChartData = platformRows.filter((row) => row.fact > 0).map((row) => ({ name: row.platform.name, value: row.fact }));
  const reportDate = (value: string) => { const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.getTime()) ? value : format(parsed, "d MMM", { locale: ru }); };
  const selectedProductRow = productRows.find((row) => row.product.id === selectedProductId);
  const normalizedPublicationSearch = publicationSearch.trim().toLowerCase();
  const filteredPublicationRows = [...publicationRows].filter(({ publication, content, product, platform }) => {
    const haystack = `${publication.date} ${content?.title ?? ""} ${content?.type ?? ""} ${product?.name ?? ""} ${platform?.name ?? ""}`.toLowerCase();
    return (!normalizedPublicationSearch || haystack.includes(normalizedPublicationSearch))
      && (publicationProductFilter === "all" || product?.id === publicationProductFilter)
      && (publicationPlatformFilter === "all" || platform?.id === publicationPlatformFilter);
  }).sort((a, b) => publicationSort === "date-desc" ? b.publication.date.localeCompare(a.publication.date) : a.publication.date.localeCompare(b.publication.date));
  const publicationPageSize = 8;
  const publicationPageCount = Math.max(1, Math.ceil(filteredPublicationRows.length / publicationPageSize));
  const safePublicationPage = Math.min(publicationPage, publicationPageCount);
  const visiblePublicationRows = filteredPublicationRows.slice((safePublicationPage - 1) * publicationPageSize, safePublicationPage * publicationPageSize);
  const syncLabel = syncState === "synced" ? "Синхронизировано" : syncState === "syncing" ? "Сохраняем" : syncState === "loading" ? "Загрузка" : syncState === "error" ? "Нет синхронизации" : "Локальный режим";
  const syncTone = syncState === "synced" ? "success" : syncState === "error" ? "neutral" : "accent";
  const metricSettings = visualLayout.metricCards;
  const hasVisibleMetric = metricSettings.showPlan || metricSettings.showFact || metricSettings.showCompletion || metricSettings.showActiveDays;
  const showPlanMetric = hasVisibleMetric ? metricSettings.showPlan : true;
  const showFactMetric = hasVisibleMetric ? metricSettings.showFact : false;
  const showCompletionMetric = hasVisibleMetric ? metricSettings.showCompletion : false;
  const showActiveDaysMetric = hasVisibleMetric ? metricSettings.showActiveDays : false;
  const metricMobileColumns = metricSettings.columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2";
  const metricDesktopColumns = metricSettings.columnsDesktop === 2 ? "xl:grid-cols-2" : metricSettings.columnsDesktop === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4";
  const gridMobileColumns = visualLayout.productGrid.columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2";
  const gridDesktopColumns = visualLayout.productGrid.columnsDesktop === 2 ? "xl:grid-cols-2" : visualLayout.productGrid.columnsDesktop === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";
  const displayProductRows = [...productRows].sort((left, right) => visualLayout.productGrid.sort === "name" ? left.product.name.localeCompare(right.product.name, "ru") : visualLayout.productGrid.sort === "completion" ? right.completion - left.completion : left.product.order - right.product.order);

  return <div className="report-page">
    <section data-tour="home-summary" className="work-activity-panel relative mt-4 overflow-hidden rounded-2xl border border-blue-100/80 bg-blue-50 shadow-sm">
      <AnimatedGradient colors={["#bfdbfe", "#93c5fd", "#c4b5fd", "#a7f3d0"]} speed={0.035} blur="medium" />
      <div className="relative z-10 p-4 sm:p-5">
       <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
         <div>
           <p className="text-[11px] font-bold uppercase tracking-[.14em] text-blue-800/75">Работа ведется</p>
           <h3 className="mt-1 text-xl font-bold tracking-tight text-blue-950">Контент выходит регулярно</h3>
           <p className="mt-1 max-w-2xl text-sm text-blue-950/70">Общие показатели, план и факт за {monthLabel(month).toLowerCase()} по всем продуктам.</p>
         </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Badge tone={syncTone}>{syncLabel}</Badge>
            <MonthSwitcher month={month} setMonth={setMonth} />
            <IconButton label="Скачать PDF" onClick={onExport}><Download size={17} /></IconButton>
            <Badge tone="success">{percent(totalFact, totalPlan)}% плана выполнено</Badge>
          </div>
       </div>
        <div className={`mt-4 grid ${metricMobileColumns} ${metricDesktopColumns}`} style={{ gap: `${Math.min(32, Math.max(4, metricSettings.gapPx ?? 8))}px` }}>
          {showPlanMetric && <div className="rounded-xl border border-white/70 bg-white/65 p-3 backdrop-blur-sm">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-900/55">План</span>
            <strong className="mt-1 block text-2xl font-bold text-blue-950"><NumberTicker value={totalPlan} /></strong>
            <span className="text-xs text-blue-900/60">публикаций на {monthLabel(month).toLowerCase()}</span>
          </div>}
          {showFactMetric && <div className="rounded-xl border border-white/70 bg-white/65 p-3 backdrop-blur-sm">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-900/55">Факт</span>
            <strong className="mt-1 block text-2xl font-bold text-blue-950"><NumberTicker value={totalFact} /></strong>
            <span className="text-xs text-blue-900/60">все отмеченные площадки</span>
          </div>}
          {showCompletionMetric && <div className="rounded-xl border border-white/70 bg-white/65 p-3 backdrop-blur-sm">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-900/55">Выполнение</span>
            <strong className="mt-1 block text-2xl font-bold text-blue-950"><NumberTicker value={percent(totalFact, totalPlan)} /><span className="ml-1 text-base font-semibold">%</span></strong>
            <span className="text-xs text-blue-900/60">{totalFact} из {totalPlan} публикаций</span>
          </div>}
          {showActiveDaysMetric && <div className="rounded-xl border border-white/70 bg-white/65 p-3 backdrop-blur-sm">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-900/55">Активные дни</span>
            <strong className="mt-1 block text-2xl font-bold text-blue-950"><NumberTicker value={activeDays} /></strong>
            <span className="text-xs text-blue-900/60">с отмеченными публикациями</span>
          </div>}
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-blue-950/70">
            <span>Прогресс месяца</span>
            <span>{activeProductCount} продуктов в работе</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: percent(totalFact, totalPlan) + "%" }} />
          </div>
        </div>
      </div>
    </section>
    <section className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 sm:p-5">
      <div className={`grid ${gridMobileColumns} ${gridDesktopColumns}`} style={{ gap: `${Math.min(32, Math.max(4, visualLayout.productGrid.gapPx ?? 12))}px` }}>{displayProductRows.map((row, index) => <ProductReportCard key={row.product.id} {...row} index={index} onOpen={() => setSelectedProductId(row.product.id)} />)}</div>
    </section>
    {selectedProductRow && <ProductDetailsDialog state={state} month={month} product={selectedProductRow.product} planned={selectedProductRow.planned} fact={selectedProductRow.fact} completion={selectedProductRow.completion} platforms={platforms} plan={plan} actual={actual} onClose={() => setSelectedProductId(null)} />}

    <ReportCharts
      dailyData={dailyData}
      platformChartData={platformChartData}
      productChartData={productChartData}
      monthLabel={monthLabel(month)}
      readOnly={readOnly}
    />
    <section className="report-card mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><SectionTitle title="Сводка по продуктам" /><p className="mt-1 text-xs text-gray-500">Показатели, которые удобно использовать в отчёте</p></div><Badge>{productRows.length} продуктов</Badge></div>
      <div className="mt-4 hidden overflow-x-auto sm:block"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400"><th className="px-3 py-2 font-semibold">Продукт</th><th className="px-3 py-2 text-right font-semibold">План</th><th className="px-3 py-2 text-right font-semibold">Факт</th><th className="px-3 py-2 text-right font-semibold">Выполнение</th></tr></thead><tbody>{productRows.map((row) => <tr key={row.product.id} className="border-b border-gray-50 last:border-0"><td className="px-3 py-3 font-semibold text-gray-900">{row.product.name}</td><td className="px-3 py-3 text-right text-gray-500">{row.planned}</td><td className="px-3 py-3 text-right font-semibold text-gray-900">{row.fact}</td><td className="px-3 py-3 text-right"><span className={row.completion >= 100 ? "font-bold text-emerald-600" : "font-bold text-blue-700"}>{row.completion}%</span></td></tr>)}</tbody></table></div>
      <div className="mt-4 grid gap-2 sm:hidden">{productRows.map((row) => <div key={row.product.id} className="rounded-xl border border-gray-100 p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-gray-900">{row.product.name}</span><span className={row.completion >= 100 ? "text-sm font-bold text-emerald-600" : "text-sm font-bold text-blue-700"}>{row.completion}%</span></div><div className="mt-2 flex gap-4 text-xs text-gray-500"><span>План: <b className="text-gray-900">{row.planned}</b></span><span>Факт: <b className="text-gray-900">{row.fact}</b></span></div><div className="mt-2"><Progress value={row.completion} tone={row.completion >= 100 ? "success" : "accent"} /></div></div>)}</div>
    </section>

    <section className="report-card mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><SectionTitle title="Что сделано по продуктам" /><p className="mt-1 text-xs text-gray-500">Опубликованный контент за выбранный месяц</p></div><div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><label className="flex items-center gap-2 text-xs font-semibold text-gray-500"><span>Продукт</span><AppSelect value={actionProductFilter} onChange={setActionProductFilter} options={[{ id: "all", label: "Все продукты" }, ...products.map((product) => ({ id: product.id, label: product.name }))]} ariaLabel="Фильтр публикаций по продукту" className="w-[12rem]" /></label><Badge tone="accent">{visibleActionRows.length} публикаций</Badge></div></div>
      {visibleActionRows.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">{actionRows.length === 0 ? "За этот месяц публикаций еще нет" : "Для выбранного продукта публикаций за этот месяц нет"}</div> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleActionProductRows.map(({ product, rows }) => <article key={product.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate text-sm font-bold text-gray-900">{product.name}</h4><p className="mt-0.5 text-xs text-gray-400">{rows.length} {rows.length === 1 ? "публикация" : "публикаций"}</p></div><Package size={17} className="shrink-0 text-blue-600" /></div><div className="mt-3 divide-y divide-gray-200/70">{rows.map(({ publication, content, platform }) => <div key={publication.id} className="py-2.5 first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-emerald-700">Опубликовано · {platform?.name ?? "Архив"}</span><span className="shrink-0 text-[11px] text-gray-400">{reportDate(publication.date)}</span></div><div className="mt-1 flex items-start justify-between gap-2"><span className="min-w-0 text-xs leading-5 text-gray-600">{content?.title ?? "Без названия"}</span><Badge>{content?.type ?? "Контент"}</Badge></div></div>)}</div></article>)}</div>}
    </section>

    <section className="report-card mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><SectionTitle title="Публикации за месяц" action={<SlidersHorizontal size={14} className="text-gray-400" />} /><p className="mt-1 text-xs text-gray-500">Детализация факта по датам, продуктам и соцсетям</p></div><Badge tone="accent">{publicationRows.length} записей</Badge></div>
      <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_170px_150px]">
        <label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input aria-label="Поиск по публикациям" value={publicationSearch} onChange={(event) => { setPublicationSearch(event.target.value); setPublicationPage(1); }} className={`${inputClass} w-full pl-9`} placeholder="Поиск: тема, продукт, соцсеть" /></label>
        <AppSelect value={publicationProductFilter} onChange={(value) => { setPublicationProductFilter(value); setPublicationPage(1); }} options={[{ id: "all", label: "Все продукты" }, ...products.map((product) => ({ id: product.id, label: product.name }))]} ariaLabel="Фильтр публикаций по продукту" />
        <AppSelect value={publicationPlatformFilter} onChange={(value) => { setPublicationPlatformFilter(value); setPublicationPage(1); }} options={[{ id: "all", label: "Все соцсети" }, ...platforms.map((platform) => ({ id: platform.id, label: platform.name }))]} ariaLabel="Фильтр публикаций по соцсети" />
        <AppSelect value={publicationSort} onChange={(value) => { setPublicationSort(value as "date-desc" | "date-asc"); setPublicationPage(1); }} options={[{ id: "date-desc", label: "Сначала новые" }, { id: "date-asc", label: "Сначала старые" }]} ariaLabel="Сортировка публикаций" />
      </div>
      {publicationRows.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">В этом месяце пока нет отмеченных публикаций</div> : filteredPublicationRows.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">По выбранным фильтрам публикаций нет</div> : <>
        <div className="mt-4 hidden overflow-x-auto sm:block"><table className="min-w-[680px] w-full text-left text-sm"><thead><tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400"><th className="px-3 py-2 font-semibold">Дата</th><th className="px-3 py-2 font-semibold">Продукт</th><th className="px-3 py-2 font-semibold">Соцсеть</th><th className="px-3 py-2 font-semibold">Тип</th><th className="px-3 py-2 font-semibold">Соавтор</th></tr></thead><tbody>{visiblePublicationRows.map((row) => <tr key={row.publication.id} className="border-b border-gray-50 last:border-0"><td className="whitespace-nowrap px-3 py-3 text-gray-500">{reportDate(row.publication.date)}</td><td className="px-3 py-3 font-semibold text-gray-900">{row.product?.name ?? "Без продукта"}</td><td className="px-3 py-3 text-gray-600">{row.platform?.name ?? "Архивная площадка"}</td><td className="px-3 py-3"><Badge>{row.content?.type ?? "Контент"}</Badge></td><td className="px-3 py-3 text-gray-500">{row.content?.coauthors?.length ? row.content.coauthors.join(", ") : "—"}</td></tr>)}</tbody></table></div>
        <div className="mt-4 grid gap-2 sm:hidden">{visiblePublicationRows.map((row) => <div key={row.publication.id} className="rounded-xl border border-gray-100 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-gray-500">{reportDate(row.publication.date)}</span><Badge>{row.content?.type ?? "Контент"}</Badge></div><div className="mt-2 text-sm font-semibold text-gray-900">{row.product?.name ?? "Без продукта"}</div><div className="mt-1 text-xs text-gray-500">{row.platform?.name ?? "Архивная площадка"}{row.content?.coauthors?.length ? ` · Соавтор: ${row.content.coauthors.join(", ")}` : ""}</div></div>)}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500"><span>{filteredPublicationRows.length} записей · страница {safePublicationPage} из {publicationPageCount}</span><div className="flex items-center gap-1"><button type="button" aria-label="Предыдущая страница" disabled={safePublicationPage <= 1} onClick={() => setPublicationPage((page) => Math.max(1, page - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} /></button><button type="button" aria-label="Следующая страница" disabled={safePublicationPage >= publicationPageCount} onClick={() => setPublicationPage((page) => Math.min(publicationPageCount, page + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
      </>}
    </section>

    <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-900"><ClipboardList size={15} className="mt-0.5 shrink-0 text-blue-600" /><p><b>Как читать отчёт:</b> план — цели из раздела «Контент-план», факт — отмеченные публикации. На графике динамики плановые материалы показаны по датам календаря, а факт считается по каждой опубликованной площадке.</p></div>
  </div>;
}

function defaultQuickPresets(channels: BulkChannel[]): QuickPreset[] {
  const byPlatforms = (names: string[]) => channels.filter((channel) => names.includes(channel.platformName.trim().toLowerCase())).map((channel) => channel.id);
  return [{ id: "all-threads-linkedin", label: "Все продукты · Threads + LinkedIn", channelIds: byPlatforms(["threads", "linkedin"]) }, { id: "all-instagram", label: "Все продукты · Instagram", channelIds: byPlatforms(["instagram"]) }];
}

function Today({ state, products, platforms, onSubmit, onDirectory, onNotify, onMarkPlanned, onMarkPlannedRange, onClearPlanned, onClearPlannedRange, onRemoveFact, publicationHistory, onUndoPublication }: { state: AppState; products: Product[]; platforms: Platform[]; onSubmit: (data: BulkPublicationInput) => void; onDirectory: () => void; onNotify: (message: string) => void; onMarkPlanned: (date: string, onlyContentIds?: string[]) => void; onMarkPlannedRange: (startDate: string, endDate: string, platformIds: string[]) => void; onClearPlanned: (date: string) => void; onClearPlannedRange: (startDate: string, endDate: string, platformIds: string[]) => void; onRemoveFact: (publicationId: string) => void; publicationHistory: PublicationHistoryEntry[]; onUndoPublication: (entryId: string) => void }) {
  const channels = useMemo(() => platforms.flatMap(bulkChannelsForPlatform), [platforms]);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => products[0] ? [products[0].id] : []);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(() => channels[0] ? [channels[0].id] : []);
  const [rangeStartDate, setRangeStartDate] = useState(TODAY);
  const [rangeEndDate, setRangeEndDate] = useState(TODAY);
  const [rangePlatformIds, setRangePlatformIds] = useState<string[]>(() => platforms.map((platform) => platform.id));
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [quickPresets, setQuickPresets] = useState<QuickPreset[]>(() => {
    const fallback = defaultQuickPresets(channels);
    if (typeof window === "undefined") return fallback;
    try {
      const stored = JSON.parse(window.localStorage.getItem("content-plan-fact-quick-presets-v1") ?? "null") as QuickPreset[] | null;
      return stored?.length ? stored : fallback;
    } catch {
      return fallback;
    }
  });
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetLabel, setEditingPresetLabel] = useState("");
  const [editingPresetChannels, setEditingPresetChannels] = useState<string[]>([]);
  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));
  const selectedChannels = channels.filter((channel) => selectedChannelIds.includes(channel.id));
  const titleChannels = selectedChannels.filter((channel) => bulkChannelNeedsTitle(channel.type));
  const todayPubs = state.publications.filter((publication) => publication.date === selectedDate);
  const grouped = products.map((product) => ({ product, pubs: todayPubs.filter((publication) => state.content.find((item) => item.id === publication.contentId)?.productId === product.id) })).filter((item) => item.pubs.length);
  const dateTitle = selectedDate === TODAY ? "Уже отмечено сегодня" : `Уже отмечено ${readableDate(selectedDate)}`;
  const yesterdayDate = dateInput(subDays(new Date(`${selectedDate}T12:00:00`), 1));
  const plannedRows = state.content.filter((item) => item.plannedPublishDate === selectedDate).map((content) => { const platformId = content.plannedPlatformId ?? platformIdForContentType(content.type, platforms); const publication = platformId ? state.publications.find((item) => item.contentId === content.id && item.platformId === platformId && item.date === selectedDate) : undefined; return { content, platform: platforms.find((item) => item.id === platformId), publication }; }).filter((row): row is { content: ContentItem; platform: Platform; publication: AppState["publications"][number] | undefined } => Boolean(row.platform));
  const plannedFactCount = plannedRows.filter((row) => row.publication).length;
  const allPlannedChecked = plannedRows.length > 0 && plannedFactCount === plannedRows.length;
  const rangeStart = rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate;
  const rangeEnd = rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate;
  const rangePlannedRows = state.content.filter((item) => { const date = item.plannedPublishDate; if (!date || date < rangeStart || date > rangeEnd || !rangePlatformIds.length) return false; const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms); return platformId ? rangePlatformIds.includes(platformId) : false; }).map((content) => { const platformId = content.plannedPlatformId ?? platformIdForContentType(content.type, platforms); const plannedDate = content.plannedPublishDate!; const publication = platformId ? state.publications.find((item) => item.contentId === content.id && item.platformId === platformId && item.date === plannedDate) : undefined; return { content, platform: platforms.find((item) => item.id === platformId), publication, plannedDate }; }).filter((row): row is { content: ContentItem; platform: Platform; publication: AppState["publications"][number] | undefined; plannedDate: string } => Boolean(row.platform));
  const rangePlannedFactCount = rangePlannedRows.filter((row) => row.publication).length;
  const allRangePlannedChecked = rangePlannedRows.length > 0 && rangePlannedFactCount === rangePlannedRows.length;

  useEffect(() => { window.localStorage.setItem("content-plan-fact-quick-presets-v1", JSON.stringify(quickPresets)); }, [quickPresets]);
  function applyPreset(preset: QuickPreset) { const nextChannels = preset.channelIds.filter((id) => channels.some((channel) => channel.id === id)); setSelectedProductIds(products.map((product) => product.id)); setSelectedChannelIds(nextChannels); onNotify(nextChannels.length ? `Набор «${preset.label}» выбран` : "В этом наборе нет активных соцсетей"); }
  function startPresetEdit(preset: QuickPreset) { setEditingPresetId(preset.id); setEditingPresetLabel(preset.label); setEditingPresetChannels(preset.channelIds.filter((id) => channels.some((channel) => channel.id === id))); }
  function savePresetEdit() { if (!editingPresetId) return; const label = editingPresetLabel.trim() || "Новый набор"; setQuickPresets((current) => current.map((preset) => preset.id === editingPresetId ? { ...preset, label, channelIds: editingPresetChannels } : preset)); setEditingPresetId(null); onNotify("Быстрый набор сохранён"); }
  function addQuickPreset() { const id = makeId("preset"); const preset = { id, label: "Новый набор", channelIds: [] }; setQuickPresets((current) => [...current, preset]); startPresetEdit(preset); }
  function removeQuickPreset(id: string) { setQuickPresets((current) => current.filter((preset) => preset.id !== id)); if (editingPresetId === id) setEditingPresetId(null); }

  function repeatYesterday() { const yesterdayPubs = state.publications.filter((publication) => publication.date === yesterdayDate); const rows = yesterdayPubs.map((publication) => { const content = state.content.find((item) => item.id === publication.contentId); const channel = content ? channels.find((item) => item.platformId === publication.platformId && item.type === content.type) : undefined; return { content, channel }; }).filter((row): row is { content: ContentItem; channel: BulkChannel } => Boolean(row.content && row.channel)); if (!rows.length) { onNotify(`За ${readableDate(yesterdayDate)} публикаций нет`); return; } setSelectedDate(TODAY); setSelectedProductIds([...new Set(rows.map((row) => row.content.productId))]); setSelectedChannelIds([...new Set(rows.map((row) => row.channel.id))]); setTitles((previous) => rows.reduce((next, row) => bulkChannelNeedsTitle(row.content.type) ? { ...next, [row.channel.id]: row.content.title } : next, previous)); onNotify(`Выбор за ${readableDate(yesterdayDate)} загружен`); }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ date: selectedDate, productIds: selectedProductIds, channels: selectedChannels.map(({ id, platformId, type }) => ({ id, platformId, type })), titles });
  }

  return <div>
    <PageHeader eyebrow="Быстрая отметка" title="Сегодня" description="Выберите дату, продукты и площадки — все публикации создадутся одной отметкой" actions={<>{plannedRows.length > 0 && <Button variant="secondary" onClick={() => allPlannedChecked ? onClearPlanned(selectedDate) : onMarkPlanned(selectedDate)}><Check size={15} /> {allPlannedChecked ? "Снять всё по плану" : "Все по плану"}</Button>}<Button variant="ghost" onClick={onDirectory}><Package size={15} /> Справочники</Button></>} />
    <section className="rounded-xl border border-[#ece4df] bg-white p-4 sm:p-5">
      <form onSubmit={submit} className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end"><Field label="Дата публикации"><input name="date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value || TODAY)} className={inputClass} /></Field><Button variant="secondary" onClick={repeatYesterday} className="h-10 w-full shrink-0 sm:w-auto"><RotateCcw size={14} /> Повторить вчера</Button></div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-700"><span className="inline-flex items-center gap-2"><Sparkles size={14} className="text-blue-600" /> Быстрые наборы</span><Button variant="ghost" onClick={addQuickPreset} className="h-8 px-2 text-xs"><Plus size={13} /> Новый набор</Button></div><div className="mt-3 flex flex-wrap gap-2">{quickPresets.map((preset) => <div key={preset.id} className="flex min-w-0 items-center gap-1 rounded-xl border border-white bg-white p-1 shadow-sm"><Button variant="ghost" onClick={() => applyPreset(preset)} className="h-8 min-w-0 max-w-full px-2.5 text-left text-xs"><span className="truncate">{preset.label}</span></Button><button type="button" title="Изменить набор" aria-label={`Изменить ${preset.label}`} onClick={() => startPresetEdit(preset)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-700"><Pencil size={13} /></button><button type="button" title="Удалить набор" aria-label={`Удалить ${preset.label}`} onClick={() => removeQuickPreset(preset.id)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button></div>)}<Button variant="ghost" onClick={() => { setSelectedProductIds([]); setSelectedChannelIds([]); }} className="h-9 px-3 text-xs">Очистить</Button></div>{editingPresetId && <div className="mt-3 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><Field label="Название набора"><input value={editingPresetLabel} onChange={(event) => setEditingPresetLabel(event.target.value)} className={inputClass} /></Field><div><p className="mb-1.5 text-xs font-semibold text-gray-500">Соцсети и форматы набора</p><SelectorChips options={channels.map((channel) => channel.id)} selectedValues={editingPresetChannels} onChange={setEditingPresetChannels} ariaLabel="Форматы быстрого набора" className="grid grid-cols-2 gap-2 sm:grid-cols-3" renderOption={(channelId) => { const channel = channels.find((item) => item.id === channelId); return <span className="flex min-w-0 items-center gap-1.5"><SocialPlatformIcon name={channel?.platformName ?? ""} size={13} /><span className="truncate">{channel?.label ?? channelId}</span></span>; }} /></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingPresetId(null)}>Отмена</Button><Button onClick={savePresetEdit}><Check size={14} /> Сохранить набор</Button></div></div>}</div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-2"><SectionTitle title="Продукты" action={<span className="text-[11px] font-semibold text-blue-700">{selectedProducts.length} выбрано</span>} /><div className="flex gap-1"><Button variant="ghost" onClick={() => setSelectedProductIds(products.map((product) => product.id))} className="h-7 px-2 text-[11px]">Все</Button><Button variant="ghost" onClick={() => setSelectedProductIds([])} className="h-7 px-2 text-[11px]">Сбросить</Button></div></div>
             <div className="mt-3"><SelectorChips options={products.map((product) => product.id)} selectedValues={selectedProductIds} onChange={setSelectedProductIds} ariaLabel="Продукты для отметки" className="grid grid-cols-2 gap-2 sm:grid-cols-3" renderOption={(productId) => <span className="flex min-w-0 items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: productAccent(products.find((product) => product.id === productId) ?? { id: productId, name: productId, archived: false, order: 0 }) }} /><span className="truncate">{products.find((product) => product.id === productId)?.name ?? productId}</span></span>} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2"><SectionTitle title="Соцсети и форматы" action={<span className="text-[11px] font-semibold text-blue-700">{selectedChannels.length} выбрано</span>} /><div className="flex gap-1"><Button variant="ghost" onClick={() => setSelectedChannelIds(channels.map((channel) => channel.id))} className="h-7 px-2 text-[11px]">Все</Button><Button variant="ghost" onClick={() => setSelectedChannelIds([])} className="h-7 px-2 text-[11px]">Сбросить</Button></div></div>
             <div className="mt-3"><SelectorChips options={channels.map((channel) => channel.id)} selectedValues={selectedChannelIds} onChange={setSelectedChannelIds} ariaLabel="Соцсети и форматы для отметки" className="grid grid-cols-2 gap-2 sm:grid-cols-3" renderOption={(channelId) => { const channel = channels.find((item) => item.id === channelId); return <span className="flex min-w-0 items-center gap-1.5"><SocialPlatformIcon name={channel?.platformName ?? ""} size={13} /><span className="truncate">{channel?.label ?? channelId}</span>{channel?.label !== channel?.platformName && <span className="shrink-0 text-[10px] font-medium opacity-70">· {channel?.platformName}</span>}</span>; }} /></div>
          </div>
        </div>
        {titleChannels.length > 0 && <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4"><div className="text-sm font-bold text-blue-950">Названия публикаций</div><p className="mt-1 text-xs leading-5 text-blue-800/70">Название применится ко всем выбранным продуктам для соответствующего формата. Для Threads, LinkedIn и других площадок название не требуется.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{titleChannels.map((channel) => <Field key={channel.id} label={`${channel.label} · ${channel.platformName} — необязательно`}><input value={titles[channel.id] ?? ""} onChange={(event) => setTitles((previous) => ({ ...previous, [channel.id]: event.target.value }))} className={inputClass} placeholder={`Например, тема ${channel.label.toLowerCase()}`} /></Field>)}</div></div>}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:p-4"><div><div className="font-bold text-gray-900">Будет добавлено: {selectedProducts.length * selectedChannels.length} публикаций</div><div className="mt-1 text-gray-500">{selectedProducts.length} продукт{selectedProducts.length === 1 ? "" : selectedProducts.length < 5 ? "а" : "ов"} × {selectedChannels.length} площад{selectedChannels.length === 1 ? "ка" : selectedChannels.length < 5 ? "ки" : "ок"}</div></div><Button type="submit" className="w-full sm:w-auto"><Check size={16} /> {selectedDate === TODAY ? "Отметить сегодня" : "Отметить за дату"}</Button></div>
      </form>
    </section>
    <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50/45 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Массовая отметка</p><h3 className="mt-1 text-base font-bold text-blue-950">Период и соцсети</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-blue-900/65">Отметьте все планы в выбранном диапазоне и сетях как опубликованные. Уже отмеченные публикации не дублируются.</p></div><Badge tone={allRangePlannedChecked ? "success" : "accent"}>{rangePlannedFactCount} из {rangePlannedRows.length}</Badge></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[150px_150px_minmax(0,1fr)_auto] lg:items-end"><Field label="С даты"><input type="date" value={rangeStartDate} onChange={(event) => setRangeStartDate(event.target.value || TODAY)} className={inputClass} /></Field><Field label="По дату"><input type="date" value={rangeEndDate} min={rangeStartDate} onChange={(event) => setRangeEndDate(event.target.value || rangeStartDate)} className={inputClass} /></Field><div><span className="text-xs font-semibold text-gray-500">Соцсети</span><div className="mt-1.5 flex flex-wrap gap-1.5">{platforms.map((platform) => { const checked = rangePlatformIds.includes(platform.id); return <button type="button" key={platform.id} onClick={() => setRangePlatformIds((current) => checked ? current.filter((id) => id !== platform.id) : [...current, platform.id])} className={["inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition", checked ? "border-blue-200 bg-white text-blue-700" : "border-gray-200 bg-white/60 text-gray-400"].join(" ")}><SocialPlatformIcon name={platform.name} size={13} />{platform.name}</button>; })}</div></div><Button disabled={!rangePlannedRows.length || !rangePlatformIds.length} onClick={() => allRangePlannedChecked ? onClearPlannedRange(rangeStart, rangeEnd, rangePlatformIds) : onMarkPlannedRange(rangeStart, rangeEnd, rangePlatformIds)} className="h-10 whitespace-nowrap">{allRangePlannedChecked ? <><RotateCcw size={15} /> Снять отметки</> : <><Check size={15} /> Всё опубликовано</>}</Button></div>
      {rangePlannedRows.length > 0 && <p className="mt-3 text-[11px] text-blue-900/60">Найдено планов: {rangePlannedRows.length}. Будут обработаны даты {readableDate(rangeStart)} — {readableDate(rangeEnd)}.</p>}
    </section>
    {plannedRows.length > 0 && <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50/45 p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={allPlannedChecked} onChange={() => allPlannedChecked ? onClearPlanned(selectedDate) : onMarkPlanned(selectedDate)} className="mt-0.5 h-5 w-5 accent-blue-600" /><span><span className="block text-sm font-bold text-blue-950">Всё опубликовано по плану</span><span className="mt-1 block text-xs text-blue-900/65">Отметит все запланированные публикации за {selectedDate === TODAY ? "сегодня" : readableDate(selectedDate)} как факт. Отдельные галочки можно снять ниже.</span></span></label><Badge tone={allPlannedChecked ? "success" : "accent"}>{plannedFactCount} из {plannedRows.length}</Badge></div><div className="mt-4 grid gap-2">{plannedRows.map(({ content, platform, publication }) => <label key={content.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/80 bg-white/75 px-3 py-2.5"><input type="checkbox" checked={Boolean(publication)} onChange={() => publication ? onRemoveFact(publication.id) : onMarkPlanned(selectedDate, [content.id])} className="h-4 w-4 accent-blue-600" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-gray-800">{productName(state, content.productId)} · {content.title}</span><span className="mt-0.5 block truncate text-[11px] text-gray-500">{content.type} · {platform.name}</span></span><span className={`shrink-0 text-[11px] font-semibold ${publication ? "text-emerald-600" : "text-gray-400"}`}>{publication ? "Опубликовано" : "В плане"}</span></label>)}</div></section>}
    <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><SectionTitle title="История публикаций" action={<Badge tone="accent">{publicationHistory.length}</Badge>} /><p className="mt-1 text-xs text-gray-400">Последние массовые отметки можно отменить целиком.</p></div></div>{publicationHistory.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">История появится после отметки публикаций.</p> : <div className="mt-3 grid gap-1.5">{publicationHistory.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-semibold text-gray-700">{entry.label}</p><p className="mt-0.5 text-[11px] text-gray-400">{format(new Date(entry.createdAt), "d MMM HH:mm", { locale: ru })}</p></div><Button variant="ghost" onClick={() => onUndoPublication(entry.id)} className="h-8 shrink-0 px-2 text-xs text-blue-700">Отменить</Button></div>)}</div>}</section>
   <section className="mt-5 rounded-xl border border-[#ece4df] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><SectionTitle title={dateTitle} /><Badge tone="accent">{todayPubs.length} публикаций</Badge></div><div className="mt-4 grid gap-2">{grouped.length === 0 ? <div className="rounded-lg border border-dashed border-[#e7ddd8] p-6 text-center text-sm text-[#a19891]">За эту дату пока ничего не отмечено</div> : grouped.map(({ product, pubs }) => <div key={product.id} className="rounded-lg border border-[#f0e9e5] p-3"><div className="mb-2 flex items-center gap-2"><Package size={15} className="text-[#b6312a]" /><span className="text-sm font-bold">{product.name}</span></div><div className="flex flex-wrap gap-2">{pubs.map((publication) => { const content = state.content.find((item) => item.id === publication.contentId); return <Badge key={publication.id}>{content?.type} · {state.platforms.find((platform) => platform.id === publication.platformId)?.name ?? "Архив"}</Badge>; })}</div></div>)}</div></section>
  </div>;
}

function isPriorityCalendarEvent(event: CalendarEvent) { return event.contentType === "Reels" || event.contentType === "YouTube"; }

function CalendarEventButton({ event, state, products, readOnly, designerMode, selectionMode, selected, onSelect, onOpen, onDragStart, onDragEnd }: { event: CalendarEvent; state: AppState; products: Product[]; readOnly: boolean; designerMode: boolean; selectionMode: boolean; selected: boolean; onSelect: () => void; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const product = products.find((item) => item.id === event.productId) ?? { id: event.productId, name: productName(state, event.productId), archived: false, order: 0 } satisfies Product;
  const priority = isPriorityCalendarEvent(event);
  const productLabel = productShortName(product);
  const detail = event.title?.trim() || event.contentType || "Публикация";
  const className = ["flex w-full min-w-0 items-center overflow-hidden rounded-md text-left font-medium transition", priority ? "col-span-2 min-h-[2.45rem] items-start gap-1.5 px-1.5 py-1 text-[10px] sm:text-xs" : "min-h-[0.58rem] justify-center gap-0.5 rounded-[4px] px-0.5 py-0 text-[8px] leading-none", readOnly ? "cursor-default" : "hover:brightness-95", event.kind === "plan" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800", selected ? "ring-2 ring-blue-500 ring-offset-1" : ""].join(" ");
  const dotClassName = (priority ? "mt-1 h-2 w-2" : "h-1.5 w-1.5") + " shrink-0 rounded-full";

  return <AppTooltipProvider><AppTooltip className={priority ? "col-span-2 w-full" : "w-full"}><AppTooltipTrigger asChild><button type="button" draggable={!readOnly} onDragStart={readOnly ? undefined : onDragStart} onDragEnd={readOnly ? undefined : onDragEnd} onClick={(click) => { click.stopPropagation(); if (selectionMode) onSelect(); else if (!readOnly || designerMode) onOpen(); }} aria-label={event.calendarLabel ?? event.label} className={className}><span className={dotClassName} style={{ backgroundColor: event.productColor ?? (event.kind === "plan" ? "#3b82f6" : "#10b981") }} />{priority ? <span className="min-w-0 flex-1 leading-tight"><span className="flex min-w-0 items-center gap-1 truncate font-bold"><span className="truncate">{productLabel}</span>{event.platformName && <SocialPlatformIcon name={event.platformName} size={13} />}</span><span className="block truncate opacity-75">{detail}</span>{event.brief && <span className="block truncate text-[9px] opacity-65">ТЗ: {event.brief}</span>}</span> : event.platformName && <SocialPlatformIcon name={event.platformName} size={10} />}</button></AppTooltipTrigger><AppTooltipContent><div className="grid gap-1.5"><div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-bold text-gray-900">{product.name}</span><span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-gray-500"><SocialPlatformIcon name={event.platformName ?? "Соцсеть"} size={13} />{event.platformName ?? "Соцсеть не указана"}</span></div>{event.title?.trim() && <p className="max-w-[230px] truncate text-xs text-gray-600">{event.title}</p>}</div></AppTooltipContent></AppTooltip></AppTooltipProvider>;
}

function MobileCalendarEvent({ event, state, products, readOnly, designerMode, selectionMode, selected, onSelect, onOpen, onDragStart, onDragEnd }: { event: CalendarEvent; state: AppState; products: Product[]; readOnly: boolean; designerMode: boolean; selectionMode: boolean; selected: boolean; onSelect: () => void; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const product = products.find((item) => item.id === event.productId) ?? { id: event.productId, name: productName(state, event.productId), archived: false, order: 0 } satisfies Product;
  return <AppTooltipProvider><AppTooltip className="w-full"><AppTooltipTrigger asChild><button type="button" draggable={!readOnly} onDragStart={readOnly ? undefined : onDragStart} onDragEnd={readOnly ? undefined : onDragEnd} onClick={(click) => { click.stopPropagation(); if (selectionMode) onSelect(); else if (!readOnly || designerMode) onOpen(); }} aria-label={event.calendarLabel ?? event.label} className={`flex h-4 min-w-0 w-full items-center justify-center gap-0.5 overflow-hidden rounded-[4px] px-0.5 transition ${readOnly ? "cursor-default" : "hover:brightness-95"} ${event.kind === "plan" ? "bg-blue-100" : "bg-emerald-100"} ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: event.productColor ?? (event.kind === "plan" ? "#3b82f6" : "#10b981") }} />{event.platformName && <SocialPlatformIcon name={event.platformName} size={9} />}</button></AppTooltipTrigger><AppTooltipContent><div className="grid gap-1.5"><div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-bold text-gray-900">{product.name}</span><span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-gray-500"><SocialPlatformIcon name={event.platformName ?? "Соцсеть"} size={13} />{event.platformName ?? "Соцсеть не указана"}</span></div>{event.title?.trim() && <p className="max-w-[230px] truncate text-xs text-gray-600">{event.title}</p>}</div></AppTooltipContent></AppTooltip></AppTooltipProvider>;
}

function MobileCalendarGrid({ days, month, eventsForDay, state, products, readOnly, designerMode, selectionMode, selectedEventIds, onSelect, onOpen, onCreateDay, onDragStart, onDragEnd, onDrop }: { days: Date[]; month: Date; eventsForDay: (day: Date) => CalendarEvent[]; state: AppState; products: Product[]; readOnly: boolean; designerMode: boolean; selectionMode: boolean; selectedEventIds: string[]; onSelect: (eventId: string) => void; onOpen: (event: CalendarEvent) => void; onCreateDay: (date: string) => void; onDragStart: (event: CalendarEvent) => void; onDragEnd: () => void; onDrop: (date: string) => void }) {
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return <div className="border-t border-gray-100 p-2 sm:hidden"><div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-lg border border-gray-200 bg-gray-200"><div className="contents">{weekdays.map((day) => <div key={day} className="bg-gray-50 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-gray-400">{day}</div>)}</div>{days.map((day) => { const date = dateInput(day); const events = eventsForDay(day); const currentMonth = isSameMonth(day, month); return <div key={`mobile-${date}`} data-tour={date === TODAY ? "calendar-today-cell" : undefined} onDragOver={readOnly ? undefined : (event: { preventDefault: () => void }) => event.preventDefault()} onDrop={readOnly ? undefined : () => onDrop(date)} onClick={readOnly || selectionMode ? undefined : () => onCreateDay(date)} className={`group min-h-[72px] min-w-0 border-b border-r border-gray-200 p-1 transition ${readOnly ? "" : "cursor-pointer hover:bg-blue-50/25"} ${date === TODAY ? "bg-blue-50 ring-2 ring-inset ring-blue-300" : currentMonth ? "bg-white" : "bg-gray-50/70"}`}><div className="mb-1 flex items-center justify-between gap-1"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${date === TODAY ? "bg-blue-600 text-white" : currentMonth ? "text-gray-700" : "text-gray-300"}`}>{format(day, "d")}</span>{events.length > 0 && <span className="text-[8px] font-semibold text-gray-400">{events.length}</span>}</div><div className="grid min-w-0 gap-0.5">{events.slice(0, 4).map((event) => <MobileCalendarEvent key={event.id} event={event} state={state} products={products} readOnly={readOnly} designerMode={designerMode} selectionMode={selectionMode} selected={selectedEventIds.includes(event.id)} onSelect={() => onSelect(event.id)} onOpen={() => onOpen(event)} onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} />)}{events.length > 4 && <span className="truncate px-0.5 text-[8px] font-semibold text-gray-400">+{events.length - 4}</span>}</div></div>; })}</div></div>;
}
function Calendar({ state, month, setMonth, products, readOnly = false, designerMode = false, onNotify, onCreatePlan, onUpdateContent, onDeleteContent, onUpdatePublication, onDeletePublication, onMarkPlanned }: { state: AppState; month: Date; setMonth: (month: Date) => void; products: Product[]; readOnly?: boolean; designerMode?: boolean; onNotify: (message: string) => void; onCreatePlan: (data: { title: string; brief?: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }) => void; onUpdateContent: (contentId: string, patch: Partial<ContentItem>) => void; onDeleteContent: (contentId: string) => void; onUpdatePublication: (publicationId: string, patch: { date?: string; platformId?: string }) => void; onDeletePublication: (publicationId: string) => void; onMarkPlanned: (date: string, onlyContentIds?: string[]) => void }) {
  const visualLayout = useVisualLayout();
  const [editor, setEditor] = useState<CalendarEditor | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [dragged, setDragged] = useState<CalendarEvent | null>(null);
  const [mode, setMode] = useState<"month" | "list">("month");
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [showPlan, setShowPlan] = useState(true);
  const [showFact, setShowFact] = useState(true);
  const [briefOnly, setBriefOnly] = useState(designerMode);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [redistributionOpen, setRedistributionOpen] = useState(false);
  const calendarShellRef = useRef<HTMLDivElement | null>(null);
  const platforms = state.platforms.filter((platform) => !platform.archived).sort((a, b) => a.order - b.order);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const monthDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const isCurrentMonth = monthKey(month) === monthKey(new Date());

  useEffect(() => {
    if (mode !== "month" || !isCurrentMonth) return;
    const frame = window.requestAnimationFrame(() => {
      const isDesktop = window.matchMedia("(min-width: 640px)").matches;
      const cell = isDesktop
        ? calendarShellRef.current?.querySelector<HTMLElement>('[class~="ring-blue-200/70"]')
        : calendarShellRef.current?.querySelector<HTMLElement>('.sm\\:hidden [class~="bg-blue-600"]');
      cell?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isCurrentMonth, mode, month]);

  const matchesFilters = (productId: string, platformId?: string) => {
    const matchesProduct = productFilters.length === 0 || productFilters.includes(productId);
    const matchesPlatform = platformFilters.length === 0 || (platformId ? platformFilters.includes(platformId) : false);
    return matchesProduct && matchesPlatform;
  };

  const eventsForDay = (day: Date): CalendarEvent[] => {
    const date = dateInput(day);
    const planned = showPlan
      ? state.content.filter((item) => item.plannedPublishDate === date && (!designerMode || !briefOnly || Boolean(item.brief))).map((item) => {
        const plannedPlatformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms);
        const plannedPlatform = platforms.find((platform) => platform.id === plannedPlatformId);
        return {
          id: `plan-${item.id}`,
          kind: "plan" as const,
          recordId: item.id,
          date,
          productId: item.productId,
          platformId: plannedPlatformId,
          label: `${productName(state, item.productId)} · ${item.type}`,
          calendarLabel: `${productName(state, item.productId)} · ${item.title} · ${plannedPlatform?.name ?? platformNameForContentType(item.type)}`,
          platformName: plannedPlatform?.name ?? platformNameForContentType(item.type),
          title: item.title,
          contentType: item.type,
          brief: item.brief,
          productColor: productAccent(products.find((product) => product.id === item.productId) ?? { id: item.productId, name: productName(state, item.productId), archived: false, order: 0 }, products.findIndex((product) => product.id === item.productId)),
        };
      }).filter((event) => matchesFilters(event.productId, event.platformId))
      : [];
    const actual = showFact
      ? state.publications.filter((item) => item.date === date).map((publication): CalendarEvent | null => {
        const content = state.content.find((item) => item.id === publication.contentId);
        if (designerMode && briefOnly && !content?.brief) return null;
        const productId = content?.productId ?? "";
        const platform = platforms.find((item) => item.id === publication.platformId);
        return { id: `publication-${publication.id}`, kind: "publication" as const, recordId: publication.id, date, productId, platformId: publication.platformId, label: `${productName(state, productId)} · ${content?.type ?? "Публикация"}`, calendarLabel: `${productName(state, productId)} · ${content?.title ?? "Без темы"} · ${platform?.name ?? "Архив"}`, platformName: platform?.name ?? "Архив", title: content?.title ?? "Без темы", contentType: content?.type, brief: content?.brief, productColor: productAccent(products.find((product) => product.id === productId) ?? { id: productId, name: productName(state, productId), archived: false, order: 0 }, products.findIndex((product) => product.id === productId)) };
      }).filter((event): event is CalendarEvent => Boolean(event)).filter((event) => matchesFilters(event.productId, event.platformId))
      : [];
    return [...planned, ...actual].sort((left, right) => Number(isPriorityCalendarEvent(right)) - Number(isPriorityCalendarEvent(left)) || Number(left.kind === "publication") - Number(right.kind === "publication"));
  };

  const agendaEvents = monthDays.flatMap((day) => eventsForDay(day));
  const hasFilters = productFilters.length > 0 || platformFilters.length > 0 || !showPlan || !showFact || (designerMode && !briefOnly);
  const selectedEvents = agendaEvents.filter((event) => selectedEventIds.includes(event.id));
  const selectedPlans = selectedEvents.filter((event) => event.kind === "plan");
  const allVisibleSelected = agendaEvents.length > 0 && agendaEvents.every((event) => selectedEventIds.includes(event.id));

  function openEvent(event: CalendarEvent) {
    setEditor(event.kind === "plan" ? { kind: "content", contentId: event.recordId } : { kind: "publication", publicationId: event.recordId });
  }

  function dropOnDay(date: string) {
    if (readOnly || !dragged) return;
    if (dragged.kind === "plan") onUpdateContent(dragged.recordId, { plannedPublishDate: date });
    else onUpdatePublication(dragged.recordId, { date });
    setDragged(null);
    onNotify("Дата обновлена");
  }

  function resetFilters() {
    setProductFilters([]);
    setPlatformFilters([]);
    setShowPlan(true);
    setShowFact(true);
    setBriefOnly(designerMode);
  }

  function toggleSelectedEvent(eventId: string) {
    setSelectedEventIds((current) => current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]);
  }

  function toggleSelectAllVisible() {
    const visibleIds = agendaEvents.map((event) => event.id);
    setSelectedEventIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedEventIds([]);
    setBulkDeleteOpen(false);
    setRedistributionOpen(false);
  }

  function markSelectedPublished() {
    if (selectedPlans.length === 0) {
      onNotify("Выберите плановые публикации");
      return;
    }
    const byDate = new Map<string, string[]>();
    selectedPlans.forEach((event) => byDate.set(event.date, [...(byDate.get(event.date) ?? []), event.recordId]));
    byDate.forEach((contentIds, date) => onMarkPlanned(date, contentIds));
    onNotify(`Отмечено как опубликованное: ${selectedPlans.length}`);
    exitSelectionMode();
  }

  function deleteSelectedEvents() {
    selectedEvents.filter((event) => event.kind === "publication").forEach((event) => onDeletePublication(event.recordId));
    selectedEvents.filter((event) => event.kind === "plan").forEach((event) => onDeleteContent(event.recordId));
    onNotify(`Удалено записей: ${selectedEvents.length}`);
    exitSelectionMode();
  }

  function redistributeSelectedPlans(weekdaysOnly: boolean) {
    if (selectedPlans.length === 0) {
      onNotify("Выберите плановые публикации");
      return;
    }
    const selectedIds = new Set(selectedPlans.map((event) => event.recordId));
    const occupied = new Set(state.content.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month)) && !selectedIds.has(item.id)).map((item) => `${item.plannedPublishDate}|${item.type}`));
    const availableDates = monthDays.map(dateInput).filter((date) => !weekdaysOnly || ![0, 6].includes(new Date(`${date}T12:00:00`).getDay()));
    const moved: Array<{ event: CalendarEvent; date: string }> = [];
    const sorted = [...selectedPlans].sort((a, b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId));
    sorted.forEach((event) => {
      const nextDate = availableDates.find((date) => !occupied.has(`${date}|${event.contentType ?? "Публикация"}`));
      if (!nextDate) return;
      occupied.add(`${nextDate}|${event.contentType ?? "Публикация"}`);
      if (nextDate !== event.date) moved.push({ event, date: nextDate });
    });
    moved.forEach(({ event, date }) => onUpdateContent(event.recordId, { plannedPublishDate: date }));
    setRedistributionOpen(false);
    onNotify(moved.length ? `Перераспределено планов: ${moved.length}` : "План уже распределён оптимально");
    exitSelectionMode();
  }

  const filterControls = <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => setShowPlan((value) => !value)} className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition ${showPlan ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-400"}`}><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> План</button><button type="button" onClick={() => setShowFact((value) => !value)} className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition ${showFact ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-400"}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Факт</button>{designerMode && <button type="button" onClick={() => setBriefOnly((value) => !value)} className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition ${briefOnly ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-400"}`}><ClipboardList size={12} /> ТЗ</button>}{hasFilters && <Button variant="ghost" onClick={resetFilters} className="h-7 px-2 text-[11px]"><RotateCcw size={12} /> Сбросить</Button>}</div>;
  const selectControls = <div className="flex shrink-0 items-center gap-1"><MultiFilter label="Продукты" options={products.map((product) => ({ id: product.id, label: product.name }))} selectedIds={productFilters} onChange={setProductFilters} /><MultiFilter label="Соцсети" options={platforms.map((platform) => ({ id: platform.id, label: platform.name }))} selectedIds={platformFilters} onChange={setPlatformFilters} /></div>;

  return <div ref={calendarShellRef} className="calendar-shell min-w-0">
    <PageHeader eyebrow="Планирование" title="Календарь" description="Весь месяц, приоритетные публикации и быстрый контроль плана и факта по дням." />
    <section data-tour="calendar-toolbar" className="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col">
        <div className="border-b border-gray-100 px-2 sm:px-3" style={{ paddingTop: `${Math.min(24, Math.max(0, visualLayout.calendarToolbar.paddingYpx ?? 6))}px`, paddingBottom: `${Math.min(24, Math.max(0, visualLayout.calendarToolbar.paddingYpx ?? 6))}px` }}>
          <div className="flex min-w-0 flex-wrap items-center overflow-visible" style={{ gap: `${Math.min(16, Math.max(0, visualLayout.calendarToolbar.gapPx ?? 6))}px` }}>
            {!readOnly && <Button onClick={() => setEditor({ kind: "new", date: dateInput(month) })} className="h-7 px-2 text-[11px]"><Plus size={13} /> <span className="hidden sm:inline">Новая запись</span><span className="sm:hidden">Новая</span></Button>}
            <Button variant="secondary" onClick={() => setMonth(new Date())} className="h-7 px-2 text-[11px]"><CalendarDays size={13} /> Сегодня</Button>
            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5"><IconButton label="Предыдущий месяц" onClick={() => setMonth(subMonths(month, 1))}><ArrowLeft size={14} /></IconButton><h3 className="min-w-[112px] text-center text-xs font-bold text-gray-900">{monthLabel(month)}</h3><IconButton label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}><ArrowRight size={14} /></IconButton></div>
            {visualLayout.calendarToolbar.showViewSwitch && <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5"><button type="button" onClick={() => setMode("month")} className={`inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold transition ${mode === "month" ? "bg-white text-blue-700 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}><LayoutGrid size={12} /> Месяц</button><button type="button" onClick={() => setMode("list")} className={`inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold transition ${mode === "list" ? "bg-white text-blue-700 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}><List size={12} /> Список</button></div>}
            {!readOnly && <Button variant={selectionMode ? "primary" : "secondary"} onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)} className="h-7 shrink-0 px-2 text-[11px]"><Check size={12} /> {selectionMode ? "Готово" : "Выбрать"}</Button>}
            {visualLayout.calendarToolbar.showFilters && <>{filterControls}{selectControls}</>}
          </div>
          {selectionMode && <div className="mt-1.5 flex min-w-max items-center gap-1.5 overflow-x-auto rounded-lg border border-blue-100 bg-blue-50/60 px-2 py-1.5"><span className="mr-1 shrink-0 text-[11px] font-semibold text-blue-900">Выбрано: {selectedEvents.length}</span><Button variant="ghost" onClick={toggleSelectAllVisible} disabled={!agendaEvents.length} className="h-7 shrink-0 px-2 text-[11px]"><Check size={12} /> {allVisibleSelected ? "Снять все" : "Выбрать все"}</Button><Button variant="secondary" onClick={markSelectedPublished} disabled={!selectedPlans.length} className="h-7 shrink-0 px-2 text-[11px]"><Check size={12} /> Опубликовано</Button><Button variant="secondary" onClick={() => setRedistributionOpen(true)} disabled={!selectedPlans.length} className="h-7 shrink-0 px-2 text-[11px]"><RotateCcw size={12} /> Перераспределить</Button><Button variant="danger" onClick={() => setBulkDeleteOpen(true)} disabled={!selectedEvents.length} className="h-7 shrink-0 px-2 text-[11px]"><Trash2 size={12} /> Удалить</Button><Button variant="ghost" onClick={() => setSelectedEventIds([])} className="h-7 shrink-0 px-2 text-[11px]">Снять выбор</Button></div>}
        </div>

         {mode === "month" ? <><div className="hidden overflow-x-auto overscroll-x-contain sm:block"><div className="min-w-[720px]"><div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <div key={day} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:py-3 sm:text-xs">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const events = eventsForDay(day); const isCurrentMonth = isSameMonth(day, month); const date = dateInput(day); return <div key={day.toISOString()} data-tour={date === TODAY ? "calendar-today-cell" : undefined} onDragOver={readOnly ? undefined : (event: { preventDefault: () => void }) => event.preventDefault()} onDrop={readOnly ? undefined : () => dropOnDay(date)} onClick={readOnly || selectionMode ? undefined : () => setEditor({ kind: "new", date })} className={`group min-h-[112px] border-b border-r border-gray-100 p-1.5 transition sm:min-h-[138px] sm:p-2 ${readOnly ? "" : "cursor-pointer hover:bg-blue-50/25"} ${date === TODAY ? "bg-blue-50/45 ring-2 ring-inset ring-blue-200/70" : isCurrentMonth ? "bg-white" : "bg-gray-50/60"}`}><div className="mb-1.5 flex items-center justify-between"><div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${date === TODAY ? "bg-blue-600 text-white shadow-sm shadow-blue-300" : isCurrentMonth ? "text-gray-600" : "text-gray-300"}`}>{format(day, "d")}</div>{date === TODAY ? <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Сегодня</span> : isCurrentMonth && <span className="text-[10px] text-gray-300">{events.length || ""}</span>}</div><div className="grid min-w-0 grid-cols-[repeat(4,minmax(0,1fr))] gap-1">{events.map((event) => <CalendarEventButton key={event.id} event={event} state={state} products={products} readOnly={readOnly} designerMode={designerMode} selectionMode={selectionMode} selected={selectedEventIds.includes(event.id)} onSelect={() => toggleSelectedEvent(event.id)} onOpen={() => openEvent(event)} onDragStart={() => setDragged(event)} onDragEnd={() => setDragged(null)} />)}</div></div>; })}</div></div></div><MobileCalendarGrid days={days} month={month} eventsForDay={eventsForDay} state={state} products={products} readOnly={readOnly} designerMode={designerMode} selectionMode={selectionMode} selectedEventIds={selectedEventIds} onSelect={(eventId) => toggleSelectedEvent(eventId)} onOpen={openEvent} onCreateDay={(date) => setEditor({ kind: "new", date })} onDragStart={setDragged} onDragEnd={() => setDragged(null)} onDrop={dropOnDay} /></> : <div className="border-t border-gray-100"><div className="divide-y divide-gray-100">{agendaEvents.length === 0 ? <div className="p-12 text-center"><List className="mx-auto text-gray-300" size={26} /><p className="mt-3 text-sm font-semibold text-gray-600">В этом фильтре пока нет записей</p><p className="mt-1 text-xs text-gray-400">Добавьте план через режим «Месяц» или измените фильтр.</p></div> : agendaEvents.map((event) => <button key={event.id} type="button" onClick={readOnly && !designerMode ? undefined : () => selectionMode ? toggleSelectedEvent(event.id) : openEvent(event)} className={`grid w-full grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition sm:grid-cols-[120px_minmax(0,1fr)_160px_auto] sm:px-4 ${readOnly ? "cursor-default" : "hover:bg-blue-50/30"} ${selectionMode && selectedEventIds.includes(event.id) ? "bg-blue-50 ring-1 ring-inset ring-blue-300" : ""}`}><span className="text-xs font-semibold text-gray-500">{format(new Date(`${event.date}T12:00:00`), "d MMMM", { locale: ru })}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-800">{productName(state, event.productId)}</span><span className="mt-0.5 block truncate text-xs text-gray-400">{event.title ?? event.contentType ?? "Без темы"} · {event.platformName} · {event.kind === "plan" ? "План" : "Факт"}</span>{event.brief && <span className="block truncate text-[10px] text-gray-400">ТЗ: {event.brief}</span>}</span><span className="hidden text-xs text-gray-500 sm:block">{event.kind === "plan" ? "Запланировано" : "Опубликовано"}</span><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.productColor ?? (event.kind === "plan" ? "#3b82f6" : "#10b981") }} /></button>)}</div></div>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 px-3 py-2.5 text-[11px] text-gray-400 sm:px-4">{readOnly ? <span>Режим просмотра · данные нельзя изменить</span> : <><span>Пустой день — добавить</span><span>Перетащить — перенести</span><span>Нажать на запись — редактировать</span></>}<span className="ml-auto">{agendaEvents.length} записей</span></div>
      </div>
    </section>

    {editor?.kind === "new" && <PlanEditor date={editor.date} products={products} platforms={platforms} onClose={() => setEditor(null)} onSave={(data) => { onCreatePlan(data); setEditor(null); }} />}
    {editor?.kind === "content" && (designerMode ? <BriefDialog state={state} contentId={editor.contentId} onClose={() => setEditor(null)} /> : <ContentEditor state={state} contentId={editor.contentId} products={products} platforms={platforms} onClose={() => setEditor(null)} onSave={(id, patch) => { onUpdateContent(id, patch); setEditor(null); }} onDelete={(id) => setDeleteRequest({ kind: "content", id })} />)}
    {editor?.kind === "publication" && (designerMode ? <BriefDialog state={state} contentId={state.publications.find((publication) => publication.id === editor.publicationId)?.contentId ?? ""} onClose={() => setEditor(null)} /> : <PublicationEditor state={state} publicationId={editor.publicationId} products={products} onClose={() => setEditor(null)} onSave={(publicationId, contentId, publicationPatch, contentPatch) => { onUpdatePublication(publicationId, publicationPatch); onUpdateContent(contentId, contentPatch); setEditor(null); }} onDelete={(id) => setDeleteRequest({ kind: "publication", id })} />)}
    {deleteRequest && <DeleteConfirmDialog kind={deleteRequest.kind} onClose={() => setDeleteRequest(null)} onConfirm={() => { if (deleteRequest.kind === "content") onDeleteContent(deleteRequest.id); else onDeletePublication(deleteRequest.id); setDeleteRequest(null); setEditor(null); }} />}
    {bulkDeleteOpen && <BulkDeleteConfirmDialog count={selectedEvents.length} onClose={() => setBulkDeleteOpen(false)} onConfirm={deleteSelectedEvents} />}
    {redistributionOpen && <RedistributionDialog count={selectedPlans.length} onClose={() => setRedistributionOpen(false)} onConfirm={redistributeSelectedPlans} />}
  </div>;
}

function BulkDeleteConfirmDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: () => void }) {
  return <Modal title="Удалить выбранные записи?" onClose={onClose}>
    <div className="grid gap-4"><div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-sm font-semibold text-red-900">Будет удалено: {count}</p><p className="mt-1 text-xs leading-5 text-red-800/70">Плановые записи и фактические публикации исчезнут из календаря. Это действие нельзя отменить.</p></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="danger" onClick={onConfirm}><Trash2 size={15} /> Удалить выбранное</Button></div></div>
  </Modal>;
}

function RedistributionDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: (weekdaysOnly: boolean) => void }) {
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  return <Modal title="Перераспределить план" onClose={onClose}>
    <div className="grid gap-4"><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-sm font-semibold text-blue-950">Выбрано планов: {count}</p><p className="mt-1 text-xs leading-5 text-blue-900/70">Записи будут заново разложены по свободным датам текущего месяца. Два материала одного формата в один день не попадут.</p></div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3"><input type="checkbox" checked={weekdaysOnly} onChange={(event) => setWeekdaysOnly(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="block text-sm font-semibold text-gray-800">Распределять только по будням</span><span className="mt-1 block text-xs leading-5 text-gray-500">Снимите галочку, если можно использовать субботу и воскресенье.</span></span></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onConfirm(weekdaysOnly)}><RotateCcw size={15} /> Распределить</Button></div></div>
  </Modal>;
}

function DeleteConfirmDialog({ kind, onClose, onConfirm }: { kind: DeleteRequest["kind"]; onClose: () => void; onConfirm: () => void }) {
  const isContent = kind === "content";
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Trash2 size={18} /></div><IconButton label="Закрыть" onClick={onClose}><X size={18} /></IconButton></div>
      <h2 id="delete-dialog-title" className="mt-4 text-lg font-bold text-gray-900">{isContent ? "Удалить материал?" : "Удалить публикацию?"}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">{isContent ? "Материал и все связанные с ним публикации будут удалены. Это действие нельзя отменить." : "Эта публикация исчезнет из факта, но сам материал останется в плане."}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Отмена</Button><Button variant="danger" onClick={onConfirm} className="w-full sm:w-auto"><Trash2 size={15} /> Удалить</Button></div>
    </div>
  </div>;
}

function PlanEditor({ date, products, platforms, onClose, onSave }: { date: string; products: Product[]; platforms: Platform[]; onClose: () => void; onSave: (data: { title: string; brief?: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }) => void }) { return <Modal title="Запланировать публикацию" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ title: String(form.get("title") ?? ""), brief: String(form.get("brief") ?? ""), productId: String(form.get("productId")), type: String(form.get("type")) as ContentType, plannedPlatformId: String(form.get("platformId")), plannedPublishDate: String(form.get("date")) }); }} className="grid gap-4"><Field label="Дата"><input required type="date" name="date" defaultValue={date} className={inputClass} /></Field><Field label="Продукт"><FormSelect name="productId" defaultValue={products[0]?.id ?? ""} options={products.map((product) => ({ id: product.id, label: product.name }))} ariaLabel="Продукт" /></Field><Field label="Соцсеть"><FormSelect name="platformId" defaultValue={platforms[0]?.id ?? ""} options={platforms.map((platform) => ({ id: platform.id, label: platform.name }))} ariaLabel="Соцсеть" /></Field><Field label="Что планируем"><FormSelect name="type" defaultValue={CONTENT_TYPES[0]} options={CONTENT_TYPES.map((type) => ({ id: type, label: type }))} ariaLabel="Формат" /></Field><Field label="Название — необязательно"><input name="title" className={inputClass} placeholder="Например, кейс или тема ролика" /></Field><Field label="ТЗ для дизайнера — необязательно"><textarea name="brief" className={`${inputClass} h-24 resize-y py-2`} placeholder="Что нужно создать: формат, текст, референсы, требования" /></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit"><Check size={16} /> Добавить в план</Button></div></form></Modal>; }

function ContentEditor({ state, contentId, products, platforms, onClose, onSave, onDelete }: { state: AppState; contentId: string; products: Product[]; platforms: Platform[]; onClose: () => void; onSave: (id: string, patch: Partial<ContentItem>) => void; onDelete: (id: string) => void }) { const item = state.content.find((content) => content.id === contentId); if (!item) return null; return <Modal title="Редактировать план" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave(item.id, { title: String(form.get("title")), brief: String(form.get("brief") ?? "").trim() || undefined, productId: String(form.get("productId")), type: String(form.get("type")) as ContentType, plannedPlatformId: String(form.get("platformId")), plannedPublishDate: String(form.get("date")) }); }} className="grid gap-4"><Field label="Дата публикации"><input required type="date" name="date" defaultValue={item.plannedPublishDate} className={inputClass} /></Field><Field label="Продукт"><FormSelect name="productId" defaultValue={item.productId} options={products.map((product) => ({ id: product.id, label: product.name }))} ariaLabel="Продукт" /></Field><Field label="Соцсеть"><FormSelect name="platformId" defaultValue={item.plannedPlatformId ?? platformIdForContentType(item.type, platforms)} options={platforms.map((platform) => ({ id: platform.id, label: platform.name }))} ariaLabel="Соцсеть" /></Field><Field label="Что планируем"><FormSelect name="type" defaultValue={item.type} options={CONTENT_TYPES.map((type) => ({ id: type, label: type }))} ariaLabel="Формат" /></Field><Field label="Название"><input required name="title" defaultValue={item.title} className={inputClass} /></Field><Field label="ТЗ для дизайнера — необязательно"><textarea name="brief" defaultValue={item.brief ?? ""} className={`${inputClass} h-24 resize-y py-2`} placeholder="Что нужно создать: формат, текст, референсы, требования" /></Field><div className="flex items-center justify-between gap-2 pt-2"><Button variant="secondary" onClick={() => onDelete(item.id)}><Trash2 size={15} /> Удалить</Button><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit"><Check size={16} /> Сохранить</Button></div></div></form></Modal>; }

function BriefDialog({ state, contentId, onClose }: { state: AppState; contentId: string; onClose: () => void }) { const item = state.content.find((content) => content.id === contentId); if (!item) return null; const product = state.products.find((entry) => entry.id === item.productId); const platform = state.platforms.find((entry) => entry.id === item.plannedPlatformId) ?? state.platforms.find((entry) => platformNameForContentType(item.type).toLowerCase() === entry.name.toLowerCase()); return <Modal title={`ТЗ · ${product?.name ?? "Публикация"}`} onClose={onClose}><div className="grid gap-4"><div className="grid gap-1"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Публикация</p><p className="text-lg font-bold text-gray-900">{item.title}</p><p className="text-sm text-gray-500">{item.plannedPublishDate ? readableDate(item.plannedPublishDate) : "Дата не указана"} · {item.type} · {platform?.name ?? "Соцсеть не указана"}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Техническое задание</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.brief || "ТЗ пока не добавлено."}</p></div><Badge tone={item.brief ? "success" : "neutral"}>{item.brief ? "Есть ТЗ" : "Без ТЗ"}</Badge></div></Modal>; }

function PublicationEditor({ state, publicationId, products, onClose, onSave, onDelete }: { state: AppState; publicationId: string; products: Product[]; onClose: () => void; onSave: (publicationId: string, contentId: string, publicationPatch: { date?: string; platformId?: string }, contentPatch: Partial<ContentItem>) => void; onDelete: (id: string) => void }) { const publication = state.publications.find((item) => item.id === publicationId); const item = publication ? state.content.find((content) => content.id === publication.contentId) : undefined; if (!publication || !item) return null; const platforms = state.platforms.filter((platform) => !platform.archived); return <Modal title="Редактировать публикацию" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave(publication.id, item.id, { date: String(form.get("date")), platformId: String(form.get("platformId")) }, { title: String(form.get("title")), productId: String(form.get("productId")), type: String(form.get("type")) as ContentType }); }} className="grid gap-4"><Field label="Дата публикации"><input required type="date" name="date" defaultValue={publication.date} className={inputClass} /></Field><Field label="Соцсеть"><FormSelect name="platformId" defaultValue={publication.platformId} options={platforms.map((platform) => ({ id: platform.id, label: platform.name }))} ariaLabel="Соцсеть" /></Field><Field label="Продукт"><FormSelect name="productId" defaultValue={item.productId} options={products.map((product) => ({ id: product.id, label: product.name }))} ariaLabel="Продукт" /></Field><Field label="Тип"><FormSelect name="type" defaultValue={item.type} options={CONTENT_TYPES.map((type) => ({ id: type, label: type }))} ariaLabel="Формат" /></Field><Field label="Название"><input required name="title" defaultValue={item.title} className={inputClass} /></Field><div className="flex items-center justify-between gap-2"><Button variant="secondary" onClick={() => onDelete(publication.id)}><Trash2 size={15} /> Удалить</Button><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit"><Check size={16} /> Сохранить</Button></div></div></form></Modal>; }

function PlanFact({ month, setMonth, products, platforms, plan, plannedContent, publications, readOnly = false, actual, actualChannel, onSetPlan, onSetChannelPlan, onSetProductWeekdays, onCopyPreviousMonth, onExport, onCreatePlan, onCreateManyPlans, onUpdateContent, onDeleteContent, onCreateRepurposedContent }: { month: Date; setMonth: (month: Date) => void; products: Product[]; platforms: Platform[]; plan: MonthPlan; plannedContent: ContentItem[]; publications: AppState["publications"]; readOnly?: boolean; actual: (productId: string, platformId: string) => number; actualChannel: (productId: string, channel: BulkChannel) => number; onSetPlan: (productId: string, platformId: string, value: number) => void; onSetChannelPlan: (productId: string, channelId: string, value: number) => void; onSetProductWeekdays: (productId: string, weekdays: number[]) => void; onCopyPreviousMonth: () => void; onExport: () => void; onCreatePlan: (data: { title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }) => void; onCreateManyPlans: (data: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }>) => void; onUpdateContent: (contentId: string, patch: Partial<ContentItem>) => void; onDeleteContent: (contentId: string) => void; onCreateRepurposedContent: (sourceIds: string[], ruleIds: string[]) => void }) {
  void actual;
  void onSetPlan;
  void onCreatePlan;
  const [distributionTarget, setDistributionTarget] = useState<Product | null>(null);
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const channels = useMemo(() => platforms.flatMap(bulkChannelsForPlatform), [platforms]);
  const rows = products.map((product) => {
    const planTotal = channels.reduce((sum, channel) => sum + channelPlanValue(plan, product.id, channel, platforms), 0);
    const factTotal = channels.reduce((sum, channel) => sum + actualChannel(product.id, channel), 0);
    return { product, planTotal, factTotal, completion: percent(factTotal, planTotal) };
  });
  const totalPlan = rows.reduce((sum, row) => sum + row.planTotal, 0);
  const totalFact = rows.reduce((sum, row) => sum + row.factTotal, 0);
  const completion = percent(totalFact, totalPlan);

  return <div className="plan-fact-shell">
    <PageHeader eyebrow="Месячный план" title="Контент-план" description={readOnly ? "Просмотр планов и факта по продуктам и соцсетям" : "Меняйте значения в карточках и быстро распределяйте план по календарю"} actions={<><MonthSwitcher month={month} setMonth={setMonth} />{!readOnly && <><Button variant="secondary" onClick={() => setRepurposeOpen(true)} disabled={!plannedContent.some((item) => item.plannedPublishDate?.startsWith(monthKey(month)) && !item.sourceContentId)}><Sparkles size={15} /> Адаптации</Button><Button variant="secondary" onClick={() => setDistributionTarget(products[0] ?? null)} disabled={!products.length}><CalendarDays size={15} /> Распределить по месяцу</Button><Button variant="secondary" onClick={onCopyPreviousMonth}><RotateCcw size={15} /> Повторить прошлый месяц</Button><IconButton label="Скачать PDF" onClick={onExport}><Download size={17} /></IconButton></>}</>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="План" value={totalPlan} unit="публикаций" description={`на ${monthLabel(month)}`} accent /><MetricCard label="Факт" value={totalFact} unit="публикаций" description="опубликовано в календаре" /><MetricCard label="Выполнение" value={completion} unit="%" description={completion >= 100 ? "План выполнен" : "от общего плана"} /><MetricCard label="Осталось" value={Math.max(totalPlan - totalFact, 0)} unit="публикаций" description="до конца месячного плана" /></div>
       <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
         <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><SectionTitle title="Прогресс по продуктам" /><p className="mt-1 text-xs text-gray-500">{readOnly ? "Режим просмотра · редактирование плана доступно владельцу." : "Сначала задайте количество по соцсетям, затем одной кнопкой распределите его по календарю."}</p></div><Badge tone={readOnly ? "neutral" : "accent"}>{readOnly ? "Только просмотр" : monthLabel(month)}</Badge></div>
          <div className="grid gap-3">{rows.map(({ product, planTotal, factTotal, completion: productCompletion }) => {
           const weekdays = productWeekdays(plan, product.id);
           return <article id={"plan-product-" + product.id} key={product.id} className="plan-product-card scroll-mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: productAccent(product) }} /><h4 className="truncate text-sm font-bold text-gray-900">{product.name}</h4></div><p className="mt-0.5 text-xs text-gray-400">{factTotal} из {planTotal} публикаций</p></div><span className="text-lg font-bold tracking-tight text-gray-900">{productCompletion}%</span></div>
             <div className="mt-3"><Progress value={productCompletion} tone="success" /></div>
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5"><div className="flex items-center justify-between gap-2"><div><span className="block text-[10px] font-bold uppercase tracking-wide text-blue-700">Дни выхода по продукту</span><span className="mt-0.5 block text-[11px] text-blue-900/60">Выберите дни прямо в карточке</span></div><span className="text-[11px] font-semibold text-blue-700">{weekdays.length} дн.</span></div><div className="mt-2 flex flex-wrap gap-1">{DISTRIBUTION_WEEKDAYS.map((weekday) => <button type="button" key={weekday.value} disabled={readOnly} onClick={() => { const next = weekdays.includes(weekday.value) ? weekdays.filter((value) => value !== weekday.value) : [...weekdays, weekday.value].sort((a, b) => a - b); onSetProductWeekdays(product.id, next); }} className={`h-7 min-w-8 rounded-lg px-2 text-[10px] font-bold transition ${weekdays.includes(weekday.value) ? "bg-blue-600 text-white shadow-sm" : "border border-blue-100 bg-white text-blue-700 hover:bg-blue-50"} disabled:cursor-not-allowed disabled:opacity-50`}>{weekday.label}</button>)}</div></div>
              <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">{channels.map((channel) => { const target = channelPlanValue(plan, product.id, channel, platforms); const fact = actualChannel(product.id, channel); return <div key={channel.id} className="min-w-0 rounded-lg border border-white bg-white px-2 py-1.5"><div className="flex items-center justify-between gap-1"><span title={`${channel.label} · ${channel.platformName}`} className="flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold text-gray-700"><SocialPlatformIcon name={channel.platformName} size={13} /><span className="truncate">{channel.label}</span><span className="truncate text-[10px] font-normal text-gray-400">{channel.platformName}</span></span><span className="shrink-0 text-[10px] font-semibold text-emerald-700">{fact} факт</span></div><div className="mt-1 flex items-center justify-between gap-1"><span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">План</span>{readOnly ? <span className="text-sm font-bold text-gray-900">{target}</span> : <NumberField value={target} min={0} max={999} onValueChange={(value) => onSetChannelPlan(product.id, channel.id, value)} className="w-[108px] shrink-0"><NumberFieldScrubArea label="" /><NumberFieldGroup className="h-7 rounded-lg"><NumberFieldInput aria-label={`План публикаций: ${product.name}, ${channel.label}`} className="px-1 text-xs tabular-nums" /><NumberFieldDecrement className="w-6" /><NumberFieldIncrement className="w-6" /></NumberFieldGroup></NumberField>}</div></div>; })}</div>
           </article>;
         })}</div>
       </section>
    {distributionTarget && <DistributionEngineDialog month={month} products={products} platforms={platforms} plan={plan} plannedContent={plannedContent} publications={publications} onClose={() => setDistributionTarget(null)} onCreateManyPlans={onCreateManyPlans} onUpdateContent={onUpdateContent} onDeleteContent={onDeleteContent} />}
     {repurposeOpen && <RepurposeDialog month={month} products={products} platforms={platforms} plannedContent={plannedContent} onClose={() => setRepurposeOpen(false)} onCreate={(sourceIds, ruleIds) => { onCreateRepurposedContent(sourceIds, ruleIds); setRepurposeOpen(false); }} />}
     <ProductNavigationMenu products={products} />
  </div>;
}

const DISTRIBUTION_WEEKDAYS = [{ value: 1, label: "Пн" }, { value: 2, label: "Вт" }, { value: 3, label: "Ср" }, { value: 4, label: "Чт" }, { value: 5, label: "Пт" }, { value: 6, label: "Сб" }, { value: 0, label: "Вс" }];

function ProductNavigationMenu({ products }: { products: Product[] }) {
  const items = products.map((product) => ({
    id: product.id,
    label: productShortName(product),
    tooltip: product.name,
    icon: <span className="max-w-[2.6rem] truncate">{productShortName(product)}</span>,
    onSelect: () => document.getElementById("plan-product-" + product.id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
  }));
  return <CircularCommandMenu items={items} />;
}

function RepurposeDialog({ month, products, platforms, plannedContent, onClose, onCreate }: { month: Date; products: Product[]; platforms: Platform[]; plannedContent: ContentItem[]; onClose: () => void; onCreate: (sourceIds: string[], ruleIds: string[]) => void }) {
  const sources = plannedContent.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month)) && !item.sourceContentId && ["Reels", "Пост", "YouTube"].includes(item.type));
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() => sources.map((item) => item.id));
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(() => REPURPOSE_RULES.map((rule) => rule.id));
  const selectedSources = sources.filter((item) => selectedSourceIds.includes(item.id));
  const applicableRules = REPURPOSE_RULES.filter((rule) => selectedSources.some((item) => item.type === rule.sourceType));
  const existingKeys = useMemo(() => new Set(plannedContent.filter((item) => item.sourceContentId).map((item) => `${item.sourceContentId}|${item.type}|${item.plannedPlatformId}|${item.plannedPublishDate}`)), [plannedContent]);
  const candidates = selectedSources.flatMap((source) => REPURPOSE_RULES.filter((rule) => selectedRuleIds.includes(rule.id) && rule.sourceType === source.type).map((rule) => { const platformId = platformIdForContentType(rule.targetType, platforms); const plannedPublishDate = source.plannedPublishDate ? repurposeDate(source.plannedPublishDate, rule.offsetDays) : ""; return { source, rule, platformId, plannedPublishDate, exists: Boolean(platformId && existingKeys.has(`${source.id}|${rule.targetType}|${platformId}|${plannedPublishDate}`)) }; }));
  const newCount = candidates.filter((candidate) => !candidate.exists && candidate.platformId).length;

  function toggleSource(sourceId: string) { setSelectedSourceIds((current) => current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId]); }
  function toggleRule(ruleId: string) { setSelectedRuleIds((current) => current.includes(ruleId) ? current.filter((id) => id !== ruleId) : [...current, ruleId]); }
  function selectAllSources() { setSelectedSourceIds(selectedSourceIds.length === sources.length ? [] : sources.map((item) => item.id)); }

  return <Modal title={`Адаптации · ${monthLabel(month)}`} onClose={onClose} wide>
    <div className="grid gap-4"><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Исходник → адаптации</p><p className="mt-1 text-sm leading-5 text-blue-950/70">Выберите исходные публикации и площадки. Связанные адаптации появятся в календаре с понятными датами и не создадутся повторно.</p></div>{sources.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center"><Sparkles className="mx-auto text-gray-300" size={24} /><p className="mt-3 text-sm font-semibold text-gray-700">В этом месяце нет исходников</p><p className="mt-1 text-xs text-gray-400">Сначала добавьте в план Reels, Пост или длинное YouTube-видео.</p></div> : <><div className="grid gap-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Исходные публикации</p><Button variant="ghost" onClick={selectAllSources} className="h-8 px-2 text-xs">{selectedSourceIds.length === sources.length ? "Снять все" : "Выбрать все"}</Button></div><div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-xl border border-gray-200 p-2">{sources.map((source) => { const product = products.find((item) => item.id === source.productId); return <label key={source.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition ${selectedSourceIds.includes(source.id) ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"}`}><input type="checkbox" checked={selectedSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} className="h-4 w-4 accent-blue-600" /><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: productAccent(product ?? { id: source.productId, name: "", archived: false, order: 0 }) }} /><span className="min-w-0 flex-1 truncate font-semibold">{product?.name ?? "Без продукта"} · {source.title}</span><span className="shrink-0 text-[10px] text-gray-400">{source.type} · {source.plannedPublishDate?.slice(-2)}.{source.plannedPublishDate?.slice(5, 7)}</span></label>; })}</div></div><div className="grid gap-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Правила адаптации</p><div className="grid gap-2 sm:grid-cols-2">{applicableRules.map((rule) => <label key={rule.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${selectedRuleIds.includes(rule.id) ? "border-blue-200 bg-blue-50/60" : "border-gray-200 bg-white"}`}><input type="checkbox" checked={selectedRuleIds.includes(rule.id)} onChange={() => toggleRule(rule.id)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="block text-sm font-semibold text-gray-800">{rule.sourceType} → {rule.label}</span><span className="mt-1 block text-xs leading-5 text-gray-500">{rule.description}</span></span></label>)}</div></div><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500"><span>Исходников: <strong className="text-gray-900">{selectedSources.length}</strong></span><span>Новых адаптаций: <strong className="text-blue-700">{newCount}</strong></span><span>Уже есть: <strong className="text-gray-700">{candidates.filter((candidate) => candidate.exists).length}</strong></span></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onCreate(selectedSourceIds, selectedRuleIds)} disabled={!selectedSources.length || !newCount}><Sparkles size={15} /> Создать адаптации</Button></div></>}</div>
  </Modal>;
}

function distributionPool(month: Date, mode: "even" | "custom", weeks: number[], weekdays: number[]) {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).filter((day) => {
    const weekday = getDay(day);
    if (mode === "even") return weekday >= 1 && weekday <= 5;
    return weeks.includes(Math.ceil(Number(format(day, "d")) / 7)) && weekdays.includes(weekday);
  }).map(dateInput);
}


function MonthDistributionDialog({ month, products, initialProductId, platforms, plan, plannedContent, onClose, onSetPlan, onCreateManyPlans }: { month: Date; products: Product[]; initialProductId: string; platforms: Platform[]; plan: MonthPlan; plannedContent: ContentItem[]; onClose: () => void; onSetPlan: (productId: string, platformId: string, value: number) => void; onCreateManyPlans: (data: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }>) => void }) {
  const readCounts = (productId: string) => Object.fromEntries(platforms.map((platform) => [platform.id, Number(plan.platforms?.[productId]?.[platform.id] ?? plan.platforms?.[productId]?.[platform.name] ?? 0)]));
  const [productId, setProductId] = useState(initialProductId);
  const [counts, setCounts] = useState<Record<string, number>>(() => readCounts(initialProductId));
  const [mode, setMode] = useState<"even" | "custom">("even");
  const [weeks, setWeeks] = useState([1, 2, 3, 4, 5]);
  const [weekdays, setWeekdays] = useState([1, 3, 5]);
  const product = products.find((item) => item.id === productId);
  const selectedProducts = useMemo(() => productId === ALL_PRODUCTS_ID ? products : product ? [product] : [], [product, productId, products]);
  const displayProduct = product ?? products[0];
  const pool = distributionPool(month, mode, weeks, weekdays);
  const existingByPlatform = useMemo(() => Object.fromEntries(platforms.map((platform) => {
    const count = selectedProducts.reduce((total, selectedProduct) => total + plannedContent.filter((item) => item.productId === selectedProduct.id && item.plannedPublishDate?.startsWith(monthKey(month)) && (item.plannedPlatformId === platform.id || (!item.plannedPlatformId && platformNameForContentType(item.type).trim().toLowerCase() === platform.name.trim().toLowerCase()))).length, 0);
    return [platform.id, count];
  })), [month, plannedContent, platforms, selectedProducts]);
  const totalToCreate = platforms.reduce((sum, platform) => sum + selectedProducts.reduce((productSum, selectedProduct) => {
    const existing = plannedContent.filter((item) => item.productId === selectedProduct.id && item.plannedPublishDate?.startsWith(monthKey(month)) && (item.plannedPlatformId === platform.id || (!item.plannedPlatformId && platformNameForContentType(item.type).trim().toLowerCase() === platform.name.trim().toLowerCase()))).length;
    return productSum + Math.max(0, Number(counts[platform.id] ?? 0) - existing);
  }, 0), 0);

  function selectProduct(nextProductId: string) {
    setProductId(nextProductId);
    setCounts(readCounts(nextProductId === ALL_PRODUCTS_ID ? products[0]?.id ?? "" : nextProductId));
  }

  function toggleValue(values: number[], value: number, setter: (next: number[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value].sort((a, b) => a - b));
  }

  function buildPlans() {
    if (!selectedProducts.length || !totalToCreate) return;
    const monthItems = plannedContent.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month)));
    const usedSlots = new Set(monthItems.map((item) => { const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms); return platformId && item.plannedPublishDate ? `${item.plannedPublishDate}|${platformId}:${item.type}` : null; }).filter((key): key is string => Boolean(key)));
    const usedExclusiveKeys = new Set(monthItems.filter((item) => exclusiveFormat(item.type)).map((item) => `${item.productId}|${item.plannedPublishDate}|${exclusiveFormat(item.type)}`));
    const result: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }> = [];
    selectedProducts.forEach((selectedProduct) => platforms.forEach((platform) => {
      const target = Math.max(0, Number(counts[platform.id] ?? 0));
      const existing = monthItems.filter((item) => item.productId === selectedProduct.id && (item.plannedPlatformId === platform.id || (!item.plannedPlatformId && platformNameForContentType(item.type).trim().toLowerCase() === platform.name.trim().toLowerCase()))).length;
      const remaining = Math.max(0, target - existing);
      const type = bulkChannelsForPlatform(platform)[0]?.type ?? "Другое";
      const candidates = pool.filter((date) => !usedSlots.has(`${date}|${platform.id}:${type}`) && !hasExclusiveConflict(usedExclusiveKeys, selectedProduct.id, date, type));
      candidates.slice(0, remaining).forEach((date) => {
        usedSlots.add(`${date}|${platform.id}:${type}`);
        reserveExclusiveDate(usedExclusiveKeys, selectedProduct.id, date, type);
        result.push({ title: `План · ${selectedProduct.name} · ${type}`, productId: selectedProduct.id, type, plannedPublishDate: date, plannedPlatformId: platform.id });
      });
    }));
    onCreateManyPlans(result);
    onClose();
  }

  return <Modal title={`Распределить план · ${monthLabel(month)}`} onClose={onClose} wide>
    <div className="grid gap-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Быстрое планирование</p><p className="mt-1 text-sm leading-5 text-blue-950/70">Укажите итоговое количество публикаций по соцсетям. Можно применить одинаковый план ко всем продуктам — система создаст записи в календаре и не добавит уже существующие планы повторно.</p></div>
      <Field label="Продукт"><AppSelect value={productId} onChange={selectProduct} options={[{ id: ALL_PRODUCTS_ID, label: "Все продукты" }, ...products.map((item) => ({ id: item.id, label: item.name }))]} ariaLabel="Фильтр по продукту" /></Field>
      <p className="-mt-2 text-xs text-gray-400">{productId === ALL_PRODUCTS_ID ? `Количество ниже будет задано для каждого из ${products.length} продуктов.` : `План на ${displayProduct?.name ?? "выбранный продукт"}.`}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{platforms.map((platform) => <div key={platform.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><span className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600"><span className="flex min-w-0 items-center gap-1.5 truncate"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: displayProduct ? productAccent(displayProduct) : "#2563eb" }} />{platform.name}</span><span className="text-[10px] text-gray-400">{existingByPlatform[platform.id] ?? 0} уже</span></span><div className="mt-2"><NumberField value={counts[platform.id] ?? 0} min={0} max={999} onValueChange={(value) => { setCounts((current) => ({ ...current, [platform.id]: value })); selectedProducts.forEach((selectedProduct) => onSetPlan(selectedProduct.id, platform.id, value)); }}><NumberFieldScrubArea label="План" /><NumberFieldGroup className="h-10"><NumberFieldInput aria-label={`План публикаций: ${platform.name}`} className="text-lg" /><NumberFieldDecrement /><NumberFieldIncrement /></NumberFieldGroup></NumberField></div></div>)}</div>
      <div className="grid gap-2"><p className="text-xs font-semibold text-gray-600">Как разложить по датам</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setMode("even")} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${mode === "even" ? "border-blue-300 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}><span className="font-semibold">Равномерно по будням</span><span className="mt-1 block text-xs text-gray-400">Автоматически распределит по рабочим дням месяца</span></button><button type="button" onClick={() => setMode("custom")} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${mode === "custom" ? "border-blue-300 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}><span className="font-semibold">По неделям и дням</span><span className="mt-1 block text-xs text-gray-400">Выберите недели и дни публикаций</span></button></div></div>
      {mode === "custom" && <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3"><div><p className="mb-2 text-xs font-semibold text-gray-600">Недели месяца</p><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((week) => <button type="button" key={week} onClick={() => toggleValue(weeks, week, setWeeks)} className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold ${weeks.includes(week) ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-500"}`}>{week}</button>)}</div></div><div><p className="mb-2 text-xs font-semibold text-gray-600">Дни недели</p><div className="flex flex-wrap gap-2">{DISTRIBUTION_WEEKDAYS.map((weekday) => <button type="button" key={weekday.value} onClick={() => toggleValue(weekdays, weekday.value, setWeekdays)} className={`h-9 min-w-10 rounded-lg px-2 text-xs font-semibold ${weekdays.includes(weekday.value) ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-500"}`}>{weekday.label}</button>)}</div></div></div>}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500"><span>Доступно дат: <strong className="text-gray-900">{pool.length}</strong></span><span>Будет добавлено: <strong className="text-blue-700">{totalToCreate}</strong></span></div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={buildPlans} disabled={!totalToCreate || !pool.length}>{!pool.length ? "Выберите даты" : totalToCreate ? `Распределить ${totalToCreate} публикаций` : "План уже распределен"}</Button></div>
    </div>
  </Modal>;
}

function weeklyDates(month: Date, week: number) {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).filter((day) => Math.ceil(Number(format(day, "d")) / 7) === week).map(dateInput);
}

function WeekdayScheduleDialog({ month, product, weekdays, onClose, onSave }: { month: Date; product: Product; weekdays: number[]; onClose: () => void; onSave: (weekdays: number[]) => void }) {
  const [selected, setSelected] = useState<number[]>(weekdays);
  function toggle(value: number) { setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)); }
  return <Modal title={`Дни публикаций · ${product.name}`} onClose={onClose}>
    <div className="grid gap-4"><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-blue-950"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: productAccent(product) }} /> Все форматы продукта</div><p className="mt-1 text-xs leading-5 text-blue-900/70">Эти дни будут общими для всех форматов продукта. При распределении Reels и посты автоматически разнесутся по разным датам.</p></div><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-gray-500">Дни недели</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{DISTRIBUTION_WEEKDAYS.map((weekday) => <button type="button" key={weekday.value} onClick={() => toggle(weekday.value)} className={`h-10 rounded-xl text-sm font-semibold transition ${selected.includes(weekday.value) ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}>{weekday.label}</button>)}</div></div><p className="text-xs text-gray-400">Месяц: {monthLabel(month)} · выбрано дней: {selected.length}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onSave(selected)} disabled={!selected.length}><Check size={15} /> Сохранить дни</Button></div></div>
  </Modal>;
}

function WeeklyDistributionDialog({ month, products, platforms, plan, plannedContent, onClose, onSetChannelPlan, onCreateManyPlans }: { month: Date; products: Product[]; platforms: Platform[]; plan: MonthPlan; plannedContent: ContentItem[]; onClose: () => void; onSetChannelPlan: (productId: string, channelId: string, value: number) => void; onCreateManyPlans: (data: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }>) => void }) {
  const channels = useMemo(() => platforms.flatMap(bulkChannelsForPlatform), [platforms]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(() => {
    const preferred = channels.filter((channel) => channel.type === "Reels" || channel.type === "Пост");
    return (preferred.length ? preferred : channels.slice(0, 3)).map((channel) => channel.id);
  });
  const [assignments, setAssignments] = useState<Record<number, Record<string, string[]>>>({});
  const [message, setMessage] = useState("");
  const selectedChannels = channels.filter((channel) => selectedChannelIds.includes(channel.id));
  const existingSlotKeys = useMemo(() => new Set(plannedContent.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month))).map((item) => {
    const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms);
    return platformId && item.plannedPublishDate ? `${item.plannedPublishDate}|${platformId}:${item.type}` : null;
  }).filter((key): key is string => Boolean(key))), [month, plannedContent, platforms]);
 const assignmentTotal = selectedChannels.reduce((sum, channel) => sum + [1, 2, 3, 4, 5].reduce((weekSum, week) => weekSum + (assignments[week]?.[channel.id]?.length ?? 0), 0), 0);
  const existingExclusiveKeys = useMemo(() => new Set(plannedContent.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month)) && exclusiveFormat(item.type)).map((item) => `${item.productId}|${item.plannedPublishDate}|${exclusiveFormat(item.type)}`)), [month, plannedContent]);

  function planFor(channel: BulkChannel) {
    return products.reduce((sum, product) => sum + channelPlanValue(plan, product.id, channel, platforms), 0);
  }

  function existingCount(productId: string, channel: BulkChannel) {
    return plannedContent.filter((item) => item.productId === productId && item.plannedPublishDate?.startsWith(monthKey(month)) && (item.plannedPlatformId === channel.platformId || (!item.plannedPlatformId && platformNameForContentType(item.type).trim().toLowerCase() === channel.platformName.trim().toLowerCase())) && item.type === channel.type).length;
  }

  const previewDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  const previewItems = useMemo(() => {
    const items: Array<{ date: string; productId: string; type: ContentType; title: string; isNew: boolean }> = plannedContent.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month))).map((item) => ({ date: item.plannedPublishDate!, productId: item.productId, type: item.type, title: item.title, isNew: false }));
    const usedSlots = new Set(existingSlotKeys);
    const usedExclusiveKeys = new Set(existingExclusiveKeys);
    selectedChannels.forEach((channel) => [1, 2, 3, 4, 5].forEach((week) => {
      const selectedProducts = assignments[week]?.[channel.id] ?? [];
      const dates = weeklyDates(month, week);
      selectedProducts.forEach((productId) => {
        const preferredDates = dates.filter((candidate) => channelWeekdays(plan, productId, channel.id).includes(getDay(new Date(`${candidate}T12:00:00`))));
        const date = preferredDates.find((candidate) => !usedSlots.has(`${candidate}|${channel.platformId}:${channel.type}`) && !hasExclusiveConflict(usedExclusiveKeys, productId, candidate, channel.type));
        if (!date) return;
        usedSlots.add(`${date}|${channel.platformId}:${channel.type}`);
        reserveExclusiveDate(usedExclusiveKeys, productId, date, channel.type);
        items.push({ date, productId, type: channel.type, title: `План · ${products.find((product) => product.id === productId)?.name ?? "Продукт"} · ${channel.type}`, isNew: true });
      });
    }));
    return items;
  }, [assignments, existingExclusiveKeys, existingSlotKeys, month, plan, plannedContent, products, selectedChannels]);

  function toggleChannel(channelId: string) {
    setSelectedChannelIds((current) => current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId]);
    setMessage("");
  }

  function toggleProduct(week: number, channelId: string, productId: string) {
    setAssignments((current) => {
      const selected = current[week]?.[channelId] ?? [];
      const next = selected.includes(productId) ? selected.filter((id) => id !== productId) : [...selected, productId];
      return { ...current, [week]: { ...(current[week] ?? {}), [channelId]: next } };
    });
    setMessage("");
  }

  function createWeeklyPlan() {
    if (!selectedChannels.length || !assignmentTotal) { setMessage("Выберите форматы и продукты в таблице"); return; }
    const usedSlots = new Set(existingSlotKeys);
    const usedExclusiveKeys = new Set(existingExclusiveKeys);
    const result: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }> = [];
    const conflicts: string[] = [];
    selectedChannels.forEach((channel) => {
      [1, 2, 3, 4, 5].forEach((week) => {
        const productIds = assignments[week]?.[channel.id] ?? [];
        const dates = weeklyDates(month, week);
        productIds.forEach((productId) => {
          const preferredDates = dates.filter((candidate) => channelWeekdays(plan, productId, channel.id).includes(getDay(new Date(`${candidate}T12:00:00`))));
          const date = preferredDates.find((candidate) => !usedSlots.has(`${candidate}|${channel.platformId}:${channel.type}`) && !hasExclusiveConflict(usedExclusiveKeys, productId, candidate, channel.type));
          if (!date) { conflicts.push(`Неделя ${week} · ${channel.type}: выбрано ${productIds.length}, свободных дней меньше`); return; }
          usedSlots.add(`${date}|${channel.platformId}:${channel.type}`);
          reserveExclusiveDate(usedExclusiveKeys, productId, date, channel.type);
          const product = products.find((item) => item.id === productId);
          if (product) result.push({ title: `План · ${product.name} · ${channel.type}`, productId, type: channel.type, plannedPublishDate: date, plannedPlatformId: channel.platformId });
        });
      });
    });
    if (conflicts.length) { setMessage(`Нельзя создать расписание: ${conflicts.slice(0, 2).join("; ")}. Уменьшите число продуктов в ячейке.`); return; }
    if (!result.length) { setMessage("Все выбранные записи уже есть в календаре"); return; }
    selectedChannels.forEach((channel) => products.forEach((product) => {
      const assigned = [1, 2, 3, 4, 5].reduce((sum, week) => sum + (assignments[week]?.[channel.id]?.includes(product.id) ? 1 : 0), 0);
      const target = existingCount(product.id, channel) + assigned;
      if (assigned > 0 || target > 0) onSetChannelPlan(product.id, channel.id, target);
    }));
    onCreateManyPlans(result);
    onClose();
  }

  return <Modal title={`План по неделям · ${monthLabel(month)}`} onClose={onClose} wide>
    <div className="grid gap-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Матрица публикаций</p><p className="mt-1 text-sm leading-5 text-blue-950/70">В каждой ячейке отметьте продукты, которые должны выйти в выбранном формате на этой неделе. Дни берутся из карточки продукта, а Reels и посты одного продукта автоматически разносятся по разным датам.</p></div>
      <div className="grid gap-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-gray-600">Форматы и соцсети</p><span className="text-[11px] text-gray-400">Выбрано: {selectedChannels.length}</span></div><div className="flex flex-wrap gap-2">{channels.map((channel) => <button type="button" key={channel.id} onClick={() => toggleChannel(channel.id)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${selectedChannelIds.includes(channel.id) ? "border-blue-300 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}><span className="h-2 w-2 rounded-full bg-blue-500" />{channel.type} · {channel.platformName}<span className="text-[10px] text-gray-400">{planFor(channel)}</span></button>)}</div></div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200"><table className="w-full min-w-[720px] border-collapse text-left"><thead><tr className="border-b border-gray-200 bg-gray-50"><th className="w-20 px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Неделя</th>{selectedChannels.map((channel) => <th key={channel.id} className="min-w-[190px] px-3 py-3 text-xs font-bold text-gray-700">{channel.type}<span className="mt-0.5 block text-[10px] font-normal text-gray-400">{channel.platformName} · {planFor(channel)} план</span></th>)}</tr></thead><tbody>{[1, 2, 3, 4, 5].map((week) => <tr key={week} className="border-b border-gray-100 last:border-0 align-top"><th className="px-3 py-3 text-sm font-bold text-gray-700">{week}</th>{selectedChannels.map((channel) => { const selected = assignments[week]?.[channel.id] ?? []; const capacity = weeklyDates(month, week).length; return <td key={channel.id} className="px-2 py-2"><div className={`rounded-xl border p-2 ${selected.length > capacity ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50/70"}`}><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-gray-400">{selected.length} выбрано</span><span className="text-[10px] text-gray-400">до {capacity} дней</span></div><div className="grid gap-1">{products.map((product) => <label key={product.id} className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${selected.includes(product.id) ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:bg-white/80"}`}><input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggleProduct(week, channel.id, product.id)} className="h-3.5 w-3.5 accent-blue-600" /><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: productAccent(product) }} /><span className="min-w-0 truncate">{product.name}</span></label>)}</div></div></td>; })}</tr>)}</tbody><tfoot><tr className="bg-gray-50"><th className="px-3 py-3 text-xs font-bold text-gray-600">Итого</th>{selectedChannels.map((channel) => <td key={channel.id} className="px-3 py-3 text-xs font-bold text-blue-700">{[1, 2, 3, 4, 5].reduce((sum, week) => sum + (assignments[week]?.[channel.id]?.length ?? 0), 0)} публикаций</td>)}</tr></tfoot></table></div><div className="grid gap-2 rounded-2xl border border-gray-200 bg-gray-50/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Предпросмотр календаря</p><p className="mt-1 text-xs text-gray-400">Показывает текущие планы и новые записи в реальном времени</p></div><div className="flex items-center gap-3 text-[10px] text-gray-400"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Уже в плане</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Добавится</span></div></div><div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200"><div className="contents">{DISTRIBUTION_WEEKDAYS.map((weekday) => <div key={weekday.value} className="bg-white px-1 py-1.5 text-center text-[9px] font-bold uppercase text-gray-400">{weekday.label}</div>)}</div>{previewDays.map((day) => { const date = dateInput(day); const items = previewItems.filter((item) => item.date === date); return <div key={date} className="min-h-[76px] bg-white p-1"><div className="text-[10px] font-bold text-gray-400">{format(day, "d")}</div><div className="mt-1 grid gap-0.5">{items.slice(0, 3).map((item, index) => <div key={item.date + item.productId + item.type + index} title={item.title} className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold ${item.isNew ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: products.find((product) => product.id === item.productId)?.color ?? "#2563eb" }} />{products.find((product) => product.id === item.productId)?.name ?? "Продукт"}</div>)}{items.length > 3 && <span className="text-[9px] text-gray-400">+{items.length - 3}</span>}</div></div>; })}</div></div>
      {message && <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">{message}</p>}
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-gray-400">Всего в расписании: <strong className="text-gray-700">{assignmentTotal}</strong> публикаций</p><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={createWeeklyPlan} disabled={!selectedChannels.length || !assignmentTotal}><CalendarDays size={15} /> Распределить по календарю</Button></div></div>
    </div>
  </Modal>;
}

function DistributionEngineDialog({ month, products, platforms, plan, plannedContent, publications, onClose, onCreateManyPlans, onUpdateContent, onDeleteContent }: { month: Date; products: Product[]; platforms: Platform[]; plan: MonthPlan; plannedContent: ContentItem[]; publications: AppState["publications"]; onClose: () => void; onCreateManyPlans: (data: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }>) => void; onUpdateContent: (contentId: string, patch: Partial<ContentItem>) => void; onDeleteContent: (contentId: string) => void }) {
  const channels = useMemo(() => platforms.flatMap(bulkChannelsForPlatform), [platforms]);
  const [workingWeekdays, setWorkingWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showReasons, setShowReasons] = useState(false);
  const [rebuildCurrentPlans, setRebuildCurrentPlans] = useState(false);
  const monthValue = monthKey(month);
  const series = useMemo<DistributionSeries[]>(() => products.flatMap((product) => channels.flatMap((channel) => {
    const monthlyCount = channelPlanValue(plan, product.id, channel, platforms);
    if (monthlyCount <= 0) return [] as DistributionSeries[];
    const weekdays = productWeekdays(plan, product.id);
    return [{ id: `${product.id}|${channel.id}`, productId: product.id, productName: product.name, channelId: channel.id, platformId: channel.platformId, platformName: channel.platformName, format: channel.type, monthlyCount, preferredWeekdays: weekdays, allowedWeekdays: weekdays, priority: 3, minGapDays: channel.type === "Threads" ? undefined : monthlyCount > 1 ? 2 : undefined, maxPerDay: channel.type === "Threads" ? 1 : channel.type === "Stories" ? 2 : 1, dailyResourceKey: channel.type === "Reels" ? `instagram:${instagramAccountKey(product)}` : undefined, dailyResourceLimit: channel.type === "Reels" ? 1 : undefined } satisfies DistributionSeries];
  })), [channels, plan, platforms, products]);
  const existing = useMemo<DistributionExisting[]>(() => {
    const contentById = new Map(plannedContent.map((item) => [item.id, item]));
    const publishedContentPlatforms = new Set(publications.map((publication) => `${publication.contentId}|${publication.platformId}`));
    const result: DistributionExisting[] = [];
    publications.forEach((publication) => {
      const content = contentById.get(publication.contentId);
      if (!content) return;
      const channel = channels.find((item) => item.platformId === publication.platformId && item.type === content.type);
      if (!channel) return;
      result.push({ id: `fact-${publication.id}`, seriesId: `${content.productId}|${channel.id}`, productId: content.productId, channelId: channel.id, platformId: channel.platformId, platformName: channel.platformName, format: channel.type, date: publication.date, status: "published", source: "published" });
    });
    plannedContent.forEach((item) => {
      if (!item.plannedPublishDate) return;
      const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms);
      const channel = channels.find((entry) => entry.platformId === platformId && entry.type === item.type);
      if (!channel || publishedContentPlatforms.has(`${item.id}|${channel.platformId}`)) return;
      result.push({ id: `plan-${item.id}`, seriesId: `${item.productId}|${channel.id}`, productId: item.productId, channelId: channel.id, platformId: channel.platformId, platformName: channel.platformName, format: channel.type, date: item.plannedPublishDate, status: item.status, source: item.status === "published" ? "published" : "planned" });
    });
    return result;
  }, [channels, plannedContent, platforms, publications]);
  const publishedContentIds = useMemo(() => new Set(publications.map((publication) => publication.contentId)), [publications]);
  const seriesIds = useMemo(() => new Set(series.map((item) => item.id)), [series]);
  const reassignablePlans = useMemo(() => plannedContent.filter((item) => {
    if (!item.plannedPublishDate?.startsWith(monthValue) || item.status === "published" || publishedContentIds.has(item.id)) return false;
    const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms);
    const channel = channels.find((entry) => entry.platformId === platformId && entry.type === item.type);
    return Boolean(channel && seriesIds.has(`${item.productId}|${channel.id}`));
  }), [channels, monthValue, plannedContent, platforms, publishedContentIds, seriesIds]);
  const reassignableIds = useMemo(() => new Set(reassignablePlans.map((item) => item.id)), [reassignablePlans]);
  const existingForCalculation = useMemo(() => rebuildCurrentPlans ? existing.filter((item) => item.source !== "planned" || !item.date.startsWith(monthValue)) : existing, [existing, monthValue, rebuildCurrentPlans]);
  const result = useMemo(() => distributeContent({ targetMonth: monthValue, plans: series, existing: existingForCalculation, workingWeekdays, excludedDates: [], includedDates: [], maxPublicationsPerDay: 8, maxDailyLoad: 14, contextBeforeDays: 31, contextAfterDays: 31 }), [existingForCalculation, monthValue, series, workingWeekdays]);
  const previewDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  const previewItems = useMemo(() => {
    const current = plannedContent.filter((item) => item.plannedPublishDate?.startsWith(monthValue) && !(rebuildCurrentPlans && reassignableIds.has(item.id))).map((item) => ({ date: item.plannedPublishDate!, productId: item.productId, type: item.type, title: item.title, isNew: false }));
    const created = result.placements.map((item) => ({ date: item.plannedDate, productId: item.productId, type: item.format as ContentType, title: `План · ${item.productName} · ${item.format}`, isNew: true }));
    return [...current, ...created];
  }, [monthValue, plannedContent, rebuildCurrentPlans, reassignableIds, result.placements]);
  function toggleWeekday(value: number) { setWorkingWeekdays((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)); }
  function commit() {
    if (!rebuildCurrentPlans) {
      if (!result.placements.length) return;
      onCreateManyPlans(result.placements.map((item) => ({ title: `План · ${item.productName} · ${item.format}`, productId: item.productId, type: item.format as ContentType, plannedPublishDate: item.plannedDate, plannedPlatformId: item.platformId })));
      onClose();
      return;
    }
    const oldBySeries = new Map<string, ContentItem[]>();
    reassignablePlans.forEach((item) => {
      const platformId = item.plannedPlatformId ?? platformIdForContentType(item.type, platforms);
      const channel = channels.find((entry) => entry.platformId === platformId && entry.type === item.type);
      if (!channel) return;
      const id = `${item.productId}|${channel.id}`;
      oldBySeries.set(id, [...(oldBySeries.get(id) ?? []), item]);
    });
    const newBySeries = new Map<string, typeof result.placements>();
    result.placements.forEach((item) => newBySeries.set(item.seriesId, [...(newBySeries.get(item.seriesId) ?? []), item]));
    const additions: Array<{ title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }> = [];
    new Set([...oldBySeries.keys(), ...newBySeries.keys()]).forEach((seriesId) => {
      const oldItems = (oldBySeries.get(seriesId) ?? []).sort((a, b) => (a.plannedPublishDate ?? "").localeCompare(b.plannedPublishDate ?? ""));
      const newItems = (newBySeries.get(seriesId) ?? []).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
      const reused = Math.min(oldItems.length, newItems.length);
      for (let index = 0; index < reused; index += 1) {
        if (oldItems[index].plannedPublishDate !== newItems[index].plannedDate) onUpdateContent(oldItems[index].id, { plannedPublishDate: newItems[index].plannedDate });
      }
      oldItems.slice(reused).forEach((item) => onDeleteContent(item.id));
      newItems.slice(reused).forEach((item) => additions.push({ title: `План · ${item.productName} · ${item.format}`, productId: item.productId, type: item.format as ContentType, plannedPublishDate: item.plannedDate, plannedPlatformId: item.platformId }));
    });
    if (additions.length) onCreateManyPlans(additions);
    onClose();
  }
  return <Modal title={`Умное распределение · ${monthLabel(month)}`} onClose={onClose} wide>
    <div className="grid gap-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Автораспределение публикаций</p><p className="mt-1 text-sm leading-5 text-blue-950/70">{rebuildCurrentPlans ? "Пересоберите черновое распределение по выбранным рабочим дням и ограничениям карточек. Уже опубликованный факт останется на месте." : "Задайте объём в карточках — система добавит недостающие публикации, сохранив факт и существующие даты."} В обоих режимах сохраняется разнос Reels и постов одного продукта по разным датам.</p></div>
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:items-start"><Field label="Режим распределения"><label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm font-semibold text-blue-950"><input type="checkbox" checked={rebuildCurrentPlans} onChange={(event) => setRebuildCurrentPlans(event.target.checked)} className="h-4 w-4 accent-blue-600" />Пересобрать уже распределённый план</label><p className="mt-1.5 text-[11px] leading-4 text-gray-500">Перемещаются только черновые планы этого месяца. Опубликованное и планы других месяцев сохраняются.</p></Field><div><p className="mb-1.5 text-xs font-semibold text-gray-500">Рабочие дни</p><div className="flex flex-wrap gap-1.5">{DISTRIBUTION_WEEKDAYS.map((weekday) => <button type="button" key={weekday.value} onClick={() => toggleWeekday(weekday.value)} className={`h-9 min-w-10 rounded-lg px-2 text-xs font-semibold transition ${workingWeekdays.includes(weekday.value) ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}>{weekday.label}</button>)}</div><p className="mt-1.5 text-[11px] text-gray-400">Распределение учитывает выбранные рабочие дни и дни выхода продукта.</p></div></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-blue-50 px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">{rebuildCurrentPlans ? "В новом плане" : "К добавлению"}</span><strong className="mt-1 block text-xl text-blue-950">{result.metrics.createdTotal}</strong></div><div className="rounded-xl bg-gray-50 px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-wide text-gray-500">Осталось</span><strong className="mt-1 block text-xl text-gray-900">{result.metrics.remainingTotal}</strong></div><div className="rounded-xl bg-emerald-50 px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">Равномерность</span><strong className="mt-1 block text-xl text-emerald-950">{result.metrics.uniformity}%</strong></div><div className="rounded-xl bg-amber-50 px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-wide text-amber-700">Конфликты</span><strong className="mt-1 block text-xl text-amber-950">{result.metrics.conflicts}</strong></div></div>
      <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Предпросмотр календаря</p><p className="mt-1 text-xs text-gray-400">Синие записи добавятся после подтверждения.</p></div><span className="text-xs font-semibold text-gray-500">{series.length} серий</span></div><div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200"><div className="contents">{DISTRIBUTION_WEEKDAYS.map((weekday) => <div key={weekday.value} className="bg-white px-1 py-1.5 text-center text-[9px] font-bold uppercase text-gray-400">{weekday.label}</div>)}</div>{previewDays.map((day) => { const date = dateInput(day); const items = previewItems.filter((item) => item.date === date); return <div key={date} className={`min-h-[76px] bg-white p-1 ${!isSameMonth(day, month) ? "bg-gray-50/70" : ""}`}><div className="text-[10px] font-bold text-gray-400">{format(day, "d")}</div><div className="mt-1 grid gap-0.5">{items.slice(0, 3).map((item, index) => <div key={`${item.date}|${item.productId}|${item.type}|${index}`} title={item.title} className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold ${item.isNew ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: productAccent(products.find((product) => product.id === item.productId) ?? { id: item.productId, name: item.productId, archived: false, order: 0 }) }} />{products.find((product) => product.id === item.productId)?.name ?? "Продукт"}</div>)}{items.length > 3 && <span className="text-[9px] text-gray-400">+{items.length - 3}</span>}</div></div>; })}</div></div>
      {result.warnings.length > 0 && <div className="grid gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">{result.warnings.slice(0, 3).map((warning, index) => <p key={`${warning.code}-${warning.seriesId ?? "all"}-${index}`}>{warning.message}</p>)}</div>}
      {result.placements.length > 0 && <div className="rounded-xl border border-gray-200 bg-white"><button type="button" onClick={() => setShowReasons((value) => !value)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-gray-600"><span>Почему выбраны эти даты?</span><span className="text-blue-600">{showReasons ? "Скрыть" : "Показать"}</span></button>{showReasons && <div className="grid gap-1 border-t border-gray-100 px-3 py-2.5">{result.placements.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-[11px]"><span className="min-w-0 truncate text-gray-600">{item.productName} · {item.format}</span><span className="shrink-0 font-semibold text-gray-900">{item.plannedDate.slice(-2)}.{item.plannedDate.slice(5, 7)} · {item.reason.preferredWeekday ? "предпочтительный день" : "равномерный интервал"}</span></div>)}</div>}</div>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={commit} disabled={rebuildCurrentPlans ? !result.placements.length && !reassignablePlans.length : !result.placements.length}><CalendarDays size={15} /> {rebuildCurrentPlans ? `Пересобрать план · ${result.placements.length}` : result.placements.length ? `Добавить ${result.placements.length} планов` : "Все планы уже распределены"}</Button></div>
    </div>
  </Modal>;
}

function ProductSchedulePanel({ month, product, platform, plannedContent, onClose, onCreatePlan }: { month: Date; product: Product; platform: Platform; plannedContent: ContentItem[]; onClose: () => void; onCreatePlan: (data: { title: string; productId: string; type: ContentType; plannedPublishDate: string; plannedPlatformId?: string }) => void }) {
  const options = bulkChannelsForPlatform(platform);
  const [date, setDate] = useState(dateInput(startOfMonth(month)));
  const [type, setType] = useState<ContentType>(options[0]?.type ?? "Другое");
  const [title, setTitle] = useState("");
  const monthStart = dateInput(startOfMonth(month));
  const monthEnd = dateInput(endOfMonth(month));
  const scheduled = plannedContent.filter((item) => item.productId === product.id && item.plannedPublishDate && item.plannedPublishDate >= monthStart && item.plannedPublishDate <= monthEnd && (item.plannedPlatformId === platform.id || (!item.plannedPlatformId && platformNameForContentType(item.type).trim().toLowerCase() === platform.name.trim().toLowerCase()))).sort((a, b) => (a.plannedPublishDate ?? "").localeCompare(b.plannedPublishDate ?? ""));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreatePlan({ title, productId: product.id, type, plannedPlatformId: platform.id, plannedPublishDate: date });
    setTitle("");
  }

  return <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: productAccent(product) }} /><h5 className="text-sm font-bold text-blue-950">План по дням · {platform.name}</h5></div><p className="mt-1 text-xs leading-5 text-blue-900/65">Добавляйте даты прямо здесь — запись сразу появится в календаре и будет участвовать в «Все по плану».</p></div><button type="button" aria-label="Закрыть расписание" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-blue-500 transition hover:bg-white/70"><X size={15} /></button></div><form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[150px_150px_minmax(0,1fr)_auto]"><input required type="date" min={monthStart} max={monthEnd} value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} aria-label="Дата плановой публикации" /><AppSelect value={type} onChange={(value) => setType(value as ContentType)} options={options.map((option) => ({ id: option.type, label: option.type }))} ariaLabel="Формат публикации" /><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Тема публикации — необязательно" aria-label="Тема публикации" /><Button type="submit" className="h-10 whitespace-nowrap"><Plus size={14} /> Добавить</Button></form>{scheduled.length > 0 && <div className="mt-3 grid gap-1.5 sm:grid-cols-2">{scheduled.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-2.5 py-2"><span className="shrink-0 rounded-md bg-white px-1.5 py-1 text-[10px] font-bold text-blue-700">{item.plannedPublishDate?.slice(-2)}.{item.plannedPublishDate?.slice(5, 7)}</span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">{item.title}</span><span className="shrink-0 text-[10px] text-gray-400">{item.type}</span></div>)}</div>}{scheduled.length === 0 && <p className="mt-3 text-[11px] text-blue-900/55">На этот месяц по этой соцсети дат пока нет.</p>}</div>;
}

function LegacyDirectoryModal({ kind, state, month, plan, actual, onSwitch, onAdd, onRename, onToggleArchive, onMove }: { kind: DirectoryKind; state: AppState; month: Date; plan: MonthPlan; actual: (productId: string, platformId: string) => number; onSwitch: (kind: DirectoryKind) => void; onAdd: (kind: DirectoryKind, value: string, details?: DirectoryDetails) => void; onRename: (kind: DirectoryKind, id: string, patch: DirectoryPatch) => void; onToggleArchive: (kind: DirectoryKind, id: string) => void; onMove: (kind: DirectoryKind, id: string, direction: -1 | 1) => void }) {
  void actual;
  const [value, setValue] = useState("");
  const [company, setCompany] = useState("");
  const [shortName, setShortName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagramAccountUrl, setInstagramAccountUrl] = useState("");
  const [color, setColor] = useState(REPORT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCompany, setEditingCompany] = useState("");
  const [editingShortName, setEditingShortName] = useState("");
  const [editingOwnerName, setEditingOwnerName] = useState("");
  const [editingWhatsappNumber, setEditingWhatsappNumber] = useState("");
  const [editingInstagramAccountUrl, setEditingInstagramAccountUrl] = useState("");
  const [editingColor, setEditingColor] = useState(REPORT_COLORS[0]);
  const items = [...(kind === "products" ? state.products : state.platforms)].sort((a, b) => a.order - b.order);
  const activePlatformsForOverview = state.platforms.filter((item) => !item.archived).sort((a, b) => a.order - b.order);
  const overviewChannels = activePlatformsForOverview.flatMap(bulkChannelsForPlatform);
  const factForChannel = (productId: string, channel: BulkChannel) => state.publications.filter((publication) => publication.date.startsWith(monthKey(month)) && publication.platformId === channel.platformId && state.content.find((content) => content.id === publication.contentId)?.productId === productId && state.content.find((content) => content.id === publication.contentId)?.type === channel.type).length;
  const overviewProducts = state.products.slice().sort((a, b) => a.order - b.order).map((product) => { const formats = overviewChannels.filter((channel) => channel.platformName).map((channel) => ({ id: `${product.id}:${channel.id}`, name: channel.label, platformName: channel.platformName, planned: channelPlanValue(plan, product.id, channel, activePlatformsForOverview), fact: factForChannel(product.id, channel) })); return { ...product, planned: formats.reduce((sum, item) => sum + item.planned, 0), fact: formats.reduce((sum, item) => sum + item.fact, 0), formats }; });
  const overviewPlatforms = state.platforms.slice().sort((a, b) => a.order - b.order).map((platform) => { const formats = bulkChannelsForPlatform(platform).map((channel) => ({ id: channel.id, name: channel.label, planned: state.products.reduce((sum, product) => sum + channelPlanValue(plan, product.id, channel, activePlatformsForOverview), 0), fact: state.products.reduce((sum, product) => sum + factForChannel(product.id, channel), 0) })); return { ...platform, planned: formats.reduce((sum, item) => sum + item.planned, 0), fact: formats.reduce((sum, item) => sum + item.fact, 0), formats }; });

  function resetEdit() {
    setEditingId(null);
    setEditingValue("");
    setEditingCompany("");
    setEditingShortName("");
    setEditingOwnerName("");
    setEditingWhatsappNumber("");
    setEditingInstagramAccountUrl("");
    setEditingColor(REPORT_COLORS[0]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd(kind, value, kind === "products" ? { company, shortName, ownerName, whatsappNumber, instagramAccountUrl, color } : undefined);
    setValue("");
    setCompany("");
    setShortName("");
    setOwnerName("");
    setWhatsappNumber("");
    setInstagramAccountUrl("");
    setColor(REPORT_COLORS[0]);
  }

  function beginEdit(item: Product | Platform, index: number) {
    setEditingId(item.id);
    setEditingValue(item.name);
    if (kind === "products") {
      const product = item as Product;
      setEditingCompany(product.company ?? "");
      setEditingShortName(product.shortName ?? "");
      setEditingOwnerName(product.ownerName ?? "");
      setEditingWhatsappNumber(product.whatsappNumber ?? "");
      setEditingInstagramAccountUrl(product.instagramAccountUrl ?? "");
      setEditingColor(product.color ?? productAccent(product, index));
    }
  }

  function beginEditById(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (item) beginEdit(item, items.findIndex((entry) => entry.id === itemId));
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId) onRename(kind, editingId, { name: editingValue, ...(kind === "products" ? { company: editingCompany, shortName: editingShortName, ownerName: editingOwnerName, whatsappNumber: editingWhatsappNumber, instagramAccountUrl: editingInstagramAccountUrl, color: editingColor } : {}) });
    resetEdit();
  }

  return <div className="directory-page">
    <PageHeader eyebrow="Настройки" title="Справочники" description="Управляйте продуктами, соцсетями, цветами и порядком отображения" />
    <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 max-w-sm rounded-xl border border-gray-200 bg-gray-50/70 p-3"><Label>Раздел справочника</Label><Select value={kind} onValueChange={(value) => onSwitch(value as DirectoryKind)} options={[{ id: "products", textValue: "Продукты", label: <span className="flex items-center gap-2"><Package size={14} /> Продукты</span> }, { id: "platforms", textValue: "Соцсети", label: <span className="flex items-center gap-2"><Share2 size={14} /> Соцсети</span> }]} className="mt-1"><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox><ListBox.Item id="products" textValue="Продукты"><span className="flex items-center gap-2"><Package size={14} /> Продукты</span><ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="platforms" textValue="Соцсети"><span className="flex items-center gap-2"><Share2 size={14} /> Соцсети</span><ListBox.ItemIndicator /></ListBox.Item></ListBox></Select.Popover></Select><Description>Переключайте каталог без потери введённых данных.</Description></div>
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 sm:flex-row sm:flex-wrap">
      <input className={`${inputClass} min-w-0 flex-1`} value={value} onChange={(event) => setValue(event.target.value)} placeholder={kind === "products" ? "Новый продукт" : "Новая соцсеть"} />
      {kind === "products" && <>
        <input className={`${inputClass} min-w-0 flex-1`} value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Компания — необязательно" />
        <input className={`${inputClass} w-full sm:w-24`} value={shortName} onChange={(event) => setShortName(event.target.value.slice(0, 5))} maxLength={5} placeholder="Сокращение" aria-label="Сокращение продукта" />
        <input className={`${inputClass} min-w-0 flex-1`} value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Держатель продукта" aria-label="Имя держателя продукта" />
        <input className={`${inputClass} min-w-0 flex-1`} value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="WhatsApp: +7 700 000 00 00" aria-label="WhatsApp держателя продукта" />
        <input className={`${inputClass} min-w-0 flex-1`} value={instagramAccountUrl} onChange={(event) => setInstagramAccountUrl(event.target.value)} placeholder="Instagram аккаунт — ссылка для расчёта" aria-label="Ссылка Instagram аккаунта" />
        <label title="Цвет продукта" className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-500"><input aria-label="Цвет продукта" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" /><span>Цвет</span></label>
      </>}
      <Button type="submit" className="w-full shrink-0 sm:w-auto"><Plus size={15} /> Добавить</Button>
    </form>
    <p className="mt-2 text-xs text-gray-400">Цвет используется в карточке и отчёте. Сокращение показывается в быстром меню. Имя и WhatsApp держателя превращаются в кнопку связи, а ссылка Instagram нужна только для ограничения Reels: один Reels в день на аккаунт.</p>
    <div className="mt-5"><ExampleUsage products={overviewProducts} platforms={overviewPlatforms} monthLabel={monthLabel(month)} showProductActions={kind === "products"} showPlatformActions={kind === "platforms"} onProductEdit={kind === "products" ? beginEditById : undefined} onProductArchive={kind === "products" ? (id) => onToggleArchive("products", id) : undefined} onProductMove={kind === "products" ? (id, direction) => onMove("products", id, direction) : undefined} onPlatformEdit={kind === "platforms" ? beginEditById : undefined} onPlatformArchive={kind === "platforms" ? (id) => onToggleArchive("platforms", id) : undefined} onPlatformMove={kind === "platforms" ? (id, direction) => onMove("platforms", id, direction) : undefined} /></div>
    <div className="mt-4 grid gap-2">
      {items.map((item, index) => { const product = kind === "products" ? item as Product : null; const accent = product ? productAccent(product, index) : undefined; return <div key={item.id} className={`rounded-xl border border-gray-100 p-3 ${item.archived ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-start gap-2">
          <div className="grid shrink-0"><IconButton label="Поднять" onClick={() => onMove(kind, item.id, -1)}><ArrowUp size={14} /></IconButton><IconButton label="Опустить" onClick={() => onMove(kind, item.id, 1)}><ArrowDown size={14} /></IconButton></div>
          {editingId === item.id ? <form onSubmit={saveEdit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input autoFocus value={editingValue} onChange={(event) => setEditingValue(event.target.value)} aria-label={`Название: ${item.name}`} className={`${inputClass} min-w-[10rem] flex-1`} />
            {kind === "products" && <>
               <input value={editingCompany} onChange={(event) => setEditingCompany(event.target.value)} aria-label={`Компания продукта: ${item.name}`} placeholder="Компания" className={`${inputClass} min-w-[10rem] flex-1`} />
               <input value={editingShortName} onChange={(event) => setEditingShortName(event.target.value.slice(0, 5))} maxLength={5} aria-label={`Сокращение продукта: ${item.name}`} placeholder="Сокращение" className={`${inputClass} w-24`} />
               <input value={editingOwnerName} onChange={(event) => setEditingOwnerName(event.target.value)} aria-label={`Держатель продукта: ${item.name}`} placeholder="Держатель" className={`${inputClass} min-w-[10rem] flex-1`} />
               <input value={editingWhatsappNumber} onChange={(event) => setEditingWhatsappNumber(event.target.value)} aria-label={`WhatsApp держателя: ${item.name}`} placeholder="WhatsApp" className={`${inputClass} min-w-[12rem] flex-1`} />
               <input value={editingInstagramAccountUrl} onChange={(event) => setEditingInstagramAccountUrl(event.target.value)} aria-label={`Instagram аккаунт продукта: ${item.name}`} placeholder="Ссылка Instagram аккаунта" className={`${inputClass} min-w-[12rem] flex-1`} />
               <label title="Цвет продукта" className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-500"><input aria-label="Цвет продукта" type="color" value={editingColor} onChange={(event) => setEditingColor(event.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" /><span>Цвет</span></label>
            </>}
            <Button type="submit" className="shrink-0"><Check size={15} /> Сохранить</Button>
            <Button variant="ghost" onClick={resetEdit} className="shrink-0">Отмена</Button>
          </form> : <>
            {product && <span className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: accent }} />}
            <div className="min-w-0 flex-1 basis-[8rem]"><span className="block truncate text-sm font-semibold text-gray-900">{item.name}</span>{product && <span className="mt-0.5 block truncate text-[11px] text-gray-400">{product.company?.trim() || "Компания не указана"}</span>}</div>
            <IconButton label={`Изменить ${item.name}`} onClick={() => beginEdit(item, index)}><Pencil size={14} /></IconButton>
            {item.archived && <Badge>Архив</Badge>}
            <Button variant="secondary" onClick={() => onToggleArchive(kind, item.id)} className="shrink-0">{item.archived ? <><Check size={15} /> Вернуть</> : <><Archive size={15} /> Убрать</>}</Button>
          </>}
        </div>
      </div>; })}
    </div>
    <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">Можно добавлять, изменять, убирать и менять порядок. Для продукта сохраняются компания, сокращение, цвет и служебная ссылка Instagram-аккаунта. Ссылки не показываются в календаре и отчётах.</p>
    </section>
  </div>;
}

// These legacy dialogs remain available while the newer catalog and distribution
// flows are rolled out. Keep them referenced so lint can distinguish intentional
// compatibility code from accidental dead declarations.
void [MonthDistributionDialog, WeekdayScheduleDialog, WeeklyDistributionDialog, ProductSchedulePanel, LegacyDirectoryModal];

function DirectoryCatalog({ kind, state, onSwitch, onAdd, onRename, onToggleArchive, onMove }: { kind: DirectoryKind; state: AppState; onSwitch: (kind: DirectoryKind) => void; onAdd: (kind: DirectoryKind, value: string, details?: DirectoryDetails) => void; onRename: (kind: DirectoryKind, id: string, patch: DirectoryPatch) => void; onToggleArchive: (kind: DirectoryKind, id: string) => void; onMove: (kind: DirectoryKind, id: string, direction: -1 | 1) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<DirectoryKind>(kind);
  const [value, setValue] = useState("");
  const [company, setCompany] = useState("");
  const [shortName, setShortName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [instagramAccountUrl, setInstagramAccountUrl] = useState("");
  const [color, setColor] = useState(REPORT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCompany, setEditingCompany] = useState("");
  const [editingShortName, setEditingShortName] = useState("");
  const [editingOwnerName, setEditingOwnerName] = useState("");
  const [editingWhatsappNumber, setEditingWhatsappNumber] = useState("");
  const [editingAccountUrl, setEditingAccountUrl] = useState("");
  const [editingInstagramAccountUrl, setEditingInstagramAccountUrl] = useState("");
  const [editingColor, setEditingColor] = useState(REPORT_COLORS[0]);
  const products = [...state.products].sort((a, b) => a.order - b.order);
  const platforms = [...state.platforms].sort((a, b) => a.order - b.order);
  const catalogKind = kind;

  function resetForm() {
    setValue("");
    setCompany("");
    setShortName("");
    setOwnerName("");
    setWhatsappNumber("");
    setAccountUrl("");
    setInstagramAccountUrl("");
    setColor(REPORT_COLORS[0]);
  }

  function openAdd() {
    resetForm();
    setAddKind(kind);
    setAddOpen(true);
  }

  function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd(addKind, value, addKind === "products" ? { company, shortName, ownerName, whatsappNumber, instagramAccountUrl, color } : { shortName, accountUrl, color });
    resetForm();
    setAddOpen(false);
  }

  function beginEditProduct(product: Product) {
    setEditingId(product.id);
    setEditingValue(product.name);
    setEditingCompany(product.company ?? "");
    setEditingShortName(product.shortName ?? "");
    setEditingOwnerName(product.ownerName ?? "");
    setEditingWhatsappNumber(product.whatsappNumber ?? "");
    setEditingInstagramAccountUrl(product.instagramAccountUrl ?? "");
    setEditingAccountUrl("");
    setEditingColor(product.color ?? REPORT_COLORS[0]);
  }

  function beginEditPlatform(platform: Platform) {
    setEditingId(platform.id);
    setEditingValue(platform.name);
    setEditingCompany("");
    setEditingShortName(platform.shortName ?? "");
    setEditingOwnerName("");
    setEditingWhatsappNumber("");
    setEditingInstagramAccountUrl("");
    setEditingAccountUrl(platform.accountUrl ?? "");
    setEditingColor(platform.color ?? REPORT_COLORS[0]);
  }

  function closeEdit() {
    setEditingId(null);
    setEditingValue("");
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    onRename(catalogKind, editingId, catalogKind === "products" ? { name: editingValue, company: editingCompany, shortName: editingShortName, ownerName: editingOwnerName, whatsappNumber: editingWhatsappNumber, instagramAccountUrl: editingInstagramAccountUrl, color: editingColor } : { name: editingValue, shortName: editingShortName, accountUrl: editingAccountUrl, color: editingColor });
    closeEdit();
  }

  const directoryOptions: AppSelectOption[] = [{ id: "products", label: <span className="flex items-center gap-2"><Package size={14} /> Продукты</span>, textValue: "Продукты" }, { id: "platforms", label: <span className="flex items-center gap-2"><Share2 size={14} /> Соцсети</span>, textValue: "Соцсети" }];
  const addOptions: AppSelectOption[] = [{ id: "products", label: <span className="flex items-center gap-2"><Package size={14} /> Продукт</span>, textValue: "Продукт" }, { id: "platforms", label: <span className="flex items-center gap-2"><Share2 size={14} /> Соцсеть</span>, textValue: "Соцсеть" }];

  return <div className="directory-page">

    <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0 sm:max-w-sm"><Label>Каталог</Label><AppSelect value={kind} onChange={(value) => onSwitch(value as DirectoryKind)} options={directoryOptions} ariaLabel="Выберите каталог" className="mt-1" /><Description>Выберите продукты или соцсети. Поля сохраняются в карточке.</Description></div><div className="flex items-center gap-2"><div className="text-xs text-gray-400">{kind === "products" ? `${products.length} продуктов` : `${platforms.length} соцсетей`}</div><Button onClick={openAdd}><Plus size={15} /> Добавить</Button></div></div>
      <div className="mt-5"><ExampleUsage products={kind === "products" ? products : []} platforms={kind === "platforms" ? platforms : []} onProductEdit={(id) => { const product = products.find((item) => item.id === id); if (product) beginEditProduct(product); }} onProductArchive={(id) => onToggleArchive("products", id)} onProductMove={(id, direction) => onMove("products", id, direction)} onPlatformEdit={(id) => { const platform = platforms.find((item) => item.id === id); if (platform) beginEditPlatform(platform); }} onPlatformArchive={(id) => onToggleArchive("platforms", id)} onPlatformMove={(id, direction) => onMove("platforms", id, direction)} /></div>
    </section>
    {addOpen && <Modal title="Добавить в справочник" onClose={() => setAddOpen(false)}><form onSubmit={submitAdd} className="grid gap-3"><Field label="Что добавить"><AppSelect value={addKind} onChange={(value) => setAddKind(value as DirectoryKind)} options={addOptions} ariaLabel="Тип записи" /></Field><Field label={addKind === "products" ? "Название продукта" : "Название соцсети"}><input required autoFocus value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} placeholder={addKind === "products" ? "Например, Технадзор" : "Например, Instagram"} /></Field><Field label="Сокращение"><input value={shortName} onChange={(event) => setShortName(event.target.value.slice(0, 5))} maxLength={5} className={inputClass} placeholder="До 5 символов" /></Field>{addKind === "products" ? <><Field label="Компания"><input value={company} onChange={(event) => setCompany(event.target.value)} className={inputClass} placeholder="Название компании" /></Field><Field label="Instagram аккаунт"><input value={instagramAccountUrl} onChange={(event) => setInstagramAccountUrl(event.target.value)} className={inputClass} placeholder="https://instagram.com/..." /></Field><Field label="Владелец продукта"><input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={inputClass} placeholder="Имя держателя" /></Field><Field label="WhatsApp владельца"><input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} className={inputClass} placeholder="77057495634" /></Field></> : <Field label="Ссылка на аккаунт"><input value={accountUrl} onChange={(event) => setAccountUrl(event.target.value)} className={inputClass} placeholder="https://..." /></Field>}<label className="flex h-10 items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600"><span>Цвет</span><input aria-label="Цвет записи" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setAddOpen(false)}>Отмена</Button><Button type="submit"><Plus size={15} /> Добавить</Button></div></form></Modal>}
    {editingId && <Modal title={catalogKind === "products" ? "Изменить продукт" : "Изменить соцсеть"} onClose={closeEdit}><form onSubmit={saveEdit} className="grid gap-3"><Field label="Название"><input required autoFocus value={editingValue} onChange={(event) => setEditingValue(event.target.value)} className={inputClass} /></Field><Field label="Сокращение"><input value={editingShortName} onChange={(event) => setEditingShortName(event.target.value.slice(0, 5))} maxLength={5} className={inputClass} placeholder="До 5 символов" /></Field>{catalogKind === "products" ? <><Field label="Компания"><input value={editingCompany} onChange={(event) => setEditingCompany(event.target.value)} className={inputClass} /></Field><Field label="Instagram аккаунт"><input value={editingInstagramAccountUrl} onChange={(event) => setEditingInstagramAccountUrl(event.target.value)} className={inputClass} placeholder="https://instagram.com/..." /></Field><Field label="Владелец продукта"><input value={editingOwnerName} onChange={(event) => setEditingOwnerName(event.target.value)} className={inputClass} /></Field><Field label="WhatsApp владельца"><input value={editingWhatsappNumber} onChange={(event) => setEditingWhatsappNumber(event.target.value)} className={inputClass} /></Field></> : <Field label="Ссылка на аккаунт"><input value={editingAccountUrl} onChange={(event) => setEditingAccountUrl(event.target.value)} className={inputClass} placeholder="https://..." /></Field>}<label className="flex h-10 items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600"><span>Цвет</span><input aria-label="Цвет записи" type="color" value={editingColor} onChange={(event) => setEditingColor(event.target.value)} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={closeEdit}>Отмена</Button><Button type="submit"><Check size={15} /> Сохранить</Button></div></form></Modal>}
  </div>;
}
