"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import * as XLSX from "xlsx";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Clock3,
  Download,
  Filter,
  GripVertical,
  History,
  LayoutDashboard,
  List,
  Megaphone,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Timer,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { cloneDemoState, getOrCreatePlan } from "../lib/demo-data";
import {
  ACTIVITY_TYPES,
  AppState,
  CONTENT_TYPES,
  ContentItem,
  ContentStatus,
  ContentType,
  KANBAN_COLUMNS,
  ActivityType,
} from "../lib/types";

type View = "dashboard" | "today" | "content" | "calendar" | "plan" | "history" | "settings";
type Dialog = "content" | "activity" | "publication" | "detail" | null;

const STORAGE_KEY = "content-plan-fact-local-v1";
const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Главная", icon: LayoutDashboard },
  { id: "today", label: "Сегодня", icon: Sparkles },
  { id: "content", label: "Контент", icon: Video },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "plan", label: "План факт", icon: BarChart3 },
  { id: "history", label: "История", icon: History },
  { id: "settings", label: "Настройки", icon: Settings },
];

const statusLabel: Record<ContentStatus, string> = {
  approval: "Согласование",
  shoot: "Съемка",
  shot: "Отснято",
  editing: "Монтаж",
  published: "Выложено",
};

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function prettyMonth(date: Date) {
  const label = format(date, "LLLL yyyy", { locale: ru });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return format(parseISO(value), "d MMM", { locale: ru }).replace(".", "");
}

function isVideoType(type: ContentType) {
  return ["Reels", "TikTok", "YouTube", "Shorts", "Другое"].includes(type);
}

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function displayName(state: AppState, productId: string) {
  return state.products.find((item) => item.id === productId)?.name ?? "Без продукта";
}

