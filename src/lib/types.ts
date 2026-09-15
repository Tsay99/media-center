export type ContentType =
  | "Reels"
  | "Пост"
  | "Stories"
  | "Threads"
  | "TikTok"
  | "LinkedIn"
  | "YouTube"
  | "Shorts"
  | "Другое";

export type ContentStatus = "approval" | "shoot" | "shot" | "editing" | "published";
export type ActivityType =
  | "Подготовка"
  | "Сценарий"
  | "Согласование"
  | "Организация съемки"
  | "Съемка"
  | "Монтаж"
  | "Правки"
  | "Дизайн"
  | "Публикация"
  | "Аналитика"
  | "Другое";

export type Product = {
  id: string;
  name: string;
  archived: boolean;
  order: number;
};

export type Platform = {
  id: string;
  name: string;
  archived: boolean;
  order: number;
};

export type ContentItem = {
  id: string;
  title: string;
  productId: string;
  type: ContentType;
  description?: string;
  priority: "low" | "medium" | "high";
  status: ContentStatus;
  plannedShootDate?: string;
  plannedShootTime?: string;
  actualShootDate?: string;
  plannedPublishDate?: string;
  actualPublishDate?: string;
  location?: string;
  participants?: string;
  script?: string;
  coauthors: string[];
  createdAt: string;
  updatedAt: string;
};

export type Publication = {
  id: string;
  contentId: string;
  platformId: string;
  date: string;
  url?: string;
};

export type Activity = {
  id: string;
  contentId: string;
  date: string;
  action: ActivityType;
  minutes: number;
  comment?: string;
};

export type MonthPlan = {
  month: string;
  totals: Record<string, number>;
  products: Record<string, Record<string, number>>;
  platforms?: Record<string, Record<string, number>>;
};

export type AppState = {
  products: Product[];
  platforms: Platform[];
  content: ContentItem[];
  publications: Publication[];
  activities: Activity[];
  plans: Record<string, MonthPlan>;
};

export const CONTENT_TYPES: ContentType[] = [
  "Reels",
  "Пост",
  "Stories",
  "Threads",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Shorts",
  "Другое",
];

export const KANBAN_COLUMNS: { id: ContentStatus; label: string }[] = [
  { id: "approval", label: "Согласование" },
  { id: "shoot", label: "Съемка" },
  { id: "shot", label: "Отснято" },
  { id: "editing", label: "Монтаж" },
  { id: "published", label: "Выложено" },
];

export const ACTIVITY_TYPES: ActivityType[] = [
  "Подготовка",
  "Сценарий",
  "Согласование",
  "Организация съемки",
  "Съемка",
  "Монтаж",
  "Правки",
  "Дизайн",
  "Публикация",
  "Аналитика",
  "Другое",
];

export const DEFAULT_PRODUCTS = ["ТН", "ТО", "ФТК", "УП", "Prime", "SapaControl", "FirstInLaw", "Корпоративный"];
export const DEFAULT_PLATFORMS = ["Instagram", "TikTok", "Threads", "LinkedIn", "YouTube", "Facebook"];
