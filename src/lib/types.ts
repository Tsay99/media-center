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
  company?: string;
  shortName?: string;
  ownerName?: string;
  whatsappNumber?: string;
  instagramAccountUrl?: string;
  color?: string;
  archived: boolean;
  order: number;
};

export type Platform = {
  id: string;
  name: string;
  shortName?: string;
  accountUrl?: string;
  color?: string;
  archived: boolean;
  order: number;
};

export type ContentItem = {
  id: string;
  sourceContentId?: string;
  title: string;
  brief?: string;
  productId: string;
  type: ContentType;
  description?: string;
  priority: "low" | "medium" | "high";
  status: ContentStatus;
  plannedShootDate?: string;
  plannedShootTime?: string;
  actualShootDate?: string;
  plannedPublishDate?: string;
  plannedPlatformId?: string;
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
  channels?: Record<string, Record<string, number>>;
  weekdays?: Record<string, Record<string, number[]>>;
};

export type WorkloadBreakdown = {
  organization: number;
  shooting: number;
  editing: number;
  design: number;
  publishing: number;
};

export type WorkloadSettings = {
  capacityHours: number;
  rates: Record<ContentType, WorkloadBreakdown>;
};

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type PersonalTask = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisualLayout = {
  pageHeader?: {
    tone?: "blue" | "violet" | "emerald";
    align?: "left" | "center";
    density?: "compact" | "comfortable";
    showEyebrow?: boolean;
  };
  productGrid?: {
    columnsDesktop?: 2 | 3 | 4;
    columnsMobile?: 1 | 2;
    gap?: "compact" | "comfortable";
    sort?: "manual" | "completion" | "name";
  };
  metricCards?: {
    columnsDesktop?: 2 | 3 | 4;
    columnsMobile?: 1 | 2;
    showPlan?: boolean;
    showFact?: boolean;
    showCompletion?: boolean;
    showActiveDays?: boolean;
  };
  sidebar?: {
    density?: "compact" | "comfortable";
    tone?: "navy" | "slate" | "indigo";
    showTagline?: boolean;
  };
  calendarToolbar?: {
    density?: "compact" | "comfortable";
    showViewSwitch?: boolean;
    showFilters?: boolean;
  };
  background?: {
    overlay?: "none" | "soft" | "strong";
    blur?: "none" | "soft";
  };
};

export type VisualEditorSettings = {
  puckData?: Record<string, unknown>;
  layout?: VisualLayout;
};

export type SiteSettings = {
  brandName: string;
  brandTagline: string;
  logoSrc?: string;
  logoScale?: number;
  logoContainerWidth?: number;
  logoContainerHeight?: number;
  logoContainerRadius?: number;
  logoContainerPadding?: number;
  logoSidebarHorizontalPadding?: number;
  logoSidebarTopOffset?: number;
  logoContainerBackground?: "transparent" | "white" | "sidebar";
  backgroundImage?: string;
  backgroundImages?: Record<string, string>;
  backgroundOpacity?: number;
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  visualEditor?: VisualEditorSettings;
  guestViews: string[];
  showSyncStatus: boolean;
  showContact: boolean;
};

export type AppState = {
  products: Product[];
  platforms: Platform[];
  content: ContentItem[];
  publications: Publication[];
  activities: Activity[];
  plans: Record<string, MonthPlan>;
  workload?: WorkloadSettings;
  siteSettings?: SiteSettings;
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
  { id: "published", label: "Опубликовано" },
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
