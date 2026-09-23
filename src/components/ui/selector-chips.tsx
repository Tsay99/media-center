"use client";

import { Check } from "lucide-react";
import { ReactNode, useState } from "react";

export function SelectorChips({
  options,
  onChange,
  selectedValues,
  optionLabels,
  renderOption,
  className = "",
  ariaLabel = "Выберите значения",
}: {
  options: string[];
  onChange: (selected: string[]) => void;
  selectedValues?: string[];
  optionLabels?: Record<string, string>;
  renderOption?: (option: string) => ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selected = selectedValues ?? internalSelected;

  function toggle(option: string) {
    const next = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
    if (selectedValues === undefined) setInternalSelected(next);
    onChange(next);
  }

  return <div role="listbox" aria-label={ariaLabel} aria-multiselectable="true" className={`flex min-w-0 flex-wrap gap-2 ${className}`}>
    {options.map((option) => {
      const active = selected.includes(option);
      return <button key={option} type="button" role="option" aria-selected={active} onClick={() => toggle(option)} className={`inline-flex min-h-9 min-w-0 items-center justify-start gap-1.5 rounded-xl border px-3 py-1.5 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${active ? "border-blue-300 bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/60"}`}>
        {active && <Check size={13} aria-hidden="true" />}
        <span className="min-w-0 max-w-full truncate">{renderOption?.(option) ?? optionLabels?.[option] ?? option}</span>
      </button>;
    })}
  </div>;
}
