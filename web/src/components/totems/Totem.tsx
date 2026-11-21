import React from 'react';
import totemBaseSprite from '../../assets/sprites/totem-base.webp';
import { cn } from '../../lib/cn';
import type { HydratedTotem, TotemStatus } from '../../types/aether';
import { formatRelativeTime } from '../../utils/dateFormat';
import {
  getTotemQuickSummary,
  STATUS_PRESENTATION,
} from '../../utils/totemPresentation';
import { PixelGlyph } from './pixelGlyphs';

const RUNE_STATE_CLASS: Record<TotemStatus, string> = {
  healthy: 'totem-rune-healthy',
  warning: 'totem-rune-warning',
  critical: 'totem-rune-critical',
  unknown: 'totem-rune-unknown',
};

export interface TotemProps {
  totem: HydratedTotem;
  onSelect?: (totemId: string) => void;
}

export const Totem: React.FC<TotemProps> = React.memo(({ totem, onSelect }) => {
  const handleClick = () => {
    onSelect?.(totem.totemId);
  };

  const presentation = STATUS_PRESENTATION[totem.status];
  const StatusIcon = presentation.Icon;
  const quickSummary = getTotemQuickSummary(totem);
  const relativeLastCheck = formatRelativeTime(totem.lastCheckAt);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${totem.name} — ${presentation.label}`}
      className={cn(
        'group relative flex h-[96px] w-[64px] shrink-0 cursor-pointer items-center justify-center rounded-md',
        'focus:outline-none',
        !totem.enabled && 'opacity-60',
      )}
    >
      {/* Hover Tooltip (Desktop) — Camada z-30 */}
      <span
        role="tooltip"
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[230px] -translate-x-1/2 flex-col gap-1.5 rounded-lg border border-[var(--border-arcane)] bg-[var(--surface-glass)] px-3 py-2 text-left shadow-xl shadow-black/70 backdrop-blur-md md:flex',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100',
        )}
      >
        <span className="flex items-center justify-between gap-2.5">
          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
            {totem.name}
          </span>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
              presentation.badgeClass,
            )}
          >
            <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{presentation.label}</span>
          </span>
        </span>

        <span className="truncate font-mono text-[11px] text-[var(--text-primary)]/90">
          {quickSummary}
        </span>

        <span className="font-mono text-[10px] text-[var(--text-secondary)]">
          {relativeLastCheck}
        </span>
      </span>

      {/* Anel de aura carmesim para estado crítico */}
      {totem.status === 'critical' && (
        <span
          aria-hidden="true"
          className="totem-critical-aura pointer-events-none absolute top-[32px] left-[16px] h-[32px] w-[32px] rounded-full border-2 border-red-500/80"
        />
      )}

      {/* Camada 1: Sprite estático do monólito de pedra com contorno branco no hover */}
      <img
        src={totemBaseSprite}
        alt=""
        width={64}
        height={96}
        draggable={false}
        className="pixel-art totem-hover-outline pointer-events-none block h-[96px] w-[64px] select-none"
      />

      {/* Camada 2: Runa Pixel SVG reativa ao estado */}
      <PixelGlyph
        iconKey={totem.iconKey}
        className={cn(
          'pointer-events-none absolute top-[40px] left-[24px] h-[16px] w-[16px]',
          RUNE_STATE_CLASS[totem.status],
        )}
      />
    </button>
  );
});

Totem.displayName = 'Totem';
