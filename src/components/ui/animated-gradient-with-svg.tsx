"use client";

import { useId } from "react";
import { motion } from "motion/react";

type AnimatedGradientProps = {
  colors: string[];
  speed?: number;
  blur?: "none" | "low" | "medium" | "high";
  className?: string;
};

const BLUR_RADIUS = {
  none: 0,
  low: 10,
  medium: 18,
  high: 28,
} as const;

export function AnimatedGradient({
  colors,
  speed = 0.05,
  blur = "medium",
  className = "",
}: AnimatedGradientProps) {
  const rawId = useId();
  const filterId = "animated-gradient-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const duration = Math.max(14, 28 / Math.max(speed, 0.02));
  const positions = [
    { x: 18, y: 22 },
    { x: 78, y: 28 },
    { x: 58, y: 76 },
    { x: 24, y: 72 },
  ];

  return (
    <div
      aria-hidden="true"
      className={"pointer-events-none absolute inset-0 overflow-hidden " + className}
    >
      <svg
        className="absolute inset-[-24%] h-[148%] w-[148%]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={BLUR_RADIUS[blur]} />
          </filter>
        </defs>
        {colors.map((color, index) => {
          const start = positions[index % positions.length];
          const next = positions[(index + 1) % positions.length];
          const third = positions[(index + 2) % positions.length];

          return (
            <motion.circle
              key={color + "-" + index}
              cx={start.x + "%"}
              cy={start.y + "%"}
              r={34 + (index % 2) * 8 + "%"}
              fill={color}
              filter={"url(#" + filterId + ")"}
              opacity={0.68}
              animate={{
                cx: [start.x + "%", next.x + "%", third.x + "%", start.x + "%"],
                cy: [start.y + "%", next.y + "%", third.y + "%", start.y + "%"],
              }}
              transition={{
                duration: duration + index * 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.8,
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 bg-white/45 backdrop-blur-[1px]" />
    </div>
  );
}
