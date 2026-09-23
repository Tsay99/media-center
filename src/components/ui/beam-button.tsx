"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BorderBeam } from "./border-beam";

type BeamButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  beam?: boolean;
};

export function BeamButton({ children, className = "", beam = true, ...props }: BeamButtonProps) {
  return (
    <button {...props} className={`relative isolate overflow-hidden ${className}`}>
      {children}
      {beam && <BorderBeam size={42} duration={5.5} colorFrom="#8b5cf6" colorTo="#22d3ee" borderWidth={1} />}
    </button>
  );
}
