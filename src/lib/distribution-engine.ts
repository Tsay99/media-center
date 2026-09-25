export type DistributionMode = "safe" | "flexible" | "full";

export type DistributionSeries = {
  id: string;
  productId: string;
  productName: string;
  channelId: string;
  platformId: string;
  platformName: string;
  format: string;
  monthlyCount: number;
  preferredWeekdays?: number[];
  allowedWeekdays?: number[];
  priority?: number;
  minGapDays?: number;
  maxGapDays?: number;
  maxPerDay?: number;
  dailyResourceKey?: string;
  dailyResourceLimit?: number;
  weight?: number;
};

export type DistributionExisting = {
  id: string;
  seriesId: string;
  productId: string;
  channelId: string;
  platformId: string;
  platformName: string;
  format: string;
  date: string;
  status?: string;
  isLocked?: boolean;
  fixedDate?: boolean;
  source?: "planned" | "published" | "fixed";
};

export type DistributionInput = {
  targetMonth: string;
  plans: DistributionSeries[];
  existing: DistributionExisting[];
  workingWeekdays?: number[];
  excludedDates?: string[];
  includedDates?: string[];
  maxPublicationsPerDay?: number;
  maxDailyLoad?: number;
  contextBeforeDays?: number;
  contextAfterDays?: number;
  mode?: DistributionMode;
};

export type DistributionPlacement = {
  id: string;
  seriesId: string;
  productId: string;
  productName: string;
  channelId: string;
  platformId: string;
  platformName: string;
  format: string;
  plannedDate: string;
  score: number;
  reason: {
    idealDate: string;
    previousPublication?: string;
    nextPublication?: string;
    gapDays?: number;
    preferredWeekday: boolean;
    weeklyLoad: number;
  };
};

export type DistributionWarning = {
  code: "MONTH_QUOTA_IMPOSSIBLE" | "NO_ALLOWED_DATES" | "DAILY_LIMIT_EXCEEDED" | "MIN_GAP_IMPOSSIBLE" | "CONFLICT" | "HISTORY_MISSING";
  message: string;
  seriesId?: string;
};

export type DistributionMetrics = {
  planTotal: number;
  scheduledTotal: number;
  createdTotal: number;
  remainingTotal: number;
  uniformity: number;
  weeklyBalance: number;
  dailyLoad: number;
  conflicts: number;
};

export type DistributionResult = {
  status: "success" | "partial";
  placements: DistributionPlacement[];
  warnings: DistributionWarning[];
  metrics: DistributionMetrics;
};

type DayState = { count: number; load: number; series: Map<string, number>; productFormats: Set<string>; resources: Map<string, number> };

const DEFAULT_WORKING_WEEKDAYS = [1, 2, 3, 4, 5];
const DEFAULT_WEIGHTS: Record<string, number> = { YouTube: 5, Reels: 3, "Пост": 2, TikTok: 2, Shorts: 2, LinkedIn: 1.5, Threads: 1, Stories: 0.5 };
const FORMAT_ORDER: Record<string, number> = { YouTube: 0, Reels: 1, "Пост": 2, LinkedIn: 3, TikTok: 4, Shorts: 5, Threads: 6, Stories: 7 };

