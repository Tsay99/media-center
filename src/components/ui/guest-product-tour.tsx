"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

type GuestTourView = "dashboard" | "calendar" | "load";
type TourMode = "main" | "calendar" | "load";

type GuestProductTourProps = {
  enabled: boolean;
  view: string;
  availableViews: GuestTourView[];
  mobileOpen: boolean;
  showContact: boolean;
  onOpenMobileMenu: () => void;
};

type TourStep = {
  target: string;
  title: string;
  description: string;
};

type TourConfig = {
  mode: TourMode;
  storageKey: string;
  steps: TourStep[];
};

const MAIN_STORAGE_KEY = "content-plan-fact:guest-tour:v2";
const CALENDAR_STORAGE_KEY = "content-plan-fact:guest-tour:calendar:v1";
const LOAD_STORAGE_KEY = "content-plan-fact:guest-tour:load:v1";
const EMPTY_STEPS: TourStep[] = [];

const MAIN_STEPS: TourStep[] = [
  { target: "[data-tour='guest-navigation']", title: "Рабочая панель", description: "Здесь доступны Главная, Календарь и Нагрузка — основные разделы для просмотра рабочего процесса." },
  { target: "[data-tour='home-summary']", title: "Общий обзор", description: "На Главной собраны ключевые показатели по текущему плану: публикации, факт и прогресс." },
  { target: "[data-tour='product-card']", title: "Карточка продукта", description: "Вся информация по продукту собрана в одной карточке: название, компания, план, факт и остаток." },
  { target: "[data-tour='product-socials']", title: "Соцсети продукта", description: "Здесь видно, на каких площадках работает продукт и сколько публикаций запланировано и выполнено." },
  { target: "[data-tour='completion-ring']", title: "Круг выполнения", description: "Круг показывает процент выполнения плана по этому продукту." },
  { target: "[data-tour='guest-contact']", title: "Связаться", description: "Если появились вопросы по данным или работе панели, можно быстро связаться с владельцем." },
];

