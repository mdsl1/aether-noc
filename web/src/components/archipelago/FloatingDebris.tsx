import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface DebrisSpec {
  id: string;
  dx: number;
  dy: number;
  variant: 'rock-md' | 'rock-sm' | 'crystal' | 'pebble';
  floatAmp: number;
  duration: number;
  delay: number;
}

interface ArcaneMoteSpec {
  id: string;
  dx: number;
  dy: number;
  size: number;
  tone: 'cyan' | 'violet';
  duration: string;
  delay: string;
}

// Rochas e fragmentos arcanos flutuando ao redor da ilha Core para ambientação
const CORE_DEBRIS: DebrisSpec[] = [
  { id: 'c-nw-rock', dx: -188, dy: -42, variant: 'rock-md', floatAmp: 5, duration: 4.8, delay: 0.2 },
  { id: 'c-w-pebble', dx: -162, dy: 58, variant: 'pebble', floatAmp: 4, duration: 3.9, delay: 1.1 },
  { id: 'c-sw-crystal', dx: -118, dy: 112, variant: 'crystal', floatAmp: 6, duration: 4.4, delay: 0.7 },
  { id: 'c-ne-rock', dx: 184, dy: -34, variant: 'rock-sm', floatAmp: 5, duration: 5.3, delay: 1.5 },
  { id: 'c-e-crystal', dx: 172, dy: 48, variant: 'crystal', floatAmp: 4, duration: 4.1, delay: 0.4 },
  { id: 'c-se-rock', dx: 126, dy: 108, variant: 'rock-md', floatAmp: 5, duration: 5.7, delay: 2.0 },
  { id: 'c-s-pebble', dx: -24, dy: 142, variant: 'pebble', floatAmp: 4, duration: 4.6, delay: 1.3 },
  { id: 'c-s-pebble-2', dx: 46, dy: 134, variant: 'rock-sm', floatAmp: 3, duration: 5.1, delay: 0.9 },
];

// Poeira arcana / vaga-lumes pixelados subindo ao redor da Core (#2)
const ARCANE_MOTES: ArcaneMoteSpec[] = [
  { id: 'm1', dx: -146, dy: 34, size: 3, tone: 'cyan', duration: '6.2s', delay: '0.0s' },
  { id: 'm2', dx: -112, dy: -22, size: 4, tone: 'violet', duration: '7.4s', delay: '1.2s' },
  { id: 'm3', dx: -76, dy: 82, size: 3, tone: 'cyan', duration: '5.8s', delay: '2.5s' },
  { id: 'm4', dx: -38, dy: -56, size: 3, tone: 'violet', duration: '6.9s', delay: '0.7s' },
  { id: 'm5', dx: 18, dy: 96, size: 4, tone: 'cyan', duration: '7.1s', delay: '3.1s' },
  { id: 'm6', dx: 64, dy: -44, size: 3, tone: 'violet', duration: '6.0s', delay: '1.8s' },
  { id: 'm7', dx: 108, dy: 64, size: 3, tone: 'cyan', duration: '6.6s', delay: '0.4s' },
  { id: 'm8', dx: 144, dy: -12, size: 4, tone: 'violet', duration: '7.8s', delay: '2.2s' },
  { id: 'm9', dx: -172, dy: -6, size: 3, tone: 'violet', duration: '6.4s', delay: '3.6s' },
  { id: 'm10', dx: 162, dy: 24, size: 3, tone: 'cyan', duration: '5.9s', delay: '1.5s' },
  { id: 'm11', dx: -12, dy: 118, size: 3, tone: 'violet', duration: '7.2s', delay: '2.9s' },
  { id: 'm12', dx: 82, dy: 18, size: 3, tone: 'cyan', duration: '6.7s', delay: '4.1s' },
];

