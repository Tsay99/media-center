"use client";

import { ReactNode } from "react";

export function FeatureBento({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-feature-bento relative overflow-hidden rounded-[var(--app-radius-xl)] border p-3 sm:p-4 ${className}`}>
    <div className="ui-feature-bento__glow pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl" />
    <div className="ui-feature-bento__glow ui-feature-bento__glow--secondary pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full blur-3xl" />
    <div className="relative">{children}</div>
  </section>;
}

export default FeatureBento;