const CONTEXT_STEPS: Record<Exclude<TourMode, "main">, TourStep[]> = {
  calendar: [{ target: "[data-tour='calendar-today-cell']", title: "Сегодня", description: "Эта клетка показывает текущий день. Весь месяц остаётся доступен для просмотра, а публикации можно открыть внутри нужной даты." }],
  load: [{ target: "[data-tour='workload-summary'] > div:first-child", title: "Рабочий ресурс", description: "Здесь видно, сколько часов требует текущий контент-план и какой процент рабочего фонда уже занят." }],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findVisibleTarget(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? null;
}

function storageKeyFor(mode: TourMode) {
  if (mode === "calendar") return CALENDAR_STORAGE_KEY;
  if (mode === "load") return LOAD_STORAGE_KEY;
  return MAIN_STORAGE_KEY;
}

export function GuestProductTour({ enabled, view, availableViews, mobileOpen, showContact, onOpenMobileMenu }: GuestProductTourProps) {
  const config = useMemo<TourConfig | null>(() => {
    if (view === "dashboard" && availableViews.includes("dashboard")) return { mode: "main", storageKey: MAIN_STORAGE_KEY, steps: showContact ? MAIN_STEPS : MAIN_STEPS.slice(0, -1) };
    if (view === "calendar" && availableViews.includes("calendar")) return { mode: "calendar", storageKey: CALENDAR_STORAGE_KEY, steps: CONTEXT_STEPS.calendar };
    if (view === "load" && availableViews.includes("load")) return { mode: "load", storageKey: LOAD_STORAGE_KEY, steps: CONTEXT_STEPS.load };
    return null;
  }, [availableViews, showContact, view]);

  const [stepIndex, setStepIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [activeMode, setActiveMode] = useState<TourMode | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });
  const activeModeRef = useRef<TourMode | null>(null);
  const forcedModeRef = useRef<TourMode | null>(null);

  const finish = useCallback(() => {
    const mode = activeModeRef.current;
    if (mode) window.localStorage.setItem(storageKeyFor(mode), "completed");
    activeModeRef.current = null;
    setActiveMode(null);
    setStarted(false);
    setTargetRect(null);
  }, []);

  useEffect(() => {
    if (!enabled || !config) return;
    const queryValue = new URLSearchParams(window.location.search).get("tour");
    const forceStart = process.env.NODE_ENV === "development" && (queryValue === "1" || queryValue === config.mode);
    if (!forceStart && window.localStorage.getItem(config.storageKey)) return;
    if (activeModeRef.current === config.mode || forcedModeRef.current === config.mode) return;
    const timer = window.setTimeout(() => {
      activeModeRef.current = config.mode;
      if (forceStart) forcedModeRef.current = config.mode;
      setActiveMode(config.mode);
      setStarted(true);
      setStepIndex(0);
      setTargetRect(null);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (config.mode === "main" && window.innerWidth < 1024 && !mobileOpen) onOpenMobileMenu();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [config, enabled, mobileOpen, onOpenMobileMenu]);

  const steps = useMemo(() => activeMode === config?.mode && config ? config.steps : EMPTY_STEPS, [activeMode, config]);

  const refreshTarget = useCallback(() => {
    if (!started || steps.length === 0) return;
    const currentStep = steps[stepIndex];
    const element = currentStep ? findVisibleTarget(currentStep.target) : null;
    setTargetRect(element?.getBoundingClientRect() ?? null);
  }, [started, stepIndex, steps]);

  useEffect(() => {
    if (!started || steps.length === 0) return;
    const currentStep = steps[stepIndex];
    if (!currentStep) return;
    let attempts = 0;
    const locateTarget = () => {
      const element = findVisibleTarget(currentStep.target);
      if (element) {
        if (attempts === 0) element.scrollIntoView({ block: "nearest", inline: "nearest" });
        refreshTarget();
        window.clearInterval(timer);
      } else if (attempts >= 30) {
        window.clearInterval(timer);
      }
      attempts += 1;
    };
    const timer = window.setInterval(locateTarget, 100);
    locateTarget();
    return () => window.clearInterval(timer);
  }, [refreshTarget, started, stepIndex, steps]);

  useEffect(() => {
    if (!started) return;
    const handleViewportChange = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      refreshTarget();
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [refreshTarget, started]);

  useEffect(() => {
    if (!started) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finish, started]);

  if (!enabled || !started || !targetRect || steps.length === 0) return null;

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const tooltipWidth = Math.min(336, viewport.width - 32);
  const tooltipHeight = 220;
  const placeToRight = viewport.width >= 900 && targetRect.left < 280;
  const rawLeft = placeToRight ? targetRect.right + 16 : targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  const rawTop = placeToRight ? targetRect.top + targetRect.height / 2 - tooltipHeight / 2 : targetRect.bottom + 16;
  const rawTooltipTop = rawTop + tooltipHeight > viewport.height - 16 ? targetRect.top - tooltipHeight - 16 : rawTop;
  const top = clamp(rawTooltipTop, 16, Math.max(16, viewport.height - tooltipHeight - 16));
  const left = clamp(rawLeft, 16, Math.max(16, viewport.width - tooltipWidth - 16));
  const panels = [
    { top: 0, left: 0, width: viewport.width, height: Math.max(0, targetRect.top) },
    { top: targetRect.top, left: 0, width: Math.max(0, targetRect.left), height: targetRect.height },
    { top: targetRect.top, left: targetRect.right, width: Math.max(0, viewport.width - targetRect.right), height: targetRect.height },
    { top: targetRect.bottom, left: 0, width: viewport.width, height: Math.max(0, viewport.height - targetRect.bottom) },
  ];

  function goNext() {
    if (isLastStep) {
      finish();
      return;
    }
    setTargetRect(null);
    setStepIndex((current) => current + 1);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setTargetRect(null);
    setStepIndex((current) => current - 1);
  }

  return <>
    {panels.map((panel, index) => <div key={index} aria-hidden="true" className="pointer-events-auto fixed z-[90] bg-slate-950/55" style={panel} />)}
    <div aria-hidden="true" className="pointer-events-none fixed z-[91] rounded-xl border-2 border-blue-300 shadow-[0_0_0_4px_rgba(147,197,253,0.25)]" style={{ top: targetRect.top - 3, left: targetRect.left - 3, width: targetRect.width + 6, height: targetRect.height + 6 }} />
    <section role="dialog" aria-live="polite" aria-label={`Подсказка ${stepIndex + 1} из ${steps.length}`} className="fixed z-[92] w-[calc(100vw-2rem)] rounded-2xl border border-blue-100 bg-white p-4 text-gray-900 shadow-2xl shadow-slate-950/20" style={{ top, left, maxWidth: tooltipWidth }}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Подсказка · {stepIndex + 1} из {steps.length}</p><h2 className="mt-1 text-base font-bold tracking-tight">{currentStep.title}</h2></div><button type="button" onClick={finish} aria-label="Пропустить знакомство" className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"><X size={16} /></button></div>
      <p className="mt-2 text-sm leading-5 text-gray-600">{currentStep.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={finish} className="text-xs font-semibold text-gray-400 transition hover:text-gray-700">Пропустить</button><div className="flex items-center gap-2">{stepIndex > 0 && <button type="button" onClick={goBack} className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"><ArrowLeft size={13} /> Назад</button>}<button type="button" onClick={goNext} className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700">{isLastStep ? "Понятно" : "Далее"}{!isLastStep && <ArrowRight size={13} />}</button></div></div>
    </section>
  </>;
}