const DebrisSprite: React.FC<{ variant: DebrisSpec['variant'] }> = ({
  variant,
}) => {
  if (variant === 'rock-md') {
    return (
      <svg
        width="28"
        height="24"
        viewBox="0 0 14 12"
        className="pixel-art"
        shapeRendering="crispEdges"
      >
        <path
          d="M4 1h6v1h2v2h1v3h-1v2h-2v1H8v1H5v-1H3V8H2V5h1V2h1V1z"
          fill="#070810"
        />
        <rect x="4" y="2" width="6" height="2" fill="#2D5A3F" />
        <rect x="3" y="4" width="8" height="3" fill="#1B1F30" />
        <rect x="3" y="4" width="3" height="2" fill="#282E46" />
        <rect x="4" y="7" width="6" height="2" fill="#151827" />
        <rect x="5" y="9" width="3" height="1" fill="#0D0F1A" />
      </svg>
    );
  }

  if (variant === 'rock-sm') {
    return (
      <svg
        width="20"
        height="18"
        viewBox="0 0 10 9"
        className="pixel-art"
        shapeRendering="crispEdges"
      >
        <path d="M3 1h4v1h2v3H8v2H6v1H3V7H2V5H1V3h2V1z" fill="#070810" />
        <rect x="3" y="2" width="4" height="2" fill="#282E46" />
        <rect x="2" y="4" width="6" height="2" fill="#1B1F30" />
        <rect x="3" y="6" width="3" height="1" fill="#0D0F1A" />
      </svg>
    );
  }

  if (variant === 'crystal') {
    return (
      <svg
        width="16"
        height="20"
        viewBox="0 0 8 10"
        className="pixel-art drop-shadow-[0_0_6px_rgba(168,85,247,0.55)]"
        shapeRendering="crispEdges"
      >
        <path d="M3 0h2v2h1v5H5v2H3V7H2V2h1V0z" fill="#070810" />
        <rect x="3" y="1" width="2" height="2" fill="#A855F7" />
        <rect x="3" y="3" width="1" height="4" fill="#C084FC" />
        <rect x="4" y="3" width="1" height="4" fill="#6D44BA" />
        <rect x="3" y="7" width="2" height="1" fill="#3B2363" />
      </svg>
    );
  }

  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 6 6"
      className="pixel-art"
      shapeRendering="crispEdges"
    >
      <rect x="1" y="1" width="4" height="4" fill="#070810" />
      <rect x="2" y="2" width="2" height="1" fill="#282E46" />
      <rect x="2" y="3" width="2" height="1" fill="#151827" />
    </svg>
  );
};

export interface FloatingDebrisProps {
  centerX: number;
  centerY: number;
  hasCritical?: boolean;
}

export const FloatingDebris: React.FC<FloatingDebrisProps> = React.memo(
  ({ centerX, centerY, hasCritical = false }) => {
    const prefersReducedMotion = useReducedMotion();

    return (
      <div
        className="pointer-events-none absolute inset-0 z-15"
        aria-hidden="true"
      >
        {/* Poeira arcana / vaga-lumes (trocam para faíscas carmesim em alerta crítico) */}
        {ARCANE_MOTES.map((mote) => {
          const color = hasCritical
            ? '#EF4444'
            : mote.tone === 'cyan'
              ? '#38BDF8'
              : '#A855F7';
          const shadow = hasCritical
            ? '0 0 6px rgba(239, 68, 68, 0.85)'
            : mote.tone === 'cyan'
              ? '0 0 6px rgba(56, 189, 248, 0.8)'
              : '0 0 6px rgba(168, 85, 247, 0.8)';

          return (
            <span
              key={mote.id}
              className="aether-mote absolute block"
              style={{
                left: `${centerX + mote.dx}px`,
                top: `${centerY + mote.dy}px`,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                backgroundColor: color,
                boxShadow: shadow,
                animationDuration: mote.duration,
                animationDelay: mote.delay,
              }}
            />
          );
        })}

        {/* Rochas e cristais flutuantes */}
        {CORE_DEBRIS.map((item) => (
          <div
            key={item.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${centerX + item.dx}px`,
              top: `${centerY + item.dy}px`,
            }}
          >
            <motion.div
              animate={
                prefersReducedMotion
                  ? undefined
                  : { y: [-item.floatAmp, item.floatAmp, -item.floatAmp] }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: item.duration,
                      delay: item.delay,
                      ease: 'easeInOut',
                      repeat: Infinity,
                    }
              }
            >
              <DebrisSprite variant={item.variant} />
            </motion.div>
          </div>
        ))}
      </div>
    );
  },
);

FloatingDebris.displayName = 'FloatingDebris';