function Button({ children, variant = "primary", onClick, type = "button", className = "", disabled = false }: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-[#b6312a] text-white shadow-sm hover:bg-[#972821]",
    secondary: "border border-[#eadfda] bg-white text-[#403b38] hover:bg-[#fbf7f5]",
    ghost: "text-[#746d68] hover:bg-[#f8f4f1] hover:text-[#393532]",
    danger: "border border-[#f2cbc7] bg-[#fff7f6] text-[#ac2e28] hover:bg-[#fff0ee]",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function IconButton({ label, children, onClick, className = "" }: { label: string; children: ReactNode; onClick?: () => void; className?: string }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#746d68] transition hover:bg-[#f7f2ef] hover:text-[#393532] ${className}`}>{children}</button>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "purple" }) {
  const tones = {
    neutral: "bg-[#f5f2ef] text-[#736b65]",
    accent: "bg-[#f8e7e4] text-[#a53028]",
    success: "bg-[#e9f6f0] text-[#22744a]",
    warning: "bg-[#fff4e5] text-[#9a5b05]",
    purple: "bg-[#f2ecff] text-[#6f49a8]",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "success" | "warning" }) {
  const colors = { accent: "bg-[#b6312a]", success: "bg-[#3b8f60]", warning: "bg-[#d28b2e]" };
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eee8e4]"><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#251c18]/35 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee7e2] bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-[#292523]">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 text-sm ${className}`}><span className="text-xs font-medium text-[#746d68]">{label}</span>{children}</label>;
}

const inputClass = "h-10 rounded-lg border border-[#e8dfda] bg-white px-3 text-sm text-[#322e2b] outline-none transition placeholder:text-[#b1a9a3] focus:border-[#b6312a] focus:ring-2 focus:ring-[#b6312a]/10";

function DraggableCard({ item, state, onOpen }: { item: ContentItem; state: AppState; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `card:${item.id}` });
  const product = displayName(state, item.productId);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} {...attributes} onClick={() => onOpen(item.id)} className={`group cursor-pointer rounded-xl border border-[#ece4df] bg-white p-3 shadow-[0_2px_10px_rgba(49,32,23,.03)] transition hover:-translate-y-0.5 hover:border-[#d9c1bc] hover:shadow-md ${isDragging ? "opacity-50" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <Badge tone="accent">{product}</Badge>
        <button type="button" {...listeners} onClick={(event) => event.stopPropagation()} className="cursor-grab text-[#b5aba4] opacity-0 transition group-hover:opacity-100" aria-label="Переместить карточку"><GripVertical size={16} /></button>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#322e2b]">{item.title}</p>
      <div className="mt-3 flex flex-wrap gap-1.5"><Badge>{item.type}</Badge>{item.coauthors.length > 0 && <Badge tone="purple"><Users size={11} className="mr-1" />{item.coauthors.length}</Badge>}</div>
      <div className="mt-3 grid gap-1 text-[11px] text-[#857b74]">
        {item.plannedShootDate && <span className={item.plannedShootDate < toDateInput(new Date()) && item.status !== "shot" && item.status !== "published" ? "text-[#b6312a]" : ""}>Съемка · {formatDate(item.plannedShootDate)}</span>}
        {item.plannedPublishDate && <span className={item.plannedPublishDate < toDateInput(new Date()) && item.status !== "published" ? "text-[#b6312a]" : ""}>Публикация · {formatDate(item.plannedPublishDate)}</span>}
      </div>
    </div>
  );
}

function DropColumn({ id: columnId, children }: { id: ContentStatus; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${columnId}` });
  return <div ref={setNodeRef} className={`min-h-[360px] rounded-xl p-2 transition ${isOver ? "bg-[#f9ece9] ring-2 ring-inset ring-[#b6312a]/20" : "bg-[#f8f6f4]"}`}>{children}</div>;
}

export default function ContentPlanFactApp() {
  const [state, setState] = useState<AppState>(() => cloneDemoState());
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [month, setMonth] = useState(new Date(2026, 8, 15));
  const [dialog, setDialog] = useState<Dialog>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const currentMonth = monthKey(month);
  const today = toDateInput(new Date(2026, 8, 15));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setState(JSON.parse(stored) as AppState); } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeProducts = useMemo(() => state.products.filter((item) => !item.archived).sort((a, b) => a.order - b.order), [state.products]);
  const activePlatforms = useMemo(() => state.platforms.filter((item) => !item.archived).sort((a, b) => a.order - b.order), [state.platforms]);
  const plan = useMemo(() => getOrCreatePlan(state, currentMonth), [state, currentMonth]);
  const monthPublications = useMemo(() => state.publications.filter((item) => item.date.startsWith(currentMonth)), [state.publications, currentMonth]);
  const publishedIds = useMemo(() => new Set(monthPublications.map((item) => item.contentId)), [monthPublications]);
  const monthPublishedContent = useMemo(() => state.content.filter((item) => publishedIds.has(item.id)), [state.content, publishedIds]);
  const totalPlan = Object.values(plan.totals).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalFact = monthPublishedContent.length;
  const totalMinutes = state.activities.filter((item) => item.date.startsWith(currentMonth)).reduce((sum, item) => sum + item.minutes, 0);
  const elapsed = Math.min(new Date().getMonth() === month.getMonth() && new Date().getFullYear() === month.getFullYear() ? new Date().getDate() / getDaysInMonth(month) : 1, 1);

  function notify(message: string) { setToast(message); }

  function openView(next: View) {
    setView(next);
    setMobileMenu(false);
  }

  function updateStatus(contentId: string, status: ContentStatus) {
    setState((prev) => ({ ...prev, content: prev.content.map((item) => item.id === contentId ? { ...item, status, actualPublishDate: status === "published" ? item.actualPublishDate ?? today : item.actualPublishDate, actualShootDate: status === "shot" ? item.actualShootDate ?? today : item.actualShootDate, updatedAt: today } : item) }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!activeId.startsWith("card:") || !overId.startsWith("column:")) return;
    const contentId = activeId.replace("card:", "");
    const status = overId.replace("column:", "") as ContentStatus;
    updateStatus(contentId, status);
    notify(`Статус изменен: ${statusLabel[status]}`);
  }

  function createContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const coauthors = String(form.get("coauthors") ?? "").split(",").map((name) => name.trim()).filter(Boolean);
    const item: ContentItem = {
      id: id("content"),
      title,
      productId: String(form.get("productId")),
      type: String(form.get("type")) as ContentType,
      priority: String(form.get("priority")) as ContentItem["priority"],
      status: "approval",
      description: String(form.get("description") ?? ""),
      plannedPublishDate: String(form.get("plannedPublishDate") ?? "") || undefined,
      plannedShootDate: String(form.get("plannedShootDate") ?? "") || undefined,
      plannedShootTime: String(form.get("plannedShootTime") ?? "") || undefined,
      location: String(form.get("location") ?? "") || undefined,
      participants: String(form.get("participants") ?? "") || undefined,
      script: String(form.get("script") ?? "") || undefined,
      coauthors,
      createdAt: today,
      updatedAt: today,
    };
    setState((prev) => ({ ...prev, content: [item, ...prev.content] }));
    setDialog(null);
    notify("Контент создан");
  }

  function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("minutes"));
    if (!minutes || minutes < 1) return;
    const activity = { id: id("activity"), contentId: String(form.get("contentId")), date: String(form.get("date")), action: String(form.get("action")) as ActivityType, minutes, comment: String(form.get("comment") ?? "") || undefined };
    setState((prev) => ({ ...prev, activities: [activity, ...prev.activities] }));
    setDialog(null);
    notify("Работа добавлена");
  }

  function createPublication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contentId = String(form.get("contentId"));
    const platformId = String(form.get("platformId"));
    const date = String(form.get("date"));
    if (state.publications.some((item) => item.contentId === contentId && item.platformId === platformId)) {
      notify("Эта публикация уже добавлена");
      return;
    }
    const publication = { id: id("publication"), contentId, platformId, date, url: String(form.get("url") ?? "") || undefined };
    setState((prev) => ({ ...prev, publications: [publication, ...prev.publications], content: prev.content.map((item) => item.id === contentId ? { ...item, status: "published", actualPublishDate: item.actualPublishDate ?? date, updatedAt: today } : item) }));
    setDialog(null);
    notify("Публикация добавлена");
  }

  function removePublication(publicationId: string) {
    setState((prev) => ({ ...prev, publications: prev.publications.filter((item) => item.id !== publicationId) }));
    notify("Публикация удалена");
  }

  function setPlanTotal(type: string, value: number) {
    setState((prev) => ({ ...prev, plans: { ...prev.plans, [currentMonth]: { ...getOrCreatePlan(prev, currentMonth), month: currentMonth, totals: { ...getOrCreatePlan(prev, currentMonth).totals, [type]: Math.max(0, value) } } } }));
  }

  function setProductPlan(productId: string, type: string, value: number) {
    setState((prev) => {
      const existing = getOrCreatePlan(prev, currentMonth);
      return { ...prev, plans: { ...prev.plans, [currentMonth]: { ...existing, products: { ...existing.products, [productId]: { ...(existing.products[productId] ?? {}), [type]: Math.max(0, value) } } } } };
    });
  }

  function addDirectoryItem(kind: "product" | "platform", value: string) {
    const name = value.trim();
    if (!name) return;
    setState((prev) => {
      if (kind === "product") {
        if (prev.products.some((item) => item.name.toLowerCase() === name.toLowerCase())) return prev;
        return { ...prev, products: [...prev.products, { id: id("product"), name, archived: false, order: prev.products.length }] };
      }
      if (prev.platforms.some((item) => item.name.toLowerCase() === name.toLowerCase())) return prev;
      return { ...prev, platforms: [...prev.platforms, { id: id("platform"), name, archived: false, order: prev.platforms.length }] };
    });
    notify(`${kind === "product" ? "Продукт" : "Площадка"} добавлена`);
  }

  function toggleArchive(kind: "product" | "platform", itemId: string) {
    setState((prev) => kind === "product" ? { ...prev, products: prev.products.map((item) => item.id === itemId ? { ...item, archived: !item.archived } : item) } : { ...prev, platforms: prev.platforms.map((item) => item.id === itemId ? { ...item, archived: !item.archived } : item) });
  }

  function exportReport() {
    const workbook = XLSX.utils.book_new();
    const typeRows = Object.entries(plan.totals).map(([type, total]) => {
      const fact = monthPublishedContent.filter((item) => item.type === type).length;
      return { Контент: type, План: total, Факт: fact, "Ожидаемый факт": Math.round(Number(total) * elapsed * 10) / 10, Отклонение: fact - Number(total) * elapsed, Осталось: Math.max(Number(total) - fact, 0), Выполнение: `${pct(fact, Number(total))}%` };
    });
    const productRows = activeProducts.map((product) => {
      const productContent = monthPublishedContent.filter((item) => item.productId === product.id);
      const productPlan = plan.products[product.id] ?? {};
      return { Продукт: product.name, "Reels план": productPlan.Reels ?? 0, "Reels факт": productContent.filter((item) => item.type === "Reels").length, "Пост план": productPlan.Пост ?? 0, "Пост факт": productContent.filter((item) => item.type === "Пост").length };
    });
    const platformRows = activePlatforms.map((platform) => ({ Площадка: platform.name, Публикации: monthPublications.filter((item) => item.platformId === platform.id).length }));
    const activityRows = state.activities.filter((item) => item.date.startsWith(currentMonth)).map((item) => ({ Дата: item.date, Продукт: displayName(state, state.content.find((content) => content.id === item.contentId)?.productId ?? ""), Контент: state.content.find((content) => content.id === item.contentId)?.title ?? "—", Действие: item.action, Время: formatMinutes(item.minutes) }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Месяц: prettyMonth(month), "Общий план": totalPlan, "Общий факт": totalFact, "Процент выполнения": `${pct(totalFact, totalPlan)}%`, "Затраченные часы": Math.round(totalMinutes / 6) / 10 }]), "Итоги");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(typeRows), "План факт");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows), "По продуктам");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(platformRows), "По площадкам");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityRows), "Выполненные работы");
    XLSX.writeFile(workbook, `контент-план-факт-${currentMonth}.xlsx`);
    notify("Отчет экспортирован");
  }

  const detailItem = detailId ? state.content.find((item) => item.id === detailId) : undefined;

  return (
    <div className="min-h-screen bg-[#f8f6f4] text-[#322e2b]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[236px] border-r border-[#ece4df] bg-white px-3 py-4 transition-transform lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-3 pb-7 pt-1"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b6312a] text-white"><BarChart3 size={19} /></div><div><div className="text-sm font-bold tracking-tight">Контент план факт</div><div className="text-[10px] text-[#a19891]">SMM production desk</div></div></div>
        <nav className="grid gap-1">
          {NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => openView(item.id)} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${view === item.id ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#746d68] hover:bg-[#f8f4f1] hover:text-[#393532]"}`}><Icon size={17} />{item.label}</button>; })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 rounded-xl bg-[#fbf7f5] p-3"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9d2cd] text-xs font-bold text-[#8f332d]">ВЫ</div><div className="min-w-0"><p className="truncate text-xs font-semibold">Ваш профиль</p><p className="text-[10px] text-[#a19891]">Администратор</p></div><MoreHorizontal size={16} className="ml-auto text-[#a19891]" /></div></div>
      </aside>

      <main className="min-h-screen lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-[#ece4df]/80 bg-[#f8f6f4]/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3"><div className="flex items-center gap-3"><IconButton label="Меню" onClick={() => setMobileMenu(true)} className="lg:hidden"><Menu size={19} /></IconButton><div><p className="text-xs font-medium text-[#a19891]">Рабочий центр</p><h1 className="text-lg font-bold tracking-tight text-[#292523]">{NAV_ITEMS.find((item) => item.id === view)?.label}</h1></div></div><div className="flex items-center gap-2"><Button variant="secondary" onClick={() => setDialog("publication")} className="hidden sm:inline-flex"><Megaphone size={16} /> Добавить публикацию</Button><Button onClick={() => setDialog("content")}><Plus size={16} /> <span className="hidden sm:inline">Создать контент</span><span className="sm:hidden">Создать</span></Button></div></div></header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {view === "dashboard" && <Dashboard state={state} month={month} setMonth={setMonth} plan={plan} publishedContent={monthPublishedContent} publications={monthPublications} totalPlan={totalPlan} totalFact={totalFact} totalMinutes={totalMinutes} elapsed={elapsed} activeProducts={activeProducts} onOpen={(idValue) => { setDetailId(idValue); setDialog("detail"); }} onView={openView} />}
          {view === "today" && <Today state={state} today={today} onAddActivity={() => setDialog("activity")} onAddPublication={() => setDialog("publication")} onOpen={(idValue) => { setDetailId(idValue); setDialog("detail"); }} />}
          {view === "content" && <ContentView state={state} activeProducts={activeProducts} onOpen={(idValue) => { setDetailId(idValue); setDialog("detail"); }} onCreate={() => setDialog("content")} onDragEnd={handleDragEnd} />}
          {view === "calendar" && <CalendarView state={state} month={month} setMonth={setMonth} onOpen={(idValue) => { setDetailId(idValue); setDialog("detail"); }} onCreate={() => setDialog("content")} />}
          {view === "plan" && <PlanFact month={month} setMonth={setMonth} plan={plan} publishedContent={monthPublishedContent} publications={monthPublications} totalPlan={totalPlan} totalFact={totalFact} elapsed={elapsed} activeProducts={activeProducts} activePlatforms={activePlatforms} onSetTotal={setPlanTotal} onSetProductPlan={setProductPlan} onExport={exportReport} />}
          {view === "history" && <HistoryView state={state} month={month} totalMinutes={totalMinutes} />}
          {view === "settings" && <SettingsView state={state} onAdd={addDirectoryItem} onToggleArchive={toggleArchive} />}
        </div>
      </main>

      {dialog === "content" && <ContentDialog activeProducts={activeProducts} onClose={() => setDialog(null)} onSubmit={createContent} />}
      {dialog === "activity" && <ActivityDialog state={state} today={today} onClose={() => setDialog(null)} onSubmit={createActivity} />}
      {dialog === "publication" && <PublicationDialog state={state} today={today} onClose={() => setDialog(null)} onSubmit={createPublication} />}
      {dialog === "detail" && detailItem && <DetailDialog state={state} item={detailItem} onClose={() => setDialog(null)} onStatusChange={(next) => updateStatus(detailItem.id, next)} onAddPublication={() => setDialog("publication")} onRemovePublication={removePublication} />}
      {toast && <div className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#292523] px-4 py-3 text-sm font-medium text-white shadow-xl"><CircleCheck size={16} className="text-[#85d3a4]" />{toast}</div>}
    </div>
  );
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#b6312a]">{eyebrow}</p>}<h2 className="text-2xl font-bold tracking-tight text-[#292523]">{title}</h2>{description && <p className="mt-1 text-sm text-[#857b74]">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}

function MonthSwitcher({ month, setMonth }: { month: Date; setMonth: (value: Date) => void }) {
  return <div className="flex items-center gap-1 rounded-lg border border-[#e8dfda] bg-white p-1"><IconButton label="Предыдущий месяц" onClick={() => setMonth(subMonths(month, 1))}><ArrowLeft size={16} /></IconButton><span className="min-w-[118px] text-center text-sm font-semibold">{prettyMonth(month)}</span><IconButton label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}><ArrowRight size={16} /></IconButton></div>;
}

