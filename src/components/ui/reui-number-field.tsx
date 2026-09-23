"use client";

import { Minus, Plus } from "lucide-react";
import { InputHTMLAttributes, ReactNode, createContext, useContext, useEffect, useState } from "react";

type NumberFieldContextValue = {
  value: number;
  min?: number;
  max?: number;
  step: number;
  setValue: (value: number) => void;
};

const NumberFieldContext = createContext<NumberFieldContextValue | null>(null);

function useNumberField() {
  const context = useContext(NumberFieldContext);
  if (!context) throw new Error("NumberField controls must be rendered inside NumberField");
  return context;
}

function normalizeValue(value: number, min?: number, max?: number, step = 1) {
  const safeValue = Number.isFinite(value) ? value : min ?? 0;
  const stepped = min === undefined ? safeValue : min + Math.round((safeValue - min) / step) * step;
  return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, stepped));
}

export function NumberField({
  value: controlledValue,
  defaultValue = 0,
  min,
  max,
  step = 1,
  onValueChange,
  children,
  className = "",
}: {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(() => normalizeValue(defaultValue, min, max, step));
  const value = controlledValue ?? uncontrolledValue;

  function setValue(nextValue: number) {
    const next = normalizeValue(nextValue, min, max, step);
    if (controlledValue === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  return <NumberFieldContext.Provider value={{ value, min, max, step, setValue }}><div className={className}>{children}</div></NumberFieldContext.Provider>;
}

export function NumberFieldGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-number-field-group flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10 ${className}`}>{children}</div>;
}

export function NumberFieldScrubArea({ label }: { label?: string }) {
  return label ? <span className="hidden select-none px-2 text-[9px] font-bold uppercase tracking-wide text-gray-400 sm:inline">{label}</span> : null;
}

export function NumberFieldInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type">) {
  const { value, step, setValue } = useNumberField();
  const [draft, setDraft] = useState(String(value));
  const allowsDecimal = step < 1;

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(String(value)), 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  function commit() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    setValue(parsed);
  }

  return <input {...props} type="text" inputMode={allowsDecimal ? "decimal" : "numeric"} pattern={allowsDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"} value={draft} onChange={(event) => { const normalized = event.target.value.replace(",", "."); const next = allowsDecimal ? normalized.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1") : normalized.replace(/[^0-9]/g, ""); setDraft(next); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }} className={`ui-number-field-input h-7 min-w-0 flex-1 appearance-none bg-transparent px-1.5 text-right text-xs font-semibold text-gray-900 outline-none ${className}`} />;
}

export function NumberFieldDecrement({ className = "" }: { className?: string }) {
  const { value, min, step, setValue } = useNumberField();
  const disabled = min !== undefined && value <= min;
  return <button type="button" aria-label="Уменьшить" disabled={disabled} onClick={() => setValue(value - step)} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border-l border-gray-100 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35 ${className}`}><Minus size={12} /></button>;
}

export function NumberFieldIncrement({ className = "" }: { className?: string }) {
  const { value, max, step, setValue } = useNumberField();
  const disabled = max !== undefined && value >= max;
  return <button type="button" aria-label="Увеличить" disabled={disabled} onClick={() => setValue(value + step)} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border-l border-gray-100 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35 ${className}`}><Plus size={12} /></button>;
}
