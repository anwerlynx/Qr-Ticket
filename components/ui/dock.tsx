"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";

export interface DockItemData {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  badge?: string | number;
  className?: string;
  isPrimary?: boolean;
}

export interface DockProps {
  items: DockItemData[];
  className?: string;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
  distance?: number;
  spring?: {
    mass?: number;
    stiffness?: number;
    damping?: number;
  };
}

interface DockItemProps {
  item: DockItemData;
  mouseX: MotionValue<number>;
  baseItemSize: number;
  magnification: number;
  distance: number;
  spring?: {
    mass?: number;
    stiffness?: number;
    damping?: number;
  };
}

function DockItem({
  item,
  mouseX,
  baseItemSize,
  magnification,
  distance,
  spring = { mass: 0.1, stiffness: 180, damping: 15 },
}: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distanceCalc = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - (bounds.x + bounds.width / 2);
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );

  const width = useSpring(widthSync, spring);

  const iconScale = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [1, 1.25, 1]
  );
  const animatedScale = useSpring(iconScale, spring);

  return (
    <div className="relative flex items-center justify-center">
      {/* Floating Animated Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.85 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg bg-neutral-900/95 dark:bg-[#18181b]/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl border border-white/10 backdrop-blur-md"
          >
            {item.label}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-[#18181b]" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={ref}
        type="button"
        style={{ width, height: width }}
        onClick={item.onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsHovered(false), 600);
        }}
        className={`group relative flex items-center justify-center rounded-2xl transition-colors duration-200 focus:outline-hidden ${
          item.isPrimary
            ? item.active
              ? "bg-gradient-to-tr from-[#7a12eb] via-[#8a38f5] to-[#0066cc] text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400"
              : "bg-gradient-to-tr from-[#7a12eb] to-[#8a38f5] text-white shadow-md hover:brightness-110"
            : item.active
            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
            : "text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
        } ${item.className || ""}`}
        aria-label={item.label}
      >
        <motion.div
          style={{ scale: animatedScale }}
          className="flex items-center justify-center"
        >
          {item.icon}
        </motion.div>

        {/* Active Pill Indicator on bottom */}
        {item.active && !item.isPrimary && (
          <span className="absolute -bottom-1 h-1 w-2 rounded-full bg-purple-500 dark:bg-purple-400" />
        )}

        {/* Badge counter */}
        {item.badge !== undefined && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-xs">
            {item.badge}
          </span>
        )}
      </motion.button>
    </div>
  );
}

export function Dock({
  items = [],
  className = "",
  panelHeight = 64,
  baseItemSize = 44,
  magnification = 58,
  distance = 120,
  spring,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.pageX);
  };

  const handleMouseLeave = () => {
    mouseX.set(Infinity);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      mouseX.set(e.touches[0].pageX);
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => mouseX.set(Infinity), 300);
  };

  return (
    <motion.nav
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ height: panelHeight }}
      aria-label="Bottom Dock Navigation"
      className={`relative flex items-center justify-center gap-1 sm:gap-2 rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-white/85 dark:bg-[#121214]/90 px-2 sm:px-3 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-shadow ${className}`}
    >
      {items.map((item, index) => (
        <DockItem
          key={`${item.label}-${index}`}
          item={item}
          mouseX={mouseX}
          baseItemSize={baseItemSize}
          magnification={magnification}
          distance={distance}
          spring={spring}
        />
      ))}
    </motion.nav>
  );
}

export default Dock;
