"use client";

import { PointerEvent, useState } from "react";
import { motion } from "motion/react";

export function MouseFollowingEyes({ className = "" }: { className?: string }) {
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setGaze({ x: Math.max(-1, Math.min(1, x)) * 7, y: Math.max(-1, Math.min(1, y)) * 5 });
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 ${className}`}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => {
        setActive(false);
        setGaze({ x: 0, y: 0 });
      }}
      onPointerMove={handlePointerMove}
    >
      <div className="flex items-center justify-center gap-3" aria-hidden="true">
        {[0, 1].map((eye) => (
          <div key={eye} className="flex h-16 w-20 items-center justify-center rounded-[50%] border border-blue-200 bg-white shadow-inner">
            <motion.span
              className="h-7 w-7 rounded-full bg-blue-700 shadow-[0_0_0_5px_rgba(147,197,253,.35)]"
              animate={{ x: gaze.x, y: gaze.y }}
              transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.35 }}
            />
          </div>
        ))}
      </div>
      <motion.p initial={false} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 4 }} className="mt-3 text-center text-xs font-bold text-blue-800">
        Я за вами слежу
      </motion.p>
    </div>
  );
}