function dateAt(value: string) { return new Date(`${value}T12:00:00`); }
function isoDate(value: Date) { return value.toISOString().slice(0, 10); }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function dayDistance(left: string, right: string) { return Math.round((dateAt(right).getTime() - dateAt(left).getTime()) / 86400000); }
function isTargetMonth(value: string, month: string) { return value.startsWith(`${month}-`); }
function isoWeek(value: string) {
  const date = dateAt(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1, 12);
  return `${date.getFullYear()}-${Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)}`;
}
function monthDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1, 12);
  const end = new Date(year, monthNumber, 0, 12);
  const dates: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) dates.push(isoDate(cursor));
  return dates;
}
function isExclusive(format: string) { return format === "Reels" || format === "Пост"; }
function isFlexibleThreads(format: string) { return format === "Threads"; }
function hasExclusiveConflict(formats: Set<string>, format: string) { return isExclusive(format) && formats.has(format === "Reels" ? "Пост" : "Reels"); }
function dayState(states: Map<string, DayState>, date: string) {
  const existing = states.get(date);
  if (existing) return existing;
  const created = { count: 0, load: 0, series: new Map<string, number>(), productFormats: new Set<string>(), resources: new Map<string, number>() };
  states.set(date, created);
  return created;
}
function desiredInterval(series: DistributionSeries, availableDays: number) {
  const ideal = availableDays / Math.max(1, series.monthlyCount);
  return Math.max(series.minGapDays ?? 0, ideal);
}
function preferredWeekday(series: DistributionSeries, date: string) { return (series.preferredWeekdays ?? []).includes(dateAt(date).getDay()); }
function allowedWeekday(series: DistributionSeries, date: string, workingWeekdays: number[]) { return (series.allowedWeekdays ?? workingWeekdays).includes(dateAt(date).getDay()); }
function scoreDate(series: DistributionSeries, date: string, idealDate: string, states: Map<string, DayState>, existingDates: string[], workingWeekdays: number[], maxDailyLoad: number, weekCounts: Map<string, number>) {
  const state = dayState(states, date);
  const preferred = preferredWeekday(series, date);
  const before = existingDates.filter((value) => value < date).sort().at(-1);
  const after = existingDates.filter((value) => value > date).sort()[0];
  const idealGap = desiredInterval(series, Math.max(1, monthDates(idealDate.slice(0, 7)).length));
  let score = Math.abs(dayDistance(idealDate, date)) * 0.45;
  if (before) score += Math.abs(dayDistance(before, date) - idealGap) * 8;
  if (after) score += Math.abs(dayDistance(date, after) - idealGap) * 8;
  const currentWeek = weekCounts.get(isoWeek(date)) ?? 0;
  const weeklyRate = series.monthlyCount * 12 / 52;
  score += Math.max(0, currentWeek - weeklyRate) * 7;
  if (!preferred && (series.preferredWeekdays?.length ?? 0) > 0) score += 4;
  if (series.maxGapDays && before && dayDistance(before, date) > series.maxGapDays) score += (dayDistance(before, date) - series.maxGapDays) * 5;
  if (state.load > maxDailyLoad * 0.7) score += (state.load / Math.max(maxDailyLoad, 1)) * 5;
  score += state.count * 3;
  score -= Math.min(2, (series.priority ?? 3) * 0.2);
  return score;
}
function distributionUniformity(series: DistributionSeries, dates: string[]) {
  if (dates.length < 3) return dates.length ? 100 : 0;
  const sorted = [...dates].sort();
  const gaps = sorted.slice(1).map((date, index) => dayDistance(sorted[index], date));
  const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (!average) return 0;
  const variance = gaps.reduce((sum, gap) => sum + (gap - average) ** 2, 0) / gaps.length;
  return Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / average) * 100)));
}

