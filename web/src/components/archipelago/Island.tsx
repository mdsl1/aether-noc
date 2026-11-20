import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import islandCoreSprite from '../../assets/sprites/island-core.webp';
import islandLgSprite from '../../assets/sprites/island-lg.webp';
import islandMdSprite from '../../assets/sprites/island-md.webp';
import islandSmSprite from '../../assets/sprites/island-sm.webp';
import { cn } from '../../lib/cn';
import type { HydratedIsland, TotemStatus } from '../../types/aether';
import { Totem } from '../totems/Totem';

const STATUS_DOT_CLASS: Record<TotemStatus, string> = {
  healthy: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.75)]',
  warning: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
  critical: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95)]',
  unknown: 'bg-slate-400',
};

const STATUS_BADGE_BORDER: Record<TotemStatus, string> = {
  healthy: 'border-emerald-500/30',
  warning: 'border-amber-500/45',
  critical: 'border-red-500/60',
  unknown: 'border-[var(--border-arcane)]',
};

interface IslandSpriteSpec {
  src: string;
  width: number;
  height: number;
}

function resolveIslandSprite(
  isCore: boolean,
  totemCount: number,
): IslandSpriteSpec {
  if (isCore && totemCount <= 3) {
    return { src: islandCoreSprite, width: 296, height: 156 };
  }
  if (totemCount <= 2) {
    return { src: islandSmSprite, width: 224, height: 124 };
  }
  if (totemCount <= 4) {
    return { src: islandMdSprite, width: 356, height: 140 };
  }
  return { src: islandLgSprite, width: 496, height: 156 };
}

export interface IslandProps {
  island: HydratedIsland;
  x: number;
  y: number;
  satelliteIndex: number;
  onSelectTotem?: (totemId: string) => void;
}

export const Island: React.FC<IslandProps> = React.memo(
  ({ island, x, y, satelliteIndex, onSelectTotem }) => {
    const prefersReducedMotion = useReducedMotion();
    const sprite = resolveIslandSprite(island.isCore, island.totems.length);

    // Duração alternada entre 4.5s e 6.5s com atraso dessincronizado
    const floatIndex = island.isCore ? 0 : satelliteIndex + 1;
    const duration = floatIndex % 2 === 0 ? 5.2 : 6.4;
    const delay = floatIndex * 0.6;

    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 select-none hover:z-30 focus-within:z-30"
        style={{ left: `${x}px`, top: `${y}px` }}
        data-island-slug={island.slug}
      >
        <motion.div
          className="relative flex flex-col items-center"
          animate={prefersReducedMotion ? undefined : { y: [-6, 6, -6] }}
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration,
                  delay,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }
          }
        >
          {/* Fileira horizontal de totens cravados sobre o topo plano de grama (GROUND_Y = 12px) */}
          <div className="relative z-10 -mb-[18px] flex flex-nowrap items-end justify-center gap-2">
            {island.totems.map((totem) => (
              <Totem
                key={totem.totemId}
                totem={totem}
                onSelect={onSelectTotem}
              />
            ))}
          </div>

          {/* Sprite 2D da Ilha Flutuante */}
          <img
            src={sprite.src}
            alt={island.name}
            width={sprite.width}
            height={sprite.height}
            draggable={false}
            className="pixel-art pointer-events-none block select-none"
            style={{ width: `${sprite.width}px`, height: `${sprite.height}px` }}
          />

          {/* Placa de Identificação da Ilha */}
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-1 backdrop-blur-md',
              'bg-[var(--surface-glass)] shadow-lg shadow-black/40',
              STATUS_BADGE_BORDER[island.status],
            )}
          >
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 rounded-full', STATUS_DOT_CLASS[island.status])}
            />
            <span className="font-display text-xs tracking-wider text-[var(--text-primary)] uppercase">
              {island.name}
            </span>
          </div>
        </motion.div>
      </div>
    );
  },
);

Island.displayName = 'Island';
