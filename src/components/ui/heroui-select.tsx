"use client";

import { Check, ChevronDown } from "lucide-react";
import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";

export type SelectOption = {
  id: string;
  textValue: string;
  label: ReactNode;
  description?: string;
};

type SelectContextValue = {
  value: string;
  open: boolean;
  placeholder: string;
  options: SelectOption[];
  setOpen: (open: boolean) => void;
  selectValue: (value: string) => void;
  registerOption: (option: SelectOption) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);
const ListBoxItemContext = createContext(false);

function useSelect() {
  const context = useContext(SelectContext);
  if (!context) throw new Error("Select controls must be rendered inside Select");
  return context;
}

function SelectRoot({
  children,
  className = "",
  placeholder = "Выберите значение",
  value: controlledValue,
  defaultValue = "",
  options: initialOptions = [],
  onValueChange,
}: {
  children: ReactNode;
  className?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  options?: SelectOption[];
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [registeredOptions, setRegisteredOptions] = useState<SelectOption[]>(initialOptions);
  const rootRef = useRef<HTMLDivElement>(null);
  const value = controlledValue ?? internalValue;

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  const registerOption = useCallback((option: SelectOption) => {
    setRegisteredOptions((current) => current.some((item) => item.id === option.id)
      ? current.map((item) => item.id === option.id && (item.textValue !== option.textValue || item.description !== option.description) ? option : item)
      : [...current, option]);
  }, []);

  function selectValue(nextValue: string) {
    if (controlledValue === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return <SelectContext.Provider value={{ value, open, placeholder, options: registeredOptions, setOpen, selectValue, registerOption }}>
    <div ref={rootRef} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className={`relative ${className}`}>{children}</div>
  </SelectContext.Provider>;
}

function SelectLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`block text-xs font-semibold text-gray-500 ${className}`}>{children}</span>;
}

function SelectDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`mt-1 block text-[11px] leading-4 text-gray-400 ${className}`}>{children}</span>;
}

function SelectTrigger({ children, className = "", ...props }: { children: ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSelect();
  return <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }} className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 ${className}`} {...props}>{children}</button>;
}

function SelectValue({ children }: { children?: ReactNode }) {
  const { value, placeholder, options } = useSelect();
  const selected = options.find((option) => option.id === value);
  return <span className={`min-w-0 flex-1 truncate ${selected || value ? "text-gray-900" : "text-gray-400"}`}>{(children ?? selected?.label ?? value) || placeholder}</span>;
}

function SelectIndicator() {
  const { open } = useSelect();
  return <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`} />;
}

function SelectPopover({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { open } = useSelect();
  if (!open) return null;
  return <div className={`absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[80] max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-900/10 ${className}`}>{children}</div>;
}

function ListBoxRoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div role="listbox" className={`grid gap-0.5 ${className}`}>{children}</div>;
}

function ListBoxItem({ id, textValue, children, description, className = "" }: { id: string; textValue: string; children: ReactNode; description?: string; className?: string }) {
  const { value, selectValue, registerOption } = useSelect();
  const selected = value === id;

  useEffect(() => {
    registerOption({ id, textValue, label: children, description });
  }, [children, description, id, registerOption, textValue]);

  return <ListBoxItemContext.Provider value={selected}><button type="button" role="option" aria-selected={selected} onClick={() => selectValue(id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${selected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"} ${className}`}><span className="min-w-0 flex-1 truncate">{children}</span><ListBoxItemIndicator />{description && <span className="sr-only">{description}</span>}</button></ListBoxItemContext.Provider>;
}

function ListBoxItemIndicator() {
  const selected = useContext(ListBoxItemContext);
  return selected ? <Check size={15} className="shrink-0 text-blue-600" aria-hidden="true" /> : null;
}

export const Label = SelectLabel;
export const Description = SelectDescription;
export const ListBox = Object.assign(ListBoxRoot, { Item: ListBoxItem, ItemIndicator: ListBoxItemIndicator });
export const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Value: SelectValue,
  Indicator: SelectIndicator,
  Popover: SelectPopover,
});