export function distributeContent(input: DistributionInput): DistributionResult {
  const workingWeekdays = input.workingWeekdays?.length ? input.workingWeekdays : DEFAULT_WORKING_WEEKDAYS;
  const excludedDates = new Set(input.excludedDates ?? []);
  const includedDates = new Set(input.includedDates ?? []);
  const maxPublicationsPerDay = input.maxPublicationsPerDay ?? 8;
  const maxDailyLoad = input.maxDailyLoad ?? 14;
  const dates = monthDates(input.targetMonth).filter((date) => {
    if (excludedDates.has(date)) return false;
    if (includedDates.has(date)) return true;
    return workingWeekdays.includes(dateAt(date).getDay());
  });
  const warnings: DistributionWarning[] = [];
  const placements: DistributionPlacement[] = [];
  const states = new Map<string, DayState>();
  const existingDates = new Map<string, string[]>();
  const weekCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();
  const allSeriesDates = new Map<string, string[]>();
  const planById = new Map(input.plans.map((series) => [series.id, series]));

  input.existing.filter((item) => item.status !== "cancelled").forEach((item) => {
    if (!planById.has(item.seriesId)) return;
    const series = planById.get(item.seriesId)!;
    const datesForSeries = allSeriesDates.get(item.seriesId) ?? [];
    datesForSeries.push(item.date);
    allSeriesDates.set(item.seriesId, datesForSeries);
    if (!existingDates.has(item.seriesId)) existingDates.set(item.seriesId, []);
    existingDates.get(item.seriesId)!.push(item.date);
    if (!isTargetMonth(item.date, input.targetMonth)) return;
    targetCounts.set(item.seriesId, (targetCounts.get(item.seriesId) ?? 0) + 1);
    const state = dayState(states, item.date);
    state.count += 1;
    state.load += series.weight ?? DEFAULT_WEIGHTS[series.format] ?? 1;
    state.series.set(item.seriesId, (state.series.get(item.seriesId) ?? 0) + 1);
    state.productFormats.add(`${item.productId}|${item.format}`);
    if (series.dailyResourceKey) state.resources.set(series.dailyResourceKey, (state.resources.get(series.dailyResourceKey) ?? 0) + 1);
    weekCounts.set(isoWeek(item.date), (weekCounts.get(isoWeek(item.date)) ?? 0) + 1);
  });

  const ordered = [...input.plans].filter((series) => series.monthlyCount > 0).sort((left, right) => {
    const priority = (right.priority ?? 3) - (left.priority ?? 3);
    if (priority) return priority;
    const format = (FORMAT_ORDER[left.format] ?? 99) - (FORMAT_ORDER[right.format] ?? 99);
    if (format) return format;
    return left.id.localeCompare(right.id);
  });

  ordered.forEach((series) => {
    const current = targetCounts.get(series.id) ?? 0;
    const required = Math.max(0, series.monthlyCount - current);
    if (!required) return;
    const seriesDates = dates;
    if (!seriesDates.length) { warnings.push({ code: "NO_ALLOWED_DATES", message: `${series.productName} · ${series.format}: нет доступных дат`, seriesId: series.id }); return; }
    const datesForSeries = [...(existingDates.get(series.id) ?? [])];
    for (let index = 0; index < required; index += 1) {
      const totalTarget = Math.max(series.monthlyCount, current + required);
      const idealIndex = Math.min(seriesDates.length - 1, Math.max(0, Math.floor(((current + index) + 0.5) * seriesDates.length / totalTarget)));
      const idealDate = seriesDates[idealIndex];
      const candidates = seriesDates.filter((date) => {
        const state = dayState(states, date);
        const sameSeriesCount = state.series.get(series.id) ?? 0;
        if (!allowedWeekday(series, date, workingWeekdays)) return false;
        if (sameSeriesCount >= (series.maxPerDay ?? 1)) return false;
        if (!isFlexibleThreads(series.format) && state.count >= maxPublicationsPerDay) return false;
        if (!isFlexibleThreads(series.format) && state.load + (series.weight ?? DEFAULT_WEIGHTS[series.format] ?? 1) > maxDailyLoad) return false;
        if (series.dailyResourceKey && (state.resources.get(series.dailyResourceKey) ?? 0) >= (series.dailyResourceLimit ?? 1)) return false;
        if (hasExclusiveConflict(state.productFormats, series.format)) return false;
        if (series.minGapDays) {
          const nearest = datesForSeries.map((value) => Math.abs(dayDistance(value, date))).sort((a, b) => a - b)[0];
          if (nearest !== undefined && nearest < series.minGapDays) return false;
        }
        return true;
      });
      if (!candidates.length) {
        const hasDates = seriesDates.some((date) => allowedWeekday(series, date, workingWeekdays));
        warnings.push({ code: hasDates ? "DAILY_LIMIT_EXCEEDED" : "NO_ALLOWED_DATES", message: `${series.productName} · ${series.format}: не удалось разместить ${required - index} публикаций`, seriesId: series.id });
        break;
      }
      const scored = candidates.map((date) => ({ date, score: scoreDate(series, date, idealDate, states, datesForSeries, workingWeekdays, maxDailyLoad, weekCounts) })).sort((left, right) => left.score - right.score || left.date.localeCompare(right.date));
      const selected = scored[0];
      const state = dayState(states, selected.date);
      const previousPublication = datesForSeries.filter((date) => date < selected.date).sort().at(-1);
      const nextPublication = datesForSeries.filter((date) => date > selected.date).sort()[0];
      const gapDays = previousPublication ? dayDistance(previousPublication, selected.date) : undefined;
      const placement: DistributionPlacement = {
        id: `distribution-${series.id}-${index + 1}`,
        seriesId: series.id,
        productId: series.productId,
        productName: series.productName,
        channelId: series.channelId,
        platformId: series.platformId,
        platformName: series.platformName,
        format: series.format,
        plannedDate: selected.date,
        score: Number(selected.score.toFixed(2)),
        reason: { idealDate, previousPublication, nextPublication, gapDays, preferredWeekday: preferredWeekday(series, selected.date), weeklyLoad: (weekCounts.get(isoWeek(selected.date)) ?? 0) + 1 },
      };
      placements.push(placement);
      datesForSeries.push(selected.date);
      existingDates.set(series.id, datesForSeries);
      const stateSeriesCount = state.series.get(series.id) ?? 0;
      state.series.set(series.id, stateSeriesCount + 1);
      state.count += 1;
      state.load += series.weight ?? DEFAULT_WEIGHTS[series.format] ?? 1;
      state.productFormats.add(`${series.productId}|${series.format}`);
      if (series.dailyResourceKey) state.resources.set(series.dailyResourceKey, (state.resources.get(series.dailyResourceKey) ?? 0) + 1);
      weekCounts.set(isoWeek(selected.date), (weekCounts.get(isoWeek(selected.date)) ?? 0) + 1);
    }
  });

  const planTotal = input.plans.reduce((sum, series) => sum + Math.max(0, series.monthlyCount), 0);
  const scheduledTotal = input.plans.reduce((sum, series) => sum + (targetCounts.get(series.id) ?? 0) + placements.filter((item) => item.seriesId === series.id).length, 0);
  const seriesUniformity = input.plans.filter((series) => series.monthlyCount > 0).map((series) => distributionUniformity(series, existingDates.get(series.id) ?? []));
  const uniformity = seriesUniformity.length ? Math.round(seriesUniformity.reduce((sum, value) => sum + value, 0) / seriesUniformity.length) : 100;
  const loadValues = [...states.values()].map((state) => state.load);
  const loadAverage = loadValues.length ? loadValues.reduce((sum, value) => sum + value, 0) / loadValues.length : 0;
  const loadVariance = loadValues.length ? loadValues.reduce((sum, value) => sum + Math.abs(value - loadAverage), 0) / loadValues.length : 0;
  const dailyLoad = Math.max(0, Math.min(100, Math.round(100 - (loadAverage ? loadVariance / loadAverage * 100 : 0))));
  const weeklyBalance = Math.max(0, Math.min(100, Math.round(100 - Math.min(100, warnings.length * 10))));
  const conflicts = warnings.filter((warning) => warning.code === "CONFLICT" || warning.code === "DAILY_LIMIT_EXCEEDED").length;
  return {
    status: warnings.length ? "partial" : "success",
    placements,
    warnings,
    metrics: { planTotal, scheduledTotal, createdTotal: placements.length, remainingTotal: Math.max(0, planTotal - scheduledTotal), uniformity, weeklyBalance, dailyLoad, conflicts },
  };
}
