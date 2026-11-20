import React from 'react';
import { cn } from '../../lib/cn';
import type { TotemStatus } from '../../types/aether';

export interface ArcaneChainProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status: TotemStatus;
  pulseNonce?: number;
}

const ENERGY_ANIMATION_CLASS: Record<TotemStatus, string> = {
  healthy: 'arcane-energy-healthy',
  warning: 'arcane-energy-warning',
  critical: 'arcane-energy-critical',
  unknown: '',
};

const ENERGY_GLOW_STYLE: Record<TotemStatus, string | undefined> = {
  healthy: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.75))',
  warning: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))',
  critical: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.95))',
  unknown: undefined,
};

const ANCHOR_CORE_COLOR: Record<TotemStatus, string> = {
  healthy: '#38BDF8',
  warning: '#F59E0B',
  critical: '#EF4444',
  unknown: '#64748B',
};

const ChainAnchor: React.FC<{ x: number; y: number; color: string }> = ({
  x,
  y,
  color,
}) => (
  <g transform={`translate(${x - 6}, ${y - 6})`} shapeRendering="crispEdges">
    {/* Contorno externo da argola de ferro */}
    <rect x="2" y="0" width="8" height="12" fill="#0D0F1A" />
    <rect x="0" y="2" width="12" height="8" fill="#0D0F1A" />
    {/* Aro metálico */}
    <rect x="2" y="2" width="8" height="8" fill="#262B40" />
    <rect x="3" y="2" width="6" height="2" fill="#3A4262" />
    {/* Cristal/núcleo arcano no pino */}
    <rect x="4" y="4" width="4" height="4" fill={color} />
  </g>
);

export const ArcaneChain: React.FC<ArcaneChainProps> = React.memo(
  ({ id, x1, y1, x2, y2, status, pulseNonce = 0 }) => {
    // Catenária simulada com deslocamento gravitacional (+75px)
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 + 75;
    const pathD = `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
    const gradientId = `arcane-chain-grad-${id}`;
    const coreColor = ANCHOR_CORE_COLOR[status];

    const energyStroke =
      status === 'healthy'
        ? `url(#${gradientId})`
        : status === 'warning'
          ? 'var(--chain-energy-warning)'
          : status === 'critical'
            ? 'var(--chain-energy-critical)'
            : 'var(--chain-energy-unknown)';

    return (
      <g data-chain-id={id} data-status={status}>
        {status === 'healthy' && (
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
            >
              <stop offset="0%" stopColor="var(--chain-energy-cyan)" />
              <stop offset="50%" stopColor="var(--chain-energy-violet)" />
              <stop offset="100%" stopColor="var(--chain-energy-cyan)" />
            </linearGradient>
          </defs>
        )}

        {/* Contorno escuro dos elos metálicos */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--chain-outline)"
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray="14 8"
        />

        {/* Elos metálicos base de ferro escuro */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--chain-metal)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray="14 8"
        />

        {/* Fluxo de energia arcana interno */}
        <path
          d={pathD}
          fill="none"
          stroke={energyStroke}
          strokeWidth={status === 'unknown' ? 2 : 3}
          strokeLinecap="round"
          strokeDasharray="12 20"
          className={cn(ENERGY_ANIMATION_CLASS[status])}
          style={{
            filter: ENERGY_GLOW_STYLE[status],
            opacity: status === 'unknown' ? 0.35 : 0.95,
          }}
        />

        {/* Ancoragens de ferro pixel art nas duas extremidades da corrente (#4) */}
        <ChainAnchor x={x1} y={y1} color={coreColor} />
        <ChainAnchor x={x2} y={y2} color={coreColor} />

        {/* Fagulha/orbe percorrendo a corrente no momento de um evento SSE (#7) */}
        {pulseNonce > 0 && (
          <g
            key={`${id}-pulse-${pulseNonce}`}
            style={{
              filter: `drop-shadow(0 0 8px ${coreColor})`,
            }}
          >
            <rect
              x="-4"
              y="-4"
              width="8"
              height="8"
              rx="1"
              fill="#FFFFFF"
              stroke={coreColor}
              strokeWidth="2"
              shapeRendering="crispEdges"
            >
              <animateMotion
                dur="0.95s"
                repeatCount="1"
                fill="freeze"
                path={pathD}
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.12;0.85;1"
                dur="0.95s"
                repeatCount="1"
                fill="freeze"
              />
            </rect>
          </g>
        )}
      </g>
    );
  },
);

ArcaneChain.displayName = 'ArcaneChain';
