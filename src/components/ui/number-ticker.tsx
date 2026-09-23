"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

type NumberTickerProps = ComponentPropsWithoutRef<"span"> & {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
};

export function NumberTicker({
  value,
  startValue,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const nearbyStart = Math.max(0, Number((value - Math.max(decimalPlaces > 0 ? 0.1 : 1, Math.abs(value) * 0.1)).toFixed(decimalPlaces)));
  const resolvedStartValue = startValue ?? nearbyStart;
  const motionValue = useMotionValue(direction === "down" ? value : resolvedStartValue);
  const springValue = useSpring(motionValue, { damping: 32, stiffness: 260, mass: 0.65 });
  const prefersReducedMotion = useReducedMotion();
  const formattedValue = Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    timer = setTimeout(() => {
      motionValue.set(direction === "down" ? resolvedStartValue : value);
    }, delay * 1000);
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [motionValue, delay, value, direction, resolvedStartValue]);

  useEffect(() => springValue.on("change", (latest) => {
    if (ref.current) {
      ref.current.textContent = Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(latest.toFixed(decimalPlaces)));
    }
  }), [springValue, decimalPlaces]);

  return <span ref={ref} aria-label={formattedValue} data-value={value} className={cn("inline-block tabular-nums", className)} {...props}>{prefersReducedMotion ? formattedValue : Intl.NumberFormat("ru-RU", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(resolvedStartValue)}</span>;
}
