"use client";

import { Archive, ArrowDown, ArrowUp, ExternalLink, MessageCircle, Package, Pencil, Share2 } from "lucide-react";
import { FaLinkedin } from "react-icons/fa6";
import { SiFacebook, SiInstagram, SiThreads, SiTiktok, SiYoutube } from "react-icons/si";
import type { IconType } from "react-icons";
import type { ReactNode } from "react";
import type { Platform, Product } from "@/lib/types";

const socialIcons: Record<string, { Icon: IconType; color: string }> = {
  facebook: { Icon: SiFacebook, color: "#1877f2" },
  instagram: { Icon: SiInstagram, color: "#e4405f" },
  linkedin: { Icon: FaLinkedin, color: "#0a66c2" },
  threads: { Icon: SiThreads, color: "#111827" },
  tiktok: { Icon: SiTiktok, color: "#111827" },
  youtube: { Icon: SiYoutube, color: "#ff0000" },
};

function SocialIcon({ name, size = 16 }: { name: string; size?: number }) {
  const entry = socialIcons[name.trim().toLowerCase()];
  if (!entry) return <Share2 size={size} aria-hidden="true" className="text-gray-400" />;
  const { Icon, color } = entry;
  return <Icon size={size} aria-hidden="true" style={{ color }} />;
}

function whatsappUrl(number?: string) {
  const digits = number?.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function externalUrl(value?: string) {
  const normalized = value?.trim();
  return normalized ? (normalized.startsWith("http") ? normalized : `https://${normalized}`) : null;
}

function CatalogField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-gray-400">{label}</span><div className="mt-0.5 min-w-0 truncate text-xs font-semibold text-gray-800">{children}</div></div>;
}

function ActionButtons({ edit, archive, move, archived }: { edit?: () => void; archive?: () => void; move?: (direction: -1 | 1) => void; archived?: boolean }) {
  return <div className="flex shrink-0 items-center gap-1">
    {move && <><button type="button" onClick={() => move(-1)} title="Поднять" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-blue-700"><ArrowUp size={14} /></button><button type="button" onClick={() => move(1)} title="Опустить" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-blue-700"><ArrowDown size={14} /></button></>}
    {edit && <button type="button" onClick={edit} title="Изменить" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-blue-700"><Pencil size={14} /></button>}
    {archive && <button type="button" onClick={archive} title={archived ? "Вернуть" : "Убрать"} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"><Archive size={14} /></button>}
  </div>;
}

export default function ExampleUsage({
  products,
  platforms,
  onProductEdit,
  onProductArchive,
  onProductMove,
  onPlatformEdit,
  onPlatformArchive,
  onPlatformMove,
}: {
  products: Product[];
  platforms: Platform[];
  onProductEdit?: (id: string) => void;
  onProductArchive?: (id: string) => void;
  onProductMove?: (id: string, direction: -1 | 1) => void;
  onPlatformEdit?: (id: string) => void;
  onPlatformArchive?: (id: string) => void;
  onPlatformMove?: (id: string, direction: -1 | 1) => void;
  monthLabel?: string;
  showProductActions?: boolean;
  showPlatformActions?: boolean;
}) {
  const productCatalog = products.length > 0 ? <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">Каталог</p><h3 className="mt-1 text-lg font-bold tracking-tight text-blue-950">Продукты</h3><p className="mt-1 text-xs text-blue-900/60">Контакты и служебные данные продукта</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">{products.length}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => { const href = whatsappUrl(product.whatsappNumber); const instagram = externalUrl(product.instagramAccountUrl); return <article key={product.id} className={`relative overflow-hidden rounded-2xl border border-white bg-white/95 p-3.5 shadow-sm ring-1 ring-blue-950/[.03] ${product.archived ? "opacity-55" : ""}`}><span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: product.color || "#2563eb" }} /><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2.5"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: product.color || "#2563eb" }} /><div className="min-w-0"><h4 className="truncate text-base font-bold text-gray-950" title={product.name}>{product.name}</h4><p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[.12em] text-gray-400">{product.shortName || "Без сокращения"}</p></div></div><ActionButtons edit={onProductEdit ? () => onProductEdit(product.id) : undefined} archive={onProductArchive ? () => onProductArchive(product.id) : undefined} move={onProductMove ? (direction) => onProductMove(product.id, direction) : undefined} archived={product.archived} /></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2"><CatalogField label="Компания">{product.company || "Не указана"}</CatalogField><CatalogField label="Цвет"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: product.color || "#2563eb" }} />{product.color || "По умолчанию"}</span></CatalogField><CatalogField label="Instagram">{instagram ? <a href={instagram} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-blue-700 hover:underline"><SocialIcon name="Instagram" size={13} /><span className="truncate">Открыть аккаунт</span><ExternalLink size={11} /></a> : "Ссылка не указана"}</CatalogField><CatalogField label="Владелец">{product.ownerName || "Не указан"}</CatalogField></div><div className="mt-3 border-t border-gray-100 pt-3">{href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"><MessageCircle size={14} /> WhatsApp владельца</a> : <span className="block text-center text-[11px] text-gray-400">Номер WhatsApp не указан</span>}</div></article>; })}</div></section> : null;

  const platformCatalog = platforms.length > 0 ? <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-gray-400">Каталог</p><h3 className="mt-1 text-lg font-bold tracking-tight text-gray-950">Соцсети</h3><p className="mt-1 text-xs text-gray-500">Название, сокращение, аккаунт и цвет площадки</p></div><span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">{platforms.length}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{platforms.map((platform) => { const href = externalUrl(platform.accountUrl); return <article key={platform.id} className={`relative rounded-2xl border border-gray-100 bg-gray-50/75 p-3.5 transition hover:border-blue-100 hover:bg-blue-50/30 ${platform.archived ? "opacity-55" : ""}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"><SocialIcon name={platform.name} size={18} /></span><div className="min-w-0"><h4 className="truncate text-sm font-bold text-gray-900" title={platform.name}>{platform.name}</h4><p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[.12em] text-gray-400">{platform.shortName || "Без сокращения"}</p></div></div><ActionButtons edit={onPlatformEdit ? () => onPlatformEdit(platform.id) : undefined} archive={onPlatformArchive ? () => onPlatformArchive(platform.id) : undefined} move={onPlatformMove ? (direction) => onPlatformMove(platform.id, direction) : undefined} archived={platform.archived} /></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2"><CatalogField label="Аккаунт">{href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-blue-700 hover:underline"><span className="truncate">Открыть аккаунт</span><ExternalLink size={11} /></a> : "Ссылка не указана"}</CatalogField><CatalogField label="Цвет"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: platform.color || "#2563eb" }} />{platform.color || "По умолчанию"}</span></CatalogField></div></article>; })}</div></section> : null;

  return <div className="dashboard-overview grid gap-4">{productCatalog}{platformCatalog}{!productCatalog && !platformCatalog && <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400"><Package size={22} className="mx-auto mb-2" />Каталог пока пуст.</div>}</div>;
}
