import { AppState, ContentItem, MonthPlan, Product, Platform } from "./types";

const date = (day: number) => `2026-09-${String(day).padStart(2, "0")}`;

export const DEMO_PRODUCTS: Product[] = [
  "ТН",
  "ТО",
  "ФТК",
  "УП",
  "Prime",
  "SapaControl",
  "FirstInLaw",
  "Корпоративный",
].map((name, index) => ({ id: `product-${index + 1}`, name, archived: false, order: index }));

export const DEMO_PLATFORMS: Platform[] = ["Instagram", "TikTok", "Threads", "LinkedIn", "YouTube", "Facebook"].map(
  (name, index) => ({ id: `platform-${index + 1}`, name, archived: false, order: index }),
);

const product = (name: string) => DEMO_PRODUCTS.find((item) => item.name === name)!.id;

export const DEMO_CONTENT: ContentItem[] = [
  {
    id: "content-1",
    title: "5 дефектов при приемке квартиры",
    productId: product("SapaControl"),
    type: "Reels",
    priority: "high",
    status: "editing",
    plannedShootDate: date(17),
    plannedPublishDate: date(20),
    location: "Объект на Абая",
    script: "Короткий разбор пяти дефектов, которые часто пропускают.",
    coauthors: ["Анна Петрова"],
    createdAt: date(5),
    updatedAt: date(14),
  },
  {
    id: "content-2",
    title: "Что проверяет технический надзор",
    productId: product("ТН"),
    type: "Reels",
    priority: "medium",
    status: "shoot",
    plannedShootDate: date(16),
    plannedShootTime: "10:00",
    plannedPublishDate: date(18),
    location: "Офис",
    participants: "Алексей, эксперт ТН",
    coauthors: [],
    createdAt: date(4),
    updatedAt: date(13),
  },
  {
    id: "content-3",
    title: "Как работает финансово-технический контроль",
    productId: product("ФТК"),
    type: "Пост",
    priority: "medium",
    status: "approval",
    plannedPublishDate: date(19),
    coauthors: [],
    createdAt: date(8),
    updatedAt: date(12),
  },
  {
    id: "content-4",
    title: "Что проверить перед подписанием договора",
    productId: product("FirstInLaw"),
    type: "Reels",
    priority: "high",
    status: "published",
    plannedPublishDate: date(12),
    actualPublishDate: date(12),
    plannedShootDate: date(8),
    actualShootDate: date(8),
    coauthors: ["Мария Смирнова", "FirstInLaw team"],
    createdAt: date(1),
    updatedAt: date(12),
  },
  {
    id: "content-5",
    title: "3 вопроса про юридическое сопровождение",
    productId: product("FirstInLaw"),
    type: "Threads",
    priority: "low",
    status: "published",
    plannedPublishDate: date(10),
    actualPublishDate: date(10),
    coauthors: [],
    createdAt: date(2),
    updatedAt: date(10),
  },
  {
    id: "content-6",
    title: "Кейс: экономия на исправлении дефектов",
    productId: product("SapaControl"),
    type: "Пост",
    priority: "medium",
    status: "published",
    plannedPublishDate: date(6),
    actualPublishDate: date(6),
    coauthors: [],
    createdAt: date(2),
    updatedAt: date(6),
  },
];

export const DEMO_STATE: AppState = {
  products: DEMO_PRODUCTS,
  platforms: DEMO_PLATFORMS,
  content: DEMO_CONTENT,
  publications: [
    { id: "pub-1", contentId: "content-4", platformId: "platform-1", date: date(12), url: "https://instagram.com/" },
    { id: "pub-2", contentId: "content-4", platformId: "platform-2", date: date(12) },
    { id: "pub-3", contentId: "content-5", platformId: "platform-3", date: date(10) },
    { id: "pub-4", contentId: "content-6", platformId: "platform-1", date: date(6) },
  ],
  activities: [
    { id: "activity-1", contentId: "content-1", date: date(14), action: "Монтаж", minutes: 130, comment: "Черновой монтаж" },
    { id: "activity-2", contentId: "content-1", date: date(10), action: "Сценарий", minutes: 40 },
    { id: "activity-3", contentId: "content-2", date: date(13), action: "Организация съемки", minutes: 35 },
    { id: "activity-4", contentId: "content-4", date: date(8), action: "Съемка", minutes: 90 },
    { id: "activity-5", contentId: "content-4", date: date(11), action: "Монтаж", minutes: 150 },
    { id: "activity-6", contentId: "content-5", date: date(10), action: "Подготовка", minutes: 30 },
  ],
  plans: {
    "2026-09": {
      month: "2026-09",
      totals: { Reels: 16, Пост: 8, Threads: 12, TikTok: 12, LinkedIn: 4, YouTube: 1 },
      products: {
        [product("ТН")]: { Reels: 2, Пост: 1 },
        [product("ТО")]: { Reels: 2, Пост: 1 },
        [product("ФТК")]: { Reels: 2, Пост: 1 },
        [product("УП")]: { Reels: 1, Пост: 1 },
        [product("Prime")]: { Reels: 1, Пост: 1 },
        [product("SapaControl")]: { Reels: 4, Пост: 2 },
        [product("FirstInLaw")]: { Reels: 2, Пост: 1 },
        [product("Корпоративный")]: { Reels: 2, Пост: 0 },
      },
    },
  },
};

export function cloneDemoState(): AppState {
  return JSON.parse(JSON.stringify(DEMO_STATE)) as AppState;
}

export function getOrCreatePlan(state: AppState, month: string): MonthPlan {
  return state.plans[month] ?? { month, totals: { Reels: 0, Пост: 0, Threads: 0, TikTok: 0, LinkedIn: 0, YouTube: 0 }, products: {} };
}
