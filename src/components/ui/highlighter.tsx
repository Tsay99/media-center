"use client";

import { useEffect, useRef } from "react";
import type React from "react";
import { useInView } from "motion/react";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

type HighlighterProps = {
  children: React.ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  isView?: boolean;
};

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(elementRef, { once: true, margin: "-10%" });
  const shouldShow = !isView || isInView;

  useEffect(() => {
    const element = elementRef.current;
    let annotation: RoughAnnotation | null = null;
    let frame = 0;

    if (shouldShow && element) {
      frame = window.requestAnimationFrame(() => {
        annotation = annotate(element, {
          type: action,
          color,
          strokeWidth,
          animationDuration,
          iterations,
          padding,
          multiline,
        });
        annotation.show();
      });
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      annotation?.remove();
    };
  }, [shouldShow, action, color, strokeWidth, animationDuration, iterations, padding, multiline]);

  return <span ref={elementRef} className="relative inline-block bg-transparent">{children}</span>;
}
