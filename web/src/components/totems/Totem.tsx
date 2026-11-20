import React from 'react';
import totemBaseSprite from '../../assets/sprites/totem-base.webp';
import { cn } from '../../lib/cn';
import type { HydratedTotem, TotemStatus } from '../../types/aether';
import { PixelGlyph } from './pixelGlyphs';

const STATUS_LABEL: Record<TotemStatus, string> = {
  healthy: 'Saudável',
  warning: 'Instável',
  critical: 'Crítico',
  unknown: 'Desconhecido',
};

const RUNE_STATE_CLASS: Record<TotemStatus, string> = {
  healthy: 'totem-rune-healthy',
  warning: 'totem-rune-warning',
  critical: 'totem-rune-critical',
  unknown: 'totem-rune-unknown',
};

const NAMEPLATE_TEXT_CLASS: Record<TotemStatus, string> = {
  healthy: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  unknown: 'text-slate-300',
};

export interface TotemProps {
  totem: HydratedTotem;
  onSelect?: (totemId: string) => void;
}

export const Totem: React.FC<TotemProps> = React.memo(({ totem, onSelect }) => {
  const handleClick = () => {
    onSelect?.(totem.totemId);
  };

  const statusLabel = STATUS_LABEL[totem.status];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${totem.name} — ${statusLabel}`}
      className={cn(
        'group relative flex h-[96px] w-[64px] shrink-0 cursor-pointer items-center justify-center rounded-md',
        'focus:outline-none',
        !totem.enabled && 'opacity-60',
      )}
    >
      {/* Nickname estilo Minecraft exibido no hover/foco */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap',
          'rounded-[2px] bg-[#090B1A]/80 px-2 py-0.5 font-display text-[10px] leading-tight tracking-wide',
          'shadow-[0_2px_8px_rgba(0,0,0,0.65)]',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100',
          NAMEPLATE_TEXT_CLASS[totem.status],
        )}
      >
        {totem.name}
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