function Dashboard({ state, month, setMonth, plan, publishedContent, publications, totalPlan, totalFact, totalMinutes, elapsed, activeProducts, onOpen, onView }: { state: AppState; month: Date; setMonth: (value: Date) => void; plan: ReturnType<typeof getOrCreatePlan>; publishedContent: ContentItem[]; publications: AppState["publications"]; totalPlan: number; totalFact: number; totalMinutes: number; elapsed: number; activeProducts: AppState["products"]; onOpen: (id: string) => void; onView: (view: View) => void }) {
  const today = toDateInput(new Date(2026, 8, 15));
  const factByType = (type: string) => publishedContent.filter((item) => item.type === type).length;
  const monthItems = state.content.filter((item) => item.plannedPublishDate?.startsWith(monthKey(month)) || item.plannedShootDate?.startsWith(monthKey(month)));
  const overdue = monthItems.filter((item) => (item.plannedPublishDate && item.plannedPublishDate < toDateInput(new Date()) && item.status !== "published") || (item.plannedShootDate && item.plannedShootDate < toDateInput(new Date()) && !["shot", "published"].includes(item.status)));
  const pipeline = KANBAN_COLUMNS.map((column) => ({ ...column, count: state.content.filter((item) => item.status === column.id).length }));
  const types = ["Reels", "Пост", "Threads", "TikTok", "LinkedIn", "YouTube"];
  return <div>
    <PageHeader eyebrow="Обзор месяца" title="Контент план факт" description="Контроль производства, публикаций и затраченного времени" actions={<><MonthSwitcher month={month} setMonth={setMonth} /><Button variant="secondary" onClick={() => setMonth(new Date(2026, 8, 15))}>Сегодня</Button></>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Выполнение плана", value: `${pct(totalFact, totalPlan)}%`, icon: BarChart3, note: `${totalFact} из ${totalPlan} единиц` }, { label: "Опубликовано", value: totalFact, icon: Megaphone, note: `${publications.length} публикаций по площадкам` }, { label: "В работе", value: state.content.filter((item) => item.status !== "published").length, icon: Video, note: "материалов в pipeline" }, { label: "Затрачено", value: `${Math.round(totalMinutes / 6) / 10} ч`, icon: Timer, note: "за выбранный месяц" }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-xl border border-[#ece4df] bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-[#9a918b]">{item.label}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fbf0ed] text-[#b6312a]"><Icon size={16} /></span></div><div className="mt-4 text-2xl font-bold tracking-tight text-[#292523]">{item.value}</div><p className="mt-1 text-xs text-[#a19891]">{item.note}</p></div>; })}
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
      <section className="rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="План факт" action={<Button variant="ghost" onClick={() => onView("plan")}>Подробнее <ArrowRight size={15} /></Button>} /><div className="mt-4 grid gap-4 sm:grid-cols-2">{types.map((type) => { const planValue = Number(plan.totals[type] ?? 0); const fact = factByType(type); const expected = planValue * elapsed; const tone = fact + .01 >= expected ? "success" : fact + .01 >= expected * .8 ? "warning" : "accent"; return <div key={type}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{type}</span><span className="text-xs text-[#857b74]">{fact} / {planValue}<span className="ml-2 font-semibold text-[#4e4844]">{pct(fact, planValue)}%</span></span></div><ProgressBar value={pct(fact, planValue)} tone={tone} /><p className="mt-1 text-[11px] text-[#a19891]">Ожидаемо сейчас: {Math.round(expected * 10) / 10}</p></div>; })}</div></section>
      <section className="rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="Контент в работе" /><div className="mt-4 grid gap-3">{pipeline.map((item) => <div key={item.id} className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${item.id === "published" ? "bg-[#3b8f60]" : item.id === "editing" ? "bg-[#4b99c3]" : item.id === "shoot" ? "bg-[#9f70cf]" : "bg-[#d28b2e]"}`} /><span className="flex-1 text-sm text-[#5f5751]">{item.label}</span><span className="text-sm font-bold">{item.count}</span></div>)}</div><div className="mt-6 border-t border-[#eee7e2] pt-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-[#9a918b]">Ближайшее</span><Clock3 size={15} className="text-[#a19891]" /></div><div className="grid grid-cols-2 gap-2 text-xs"><MiniStat label="Съемки сегодня" value={state.content.filter((item) => item.plannedShootDate === today).length} /><MiniStat label="Публикации сегодня" value={state.publications.filter((item) => item.date === today).length} /><MiniStat label="На этой неделе" value={monthItems.filter((item) => item.plannedPublishDate && item.plannedPublishDate >= today).length} /><MiniStat label="Просрочено" value={overdue.length} danger={overdue.length > 0} /></div></div></section>
    </div>
    <section className="mt-5 rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="По продуктам" action={<Button variant="ghost" onClick={() => onView("settings")}>Настроить справочники <Settings size={15} /></Button>} /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{activeProducts.map((product) => { const productPublished = publishedContent.filter((item) => item.productId === product.id); const productPlan = plan.products[product.id] ?? {}; const productPlanTotal = Number(productPlan.Reels ?? 0) + Number(productPlan.Пост ?? 0); const productFact = productPublished.filter((item) => ["Reels", "Пост"].includes(item.type)).length; return <div key={product.id} className="rounded-lg border border-[#f0e9e5] p-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{product.name}</span><span className="text-xs font-bold text-[#b6312a]">{pct(productFact, productPlanTotal)}%</span></div><div className="mt-3 flex items-center gap-3"><ProgressBar value={pct(productFact, productPlanTotal)} /><span className="shrink-0 text-xs text-[#857b74]">{productFact} / {productPlanTotal}</span></div><p className="mt-2 text-[11px] text-[#a19891]">Reels {productPublished.filter((item) => item.type === "Reels").length}/{productPlan.Reels ?? 0} · Посты {productPublished.filter((item) => item.type === "Пост").length}/{productPlan.Пост ?? 0}</p></div>; })}</div></section>
    {overdue.length > 0 && <section className="mt-5 rounded-xl border border-[#f0d0cb] bg-[#fff9f8] p-4"><div className="flex items-start gap-3"><CircleAlert size={18} className="mt-0.5 shrink-0 text-[#b6312a]" /><div><p className="text-sm font-semibold text-[#8f2d27]">Нужного внимания: {overdue.length}</p><p className="mt-1 text-xs text-[#a35b55]">Есть просроченные съемки или публикации. Откройте контент, чтобы обновить статус.</p><div className="mt-3 flex flex-wrap gap-2">{overdue.slice(0, 3).map((item) => <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-[#8f2d27] shadow-sm ring-1 ring-[#f0d0cb]">{item.title}</button>)}</div></div></div></section>}
  </div>;
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-[.12em] text-[#766d67]">{title}</h3>{action}</div>; }
function MiniStat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <div className={`rounded-lg p-2.5 ${danger ? "bg-[#fff0ee] text-[#a53028]" : "bg-[#faf7f5] text-[#5f5751]"}`}><div className="text-[11px]">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>; }

function Today({ state, today, onAddActivity, onAddPublication, onOpen }: { state: AppState; today: string; onAddActivity: () => void; onAddPublication: () => void; onOpen: (id: string) => void }) {
  const shoots = state.content.filter((item) => item.plannedShootDate === today);
  const publications = state.content.filter((item) => item.plannedPublishDate === today);
  const activities = state.activities.filter((item) => item.date === today);
  const total = activities.reduce((sum, item) => sum + item.minutes, 0);
  return <div><PageHeader eyebrow="Рабочий день" title="Сегодня" description={format(parseISO(today), "d MMMM yyyy", { locale: ru })} actions={<><Button variant="secondary" onClick={onAddPublication}><Megaphone size={16} /> Отметить публикацию</Button><Button onClick={onAddActivity}><Plus size={16} /> Добавить работу</Button></>} /><div className="grid gap-5 xl:grid-cols-2"><section className="rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="Запланировано" /><div className="mt-4 grid gap-3">{shoots.length === 0 ? <EmptyState icon={<Video size={18} />} text="Съемок на сегодня нет" /> : shoots.map((item) => <TodayRow key={item.id} item={item} state={state} type="Съемка" onOpen={onOpen} />)}</div></section><section className="rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="К публикации" /><div className="mt-4 grid gap-3">{publications.length === 0 ? <EmptyState icon={<Megaphone size={18} />} text="Публикаций на сегодня нет" /> : publications.map((item) => <TodayRow key={item.id} item={item} state={state} type="Публикация" onOpen={onOpen} />)}</div></section></div><section className="mt-5 rounded-xl border border-[#ece4df] bg-white p-5"><div className="flex items-center justify-between"><SectionTitle title="Моя работа сегодня" /><Badge tone="accent">Всего {formatMinutes(total)}</Badge></div><div className="mt-4 grid gap-2">{activities.length === 0 ? <EmptyState icon={<Timer size={18} />} text="Пока нет отмеченной работы" /> : activities.map((activity) => { const item = state.content.find((content) => content.id === activity.contentId); return <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-[#f0e9e5] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f8e7e4] text-[#b6312a]"><Timer size={15} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item?.title ?? "Удаленный контент"}</p><p className="mt-0.5 text-xs text-[#857b74]">{activity.action}{activity.comment ? ` · ${activity.comment}` : ""}</p></div><span className="text-sm font-semibold">{formatMinutes(activity.minutes)}</span></div>; })}</div></section></div>;
}

function TodayRow({ item, state, type, onOpen }: { item: ContentItem; state: AppState; type: string; onOpen: (id: string) => void }) { return <button type="button" onClick={() => onOpen(item.id)} className="flex items-center gap-3 rounded-lg border border-[#f0e9e5] p-3 text-left transition hover:border-[#d9c1bc] hover:bg-[#fffcfb]"><div className="w-12 text-center text-xs font-bold text-[#b6312a]">{type === "Съемка" ? item.plannedShootTime ?? "—" : "Сегодня"}</div><div className="h-8 w-px bg-[#eee7e2]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-[#857b74]">{displayName(state, item.productId)} · {item.type}</p></div><ArrowRight size={16} className="text-[#b5aba4]" /></button>; }
function EmptyState({ icon, text }: { icon: ReactNode; text: string }) { return <div className="flex min-h-20 items-center justify-center gap-2 rounded-lg border border-dashed border-[#e7ddd8] px-4 text-sm text-[#a19891]"><span className="text-[#b6312a]">{icon}</span>{text}</div>; }

function ContentView({ state, activeProducts, onOpen, onCreate, onDragEnd }: { state: AppState; activeProducts: AppState["products"]; onOpen: (id: string) => void; onCreate: () => void; onDragEnd: (event: DragEndEvent) => void }) {
  const [mode, setMode] = useState<"kanban" | "list">("kanban");
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const filtered = state.content.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) && (productFilter === "all" || item.productId === productFilter) && (typeFilter === "all" || item.type === typeFilter) && (statusFilter === "all" || item.status === statusFilter) && (!selectedMonth || item.plannedPublishDate?.startsWith(selectedMonth) || item.plannedShootDate?.startsWith(selectedMonth)));
  return <div><PageHeader eyebrow="Производство" title="Контент" description={`${filtered.length} материалов в рабочем пространстве`} actions={<><div className="flex rounded-lg border border-[#e8dfda] bg-white p-1"><button type="button" onClick={() => setMode("kanban")} className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${mode === "kanban" ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#857b74]"}`}><LayoutDashboard size={13} /> Kanban</button><button type="button" onClick={() => setMode("list")} className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${mode === "list" ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#857b74]"}`}><List size={13} /> Список</button></div><Button onClick={onCreate}><Plus size={16} /> Создать</Button></>} /><div className="mb-5 flex flex-wrap items-center gap-2"><div className="relative flex-1 sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19891]" /><input className={`${inputClass} w-full pl-9`} placeholder="Поиск контента" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className={inputClass} value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option value="all">Все продукты</option>{activeProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className={inputClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Все типы</option>{CONTENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select><select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Все статусы</option>{KANBAN_COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}</select><input type="month" className={inputClass} value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /><span className="hidden items-center gap-1 text-xs text-[#a19891] sm:flex"><Filter size={13} /> Фильтры сохраняются на экране</span></div>{mode === "kanban" ? <DndContext onDragEnd={onDragEnd}><div className="grid gap-3 overflow-x-auto pb-4 md:grid-cols-2 xl:grid-cols-5">{KANBAN_COLUMNS.map((column) => <div key={column.id} className="min-w-[240px]"><div className="mb-2 flex items-center justify-between px-1"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${column.id === "published" ? "bg-[#3b8f60]" : column.id === "editing" ? "bg-[#4b99c3]" : column.id === "shoot" ? "bg-[#9f70cf]" : "bg-[#d28b2e]"}`} /><h3 className="text-xs font-bold uppercase tracking-wide text-[#766d67]">{column.label}</h3></div><span className="text-xs font-semibold text-[#a19891]">{filtered.filter((item) => item.status === column.id).length}</span></div><DropColumn id={column.id}>{filtered.filter((item) => item.status === column.id).map((item) => <DraggableCard key={item.id} item={item} state={state} onOpen={onOpen} />)}{filtered.filter((item) => item.status === column.id).length === 0 && <div className="flex h-24 items-center justify-center text-xs text-[#b2a9a3]">Перетащите сюда</div>}</DropColumn></div>)}</div></DndContext> : <div className="overflow-hidden rounded-xl border border-[#ece4df] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#eee7e2] bg-[#fcfaf9] text-xs uppercase tracking-wide text-[#9a918b]"><tr><th className="px-4 py-3">Контент</th><th className="px-4 py-3">Продукт</th><th className="px-4 py-3">Тип</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Съемка</th><th className="px-4 py-3">Публикация</th></tr></thead><tbody className="divide-y divide-[#f0e9e5]">{filtered.map((item) => <tr key={item.id} onClick={() => onOpen(item.id)} className="cursor-pointer hover:bg-[#fffcfb]"><td className="max-w-[300px] px-4 py-3 font-semibold">{item.title}</td><td className="px-4 py-3 text-[#746d68]">{displayName(state, item.productId)}</td><td className="px-4 py-3"><Badge>{item.type}</Badge></td><td className="px-4 py-3"><Badge tone={item.status === "published" ? "success" : "warning"}>{statusLabel[item.status]}</Badge></td><td className="px-4 py-3 text-[#746d68]">{formatDate(item.plannedShootDate)}</td><td className="px-4 py-3 text-[#746d68]">{formatDate(item.plannedPublishDate)}</td></tr>)}</tbody></table></div></div>}</div>;
}

function CalendarView({ state, month, setMonth, onOpen, onCreate }: { state: AppState; month: Date; setMonth: (value: Date) => void; onOpen: (id: string) => void; onCreate: () => void }) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const days = mode === "month" ? eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }) : eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(month, { weekStartsOn: 1 }) });
  const eventsForDay = (day: Date) => state.content.flatMap((item) => { const events: { id: string; label: string; itemId: string; tone: "shoot" | "publish" }[] = []; if (item.plannedShootDate === toDateInput(day)) events.push({ id: `${item.id}-shoot`, label: `Съемка · ${item.title}`, itemId: item.id, tone: "shoot" }); if (item.plannedPublishDate === toDateInput(day)) events.push({ id: `${item.id}-planned`, label: `Публикация · ${item.title}`, itemId: item.id, tone: "publish" }); state.publications.filter((publication) => publication.contentId === item.id && publication.date === toDateInput(day)).forEach((publication) => { events.push({ id: `${publication.id}-actual`, label: `Опубликовано · ${item.title}`, itemId: item.id, tone: "publish" }); }); return events; });
  return <div><PageHeader eyebrow="Планирование" title="Календарь" description="Съемки и публикации без перегруза мелкими активностями" actions={<><div className="flex rounded-lg border border-[#e8dfda] bg-white p-1"><button type="button" onClick={() => setMode("month")} className={`h-7 rounded-md px-3 text-xs font-semibold ${mode === "month" ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#857b74]"}`}>Месяц</button><button type="button" onClick={() => setMode("week")} className={`h-7 rounded-md px-3 text-xs font-semibold ${mode === "week" ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#857b74]"}`}>Неделя</button></div><MonthSwitcher month={month} setMonth={setMonth} /><Button onClick={onCreate}><Plus size={16} /> Создать</Button></>} /><div className="overflow-hidden rounded-xl border border-[#ece4df] bg-white"><div className="grid grid-cols-7 border-b border-[#eee7e2] bg-[#fcfaf9]">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <div key={day} className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-[#9a918b]">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const events = eventsForDay(day); const muted = !isSameMonth(day, month); const todayCell = isSameDay(day, new Date(2026, 8, 15)); return <div key={day.toISOString()} className={`min-h-[130px] border-b border-r border-[#f0e9e5] p-2 ${muted ? "bg-[#fcfaf9]" : "bg-white"}`}><div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${todayCell ? "bg-[#b6312a] text-white" : muted ? "text-[#c6bdb7]" : "text-[#746d68]"}`}>{format(day, "d")}</div><div className="grid gap-1">{events.slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => onOpen(event.itemId)} className={`truncate rounded px-1.5 py-1 text-left text-[10px] font-medium ${event.tone === "shoot" ? "bg-[#f2ecff] text-[#6f49a8]" : "bg-[#e9f6f0] text-[#22744a]"}`}>{event.label}</button>)}{events.length > 3 && <span className="px-1 text-[10px] text-[#a19891]">+ еще {events.length - 3}</span>}</div></div>; })}</div></div></div>;
}

function PlanFact({ month, setMonth, plan, publishedContent, publications, totalPlan, totalFact, elapsed, activeProducts, activePlatforms, onSetTotal, onSetProductPlan, onExport }: { month: Date; setMonth: (value: Date) => void; plan: ReturnType<typeof getOrCreatePlan>; publishedContent: ContentItem[]; publications: AppState["publications"]; totalPlan: number; totalFact: number; elapsed: number; activeProducts: AppState["products"]; activePlatforms: AppState["platforms"]; onSetTotal: (type: string, value: number) => void; onSetProductPlan: (productId: string, type: string, value: number) => void; onExport: () => void }) {
  const types = ["Reels", "Пост", "Threads", "TikTok", "LinkedIn", "YouTube"];
  return <div><PageHeader eyebrow="Аналитика" title="План факт" description="Редактируйте план и видите отставание относительно текущего дня" actions={<><MonthSwitcher month={month} setMonth={setMonth} /><Button variant="secondary" onClick={onExport}><Download size={16} /> XLSX отчет</Button></>} /><div className="grid gap-3 sm:grid-cols-3"><KpiMini label="Общий план" value={totalPlan} /><KpiMini label="Общий факт" value={totalFact} /><KpiMini label="Выполнение" value={`${pct(totalFact, totalPlan)}%`} /></div><section className="mt-5 overflow-hidden rounded-xl border border-[#ece4df] bg-white"><div className="flex items-center justify-between border-b border-[#eee7e2] px-5 py-4"><div><h3 className="text-sm font-bold">План и факт по контенту</h3><p className="mt-1 text-xs text-[#a19891]">Ожидаемый факт считается пропорционально прошедшим дням месяца.</p></div><Badge tone="accent">Прошло {Math.round(elapsed * 100)}%</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fcfaf9] text-xs uppercase tracking-wide text-[#9a918b]"><tr><th className="px-5 py-3">Контент</th><th className="px-5 py-3">План</th><th className="px-5 py-3">Факт</th><th className="px-5 py-3">Ожидаемо</th><th className="px-5 py-3">Отклонение</th><th className="px-5 py-3">Осталось</th><th className="px-5 py-3">Выполнение</th></tr></thead><tbody className="divide-y divide-[#f0e9e5]">{types.map((type) => { const planValue = Number(plan.totals[type] ?? 0); const fact = publishedContent.filter((item) => item.type === type).length; const expected = planValue * elapsed; const delta = fact - expected; return <tr key={type}><td className="px-5 py-3 font-semibold">{type}</td><td className="px-5 py-3"><input type="number" min="0" className="h-8 w-20 rounded-md border border-[#e8dfda] px-2 text-sm" value={planValue} onChange={(event) => onSetTotal(type, Number(event.target.value))} /></td><td className="px-5 py-3 font-semibold">{fact}</td><td className="px-5 py-3 text-[#746d68]">{Math.round(expected * 10) / 10}</td><td className={`px-5 py-3 font-semibold ${delta >= 0 ? "text-[#27784c]" : "text-[#b6312a]"}`}>{delta >= 0 ? "+" : ""}{Math.round(delta * 10) / 10}</td><td className="px-5 py-3 text-[#746d68]">{Math.max(planValue - fact, 0)}</td><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-20"><ProgressBar value={pct(fact, planValue)} tone={delta >= 0 ? "success" : "warning"} /></div><span className="text-xs font-semibold">{pct(fact, planValue)}%</span></div></td></tr>; })}</tbody></table></div></section><section className="mt-5 overflow-hidden rounded-xl border border-[#ece4df] bg-white"><div className="border-b border-[#eee7e2] px-5 py-4"><h3 className="text-sm font-bold">План факт по продуктам</h3><p className="mt-1 text-xs text-[#a19891]">План Reels и постов можно менять прямо в таблице.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#fcfaf9] text-xs uppercase tracking-wide text-[#9a918b]"><tr><th className="px-5 py-3">Продукт</th><th className="px-5 py-3">Reels план</th><th className="px-5 py-3">Reels факт</th><th className="px-5 py-3">Пост план</th><th className="px-5 py-3">Пост факт</th><th className="px-5 py-3">Выполнение</th></tr></thead><tbody className="divide-y divide-[#f0e9e5]">{activeProducts.map((product) => { const productPlan = plan.products[product.id] ?? {}; const reelsFact = publishedContent.filter((item) => item.productId === product.id && item.type === "Reels").length; const postFact = publishedContent.filter((item) => item.productId === product.id && item.type === "Пост").length; const productTotalPlan = Number(productPlan.Reels ?? 0) + Number(productPlan.Пост ?? 0); const productFact = reelsFact + postFact; return <tr key={product.id}><td className="px-5 py-3 font-semibold">{product.name}</td><td className="px-5 py-3"><input type="number" min="0" className="h-8 w-20 rounded-md border border-[#e8dfda] px-2 text-sm" value={productPlan.Reels ?? 0} onChange={(event) => onSetProductPlan(product.id, "Reels", Number(event.target.value))} /></td><td className="px-5 py-3 font-semibold">{reelsFact}</td><td className="px-5 py-3"><input type="number" min="0" className="h-8 w-20 rounded-md border border-[#e8dfda] px-2 text-sm" value={productPlan.Пост ?? 0} onChange={(event) => onSetProductPlan(product.id, "Пост", Number(event.target.value))} /></td><td className="px-5 py-3 font-semibold">{postFact}</td><td className="px-5 py-3"><Badge tone={productFact >= productTotalPlan ? "success" : "accent"}>{pct(productFact, productTotalPlan)}%</Badge></td></tr>; })}</tbody></table></div></section><section className="mt-5 rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="Публикации по площадкам" /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activePlatforms.map((platform) => { const count = publications.filter((item) => item.platformId === platform.id).length; return <div key={platform.id} className="flex items-center gap-3 rounded-lg bg-[#faf7f5] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#b6312a]"><Share2 size={15} /></div><span className="flex-1 text-sm font-medium">{platform.name}</span><span className="text-lg font-bold">{count}</span></div>; })}</div></section></div>;
}

function KpiMini({ label, value }: { label: string; value: ReactNode }) { return <div className="rounded-xl border border-[#ece4df] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#9a918b]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }

function HistoryView({ state, month, totalMinutes }: { state: AppState; month: Date; totalMinutes: number }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const activities = state.activities.filter((activity) => activity.date.startsWith(monthKey(month)) && (activity.action === actionFilter || actionFilter === "all") && (state.content.find((item) => item.id === activity.contentId)?.title.toLowerCase().includes(query.toLowerCase()) ?? false));
  const totals = ACTIVITY_TYPES.map((action) => ({ action, minutes: activities.filter((item) => item.action === action).reduce((sum, item) => sum + item.minutes, 0) })).filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(...totals.map((item) => item.minutes), 1);
  return <div><PageHeader eyebrow="Учет времени" title="История" description={`Все выполненные работы за ${prettyMonth(month)}`} actions={<Button variant="secondary" onClick={() => setQuery("")}><History size={16} /> Сбросить фильтры</Button>} /><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-xl border border-[#ece4df] bg-white p-5"><SectionTitle title="Распределение времени" /><div className="mt-5 grid gap-3">{totals.length === 0 ? <EmptyState icon={<Timer size={18} />} text="За этот период нет работ" /> : totals.map((item) => <div key={item.action}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium">{item.action}</span><span className="font-semibold">{formatMinutes(item.minutes)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#f0e9e5]"><div className="h-full rounded-full bg-[#b6312a]" style={{ width: `${(item.minutes / max) * 100}%` }} /></div></div>)}</div><div className="mt-6 border-t border-[#eee7e2] pt-4"><p className="text-xs text-[#a19891]">Всего за период</p><p className="mt-1 text-2xl font-bold">{formatMinutes(totalMinutes)}</p></div></section><section className="overflow-hidden rounded-xl border border-[#ece4df] bg-white"><div className="flex flex-wrap gap-2 border-b border-[#eee7e2] p-4"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19891]" /><input className={`${inputClass} w-full pl-9`} placeholder="Поиск по контенту" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className={inputClass} value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="all">Все действия</option>{ACTIVITY_TYPES.map((action) => <option key={action}>{action}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#fcfaf9] text-xs uppercase tracking-wide text-[#9a918b]"><tr><th className="px-4 py-3">Дата</th><th className="px-4 py-3">Контент</th><th className="px-4 py-3">Продукт</th><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Время</th></tr></thead><tbody className="divide-y divide-[#f0e9e5]">{activities.map((activity) => { const item = state.content.find((content) => content.id === activity.contentId); return <tr key={activity.id}><td className="px-4 py-3 text-[#746d68]">{formatDate(activity.date)}</td><td className="max-w-[220px] truncate px-4 py-3 font-semibold">{item?.title}</td><td className="px-4 py-3 text-[#746d68]">{item ? displayName(state, item.productId) : "—"}</td><td className="px-4 py-3"><Badge>{activity.action}</Badge></td><td className="px-4 py-3 font-semibold">{formatMinutes(activity.minutes)}</td></tr>; })}</tbody></table></div></section></div></div>;
}

function SettingsView({ state, onAdd, onToggleArchive }: { state: AppState; onAdd: (kind: "product" | "platform", value: string) => void; onToggleArchive: (kind: "product" | "platform", id: string) => void }) {
  const [tab, setTab] = useState<"products" | "platforms">("products");
  const [value, setValue] = useState("");
  const allItems = tab === "products" ? state.products : state.platforms;
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onAdd(tab === "products" ? "product" : "platform", value); setValue(""); }
  return <div><PageHeader eyebrow="Справочники" title="Настройки" description="Управляйте продуктами и площадками без изменения кода" /><div className="mb-5 flex w-fit rounded-lg border border-[#e8dfda] bg-white p-1"><button type="button" onClick={() => setTab("products")} className={`flex h-8 items-center gap-2 rounded-md px-3 text-sm font-semibold ${tab === "products" ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#857b74]"}`}><Package size={15} /> Продукты</button><button type="button" onClick={() => setTab("platforms")} className={`flex h-8 items-center gap-2 rounded-md px-3 text-sm font-semibold ${tab === "platforms" ? "bg-[#f8e7e4] text-[#a53028]" : "text-[#857b74]"}`}><Share2 size={15} /> Соцсети</button></div><section className="max-w-3xl rounded-xl border border-[#ece4df] bg-white p-5"><form onSubmit={submit} className="flex gap-2"><input className={`${inputClass} flex-1`} placeholder={tab === "products" ? "Например, Новый продукт" : "Например, Pinterest"} value={value} onChange={(event) => setValue(event.target.value)} /><Button type="submit"><Plus size={16} /> Добавить</Button></form><div className="mt-5 grid gap-2">{allItems.sort((a, b) => a.order - b.order).map((item) => <div key={item.id} className={`flex items-center gap-3 rounded-lg border p-3 ${item.archived ? "border-[#eee7e2] bg-[#fcfaf9] opacity-60" : "border-[#f0e9e5]"}`}><GripVertical size={16} className="text-[#b5aba4]" /><span className="flex-1 text-sm font-semibold">{item.name}</span>{item.archived && <Badge>Архив</Badge>}<Button variant={item.archived ? "secondary" : "danger"} onClick={() => onToggleArchive(tab === "products" ? "product" : "platform", item.id)}>{item.archived ? <><Check size={15} /> Вернуть</> : <><Archive size={15} /> Убрать</>}</Button></div>)}</div><div className="mt-5 rounded-lg bg-[#fbf7f5] p-3 text-xs leading-5 text-[#857b74]">Убранные элементы скрываются из новых форм, но сохраняются в старых публикациях, отчетах и истории.</div></section></div>;
}

function ContentDialog({ activeProducts, onClose, onSubmit }: { activeProducts: AppState["products"]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [type, setType] = useState<ContentType>("Reels");
  return <Modal title="Создать контент" onClose={onClose}><form onSubmit={onSubmit} className="grid gap-4"><Field label="Название *"><input autoFocus required name="title" className={inputClass} placeholder="Например, 5 ошибок при приемке квартиры" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Продукт *"><select required name="productId" className={inputClass}>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field><Field label="Тип контента *"><select required name="type" className={inputClass} value={type} onChange={(event) => setType(event.target.value as ContentType)}>{CONTENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Приоритет"><select name="priority" className={inputClass}><option value="medium">Средний</option><option value="high">Высокий</option><option value="low">Низкий</option></select></Field><Field label="Плановая дата публикации"><input name="plannedPublishDate" type="date" className={inputClass} /></Field></div><div className="rounded-lg bg-[#fbf7f5] p-3 text-xs leading-5 text-[#857b74]">Сначала достаточно названия, продукта, типа и плановой даты. Остальные детали можно добавить в карточке позже.</div>{isVideoType(type) && <div className="grid gap-4 rounded-xl border border-[#eee7e2] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#9a918b]">Параметры съемки · необязательно</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Плановая дата съемки"><input name="plannedShootDate" type="date" className={inputClass} /></Field><Field label="Время"><input name="plannedShootTime" type="time" className={inputClass} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Локация"><input name="location" className={inputClass} placeholder="Офис или адрес" /></Field><Field label="Участники"><input name="participants" className={inputClass} placeholder="Имена участников" /></Field></div><Field label="Соавторы Reels"><input name="coauthors" className={inputClass} placeholder="Через запятую: Анна, Иван" /><span className="text-[11px] text-[#a19891]">Можно указать несколько соавторов через запятую.</span></Field><Field label="Сценарий или ссылка"><textarea name="script" className="min-h-20 rounded-lg border border-[#e8dfda] p-3 text-sm outline-none focus:border-[#b6312a]" placeholder="Короткое описание или ссылка" /></Field></div>}<Field label="Описание"><textarea name="description" className="min-h-20 rounded-lg border border-[#e8dfda] p-3 text-sm outline-none focus:border-[#b6312a]" placeholder="Дополнительные заметки" /></Field><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit"><Check size={16} /> Создать контент</Button></div></form></Modal>;
}

function ActivityDialog({ state, today, onClose, onSubmit }: { state: AppState; today: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Добавить работу" onClose={onClose}><form onSubmit={onSubmit} className="grid gap-4"><Field label="Content Item *"><select required name="contentId" className={inputClass}>{state.content.filter((item) => item.status !== "published").map((item) => <option key={item.id} value={item.id}>{displayName(state, item.productId)} · {item.title}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Действие *"><select required name="action" className={inputClass}>{ACTIVITY_TYPES.map((action) => <option key={action}>{action}</option>)}</select></Field><Field label="Дата *"><input required name="date" type="date" defaultValue={today} className={inputClass} /></Field></div><Field label="Затраченное время, минут *"><input required min="1" name="minutes" type="number" defaultValue="30" className={inputClass} /></Field><Field label="Комментарий"><textarea name="comment" className="min-h-20 rounded-lg border border-[#e8dfda] p-3 text-sm outline-none focus:border-[#b6312a]" placeholder="Что было сделано" /></Field><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit"><Check size={16} /> Сохранить</Button></div></form></Modal>;
}

function PublicationDialog({ state, today, onClose, onSubmit }: { state: AppState; today: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const activePlatforms = state.platforms.filter((item) => !item.archived).sort((a, b) => a.order - b.order);
  return <Modal title="Отметить публикацию" onClose={onClose}><form onSubmit={onSubmit} className="grid gap-4"><div className="rounded-lg bg-[#fbf7f5] p-3 text-xs leading-5 text-[#857b74]">Выберите, где и какой продукт опубликовался. Один материал можно отметить на нескольких площадках отдельными записями.</div><Field label="Контент *"><select required name="contentId" className={inputClass}>{state.content.map((item) => <option key={item.id} value={item.id}>{displayName(state, item.productId)} · {item.title}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Соцсеть *"><select required name="platformId" className={inputClass}>{activePlatforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select></Field><Field label="Дата публикации *"><input required name="date" type="date" defaultValue={today} className={inputClass} /></Field></div><Field label="Ссылка на публикацию"><input name="url" type="url" className={inputClass} placeholder="https://..." /></Field><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit"><Megaphone size={16} /> Сохранить публикацию</Button></div></form></Modal>;
}

function DetailDialog({ state, item, onClose, onStatusChange, onAddPublication, onRemovePublication }: { state: AppState; item: ContentItem; onClose: () => void; onStatusChange: (status: ContentStatus) => void; onAddPublication: () => void; onRemovePublication: (id: string) => void }) {
  const product = displayName(state, item.productId);
  const publications = state.publications.filter((publication) => publication.contentId === item.id);
  const activities = state.activities.filter((activity) => activity.contentId === item.id).sort((a, b) => b.date.localeCompare(a.date));
  const spent = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  return <Modal title="Карточка контента" wide onClose={onClose}><div className="grid gap-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="mb-2 flex flex-wrap gap-2"><Badge tone="accent">{product}</Badge><Badge>{item.type}</Badge><Badge tone={item.status === "published" ? "success" : "warning"}>{statusLabel[item.status]}</Badge>{item.priority === "high" && <Badge tone="warning">Высокий приоритет</Badge>}</div><h3 className="text-xl font-bold tracking-tight">{item.title}</h3>{item.description && <p className="mt-2 text-sm text-[#746d68]">{item.description}</p>}</div><div className="flex flex-wrap gap-2"><select value={item.status} onChange={(event) => onStatusChange(event.target.value as ContentStatus)} className={inputClass}><option value="approval">Согласование</option><option value="shoot">Съемка</option><option value="shot">Отснято</option><option value="editing">Монтаж</option><option value="published">Выложено</option></select><Button variant="secondary" onClick={onAddPublication}><Plus size={15} /> Публикация</Button></div></div><div className="grid gap-4 md:grid-cols-2"><InfoBlock title="Производство"><InfoRow label="Плановая съемка" value={formatDate(item.plannedShootDate)} /><InfoRow label="Фактическая съемка" value={formatDate(item.actualShootDate)} /><InfoRow label="Локация" value={item.location ?? "Не указана"} /><InfoRow label="Участники" value={item.participants ?? "Не указаны"} /></InfoBlock><InfoBlock title="Публикация"><InfoRow label="Плановая дата" value={formatDate(item.plannedPublishDate)} /><InfoRow label="Фактическая дата" value={formatDate(item.actualPublishDate)} /><InfoRow label="Соавторы" value={item.coauthors.length ? item.coauthors.join(", ") : "Нет"} /><InfoRow label="Сценарий" value={item.script ?? "Не добавлен"} /></InfoBlock></div><InfoBlock title={`Публикации · ${publications.length}`}><div className="grid gap-2">{publications.length === 0 ? <EmptyState icon={<Megaphone size={16} />} text="Пока нет отмеченных публикаций" /> : publications.map((publication) => <div key={publication.id} className="flex items-center gap-3 rounded-lg border border-[#f0e9e5] p-3"><Share2 size={15} className="text-[#b6312a]" /><span className="flex-1 text-sm font-semibold">{state.platforms.find((platform) => platform.id === publication.platformId)?.name ?? "Архивная площадка"}</span><span className="text-xs text-[#857b74]">{formatDate(publication.date)}</span>{publication.url && <a href={publication.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#b6312a] hover:underline">Открыть</a>}<IconButton label="Удалить публикацию" onClick={() => onRemovePublication(publication.id)}><Trash2 size={15} /></IconButton></div>)}</div></InfoBlock><InfoBlock title={`История работы · ${formatMinutes(spent)}`}><div className="grid gap-2">{activities.length === 0 ? <EmptyState icon={<Timer size={16} />} text="Работы пока не добавлены" /> : activities.map((activity) => <div key={activity.id} className="flex items-center gap-3 rounded-lg bg-[#faf7f5] p-3"><span className="w-16 text-xs text-[#857b74]">{formatDate(activity.date)}</span><span className="flex-1 text-sm font-medium">{activity.action}{activity.comment ? ` · ${activity.comment}` : ""}</span><span className="text-sm font-semibold">{formatMinutes(activity.minutes)}</span></div>)}</div></InfoBlock></div></Modal>;
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) { return <div className="rounded-xl border border-[#eee7e2] p-4"><h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9a918b]">{title}</h4>{children}</div>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex gap-4 border-b border-[#f5efeb] py-2.5 text-sm last:border-0"><span className="w-36 shrink-0 text-xs text-[#a19891]">{label}</span><span className="min-w-0 flex-1 break-words font-medium text-[#514a45]">{value}</span></div>; }
