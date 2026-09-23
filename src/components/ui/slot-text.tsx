"use client";

type SlotTextProps = {
  text: string;
  className?: string;
};

export function SlotText({ text, className = "" }: SlotTextProps) {
  return (
    <span className={"inline-flex items-baseline tabular-nums " + className} aria-live="polite">
      {Array.from(text).map((character, index) => (
        <span
          key={text + "-" + index + "-" + character}
          className={character === " " ? "w-1" : "inline-block animate-[slot-text-in_180ms_cubic-bezier(.22,1,.36,1)]"}
        >
          {character}
        </span>
      ))}
    </span>
  );
}
