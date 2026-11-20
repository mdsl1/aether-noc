import React from 'react';
import { cn } from '../../lib/cn';

interface TwinkleStar {
  x: number;
  y: number;
  size: number;
  color: string;
  duration: string;
  delay: string;
}

const TWINKLE_STARS: TwinkleStar[] = [
  { x: 24, y: 18, size: 1.5, color: '#F1F5F9', duration: '3.8s', delay: '0.2s' },
  { x: 58, y: 36, size: 1, color: '#C4B5FD', duration: '5.1s', delay: '1.4s' },
  { x: 96, y: 14, size: 1.5, color: '#A5F3FC', duration: '4.3s', delay: '2.1s' },
  { x: 142, y: 28, size: 1, color: '#F1F5F9', duration: '3.6s', delay: '0.8s' },
  { x: 188, y: 12, size: 1.5, color: '#C4B5FD', duration: '5.5s', delay: '1.9s' },
  { x: 224, y: 42, size: 1, color: '#F1F5F9', duration: '4.1s', delay: '3.0s' },
  { x: 262, y: 20, size: 1.5, color: '#A5F3FC', duration: '4.8s', delay: '0.5s' },
  { x: 334, y: 54, size: 1, color: '#F1F5F9', duration: '3.9s', delay: '2.6s' },
  { x: 42, y: 82, size: 1, color: '#C4B5FD', duration: '5.2s', delay: '1.1s' },
  { x: 164, y: 74, size: 1, color: '#F1F5F9', duration: '4.6s', delay: '2.4s' },
  { x: 286, y: 88, size: 1, color: '#C4B5FD', duration: '4.0s', delay: '0.9s' },
  { x: 118, y: 118, size: 1, color: '#A5F3FC', duration: '5.4s', delay: '1.7s' },
];

const PixelCloudClusterFar: React.FC = () => (
  <g>
    {/* Nuvem 1 (superior esquerda) */}
    <g transform="translate(26, 22)">
      <rect x="14" y="0" width="22" height="3" fill="#4C2E7A" />
      <rect x="8" y="3" width="38" height="4" fill="#3B2363" />
      <rect x="0" y="7" width="54" height="5" fill="#2A184A" />
      <rect x="6" y="12" width="40" height="3" fill="#1F1238" />
    </g>

    {/* Nuvem 2 (superior centro-direita) */}
    <g transform="translate(182, 16)">
      <rect x="18" y="0" width="28" height="3" fill="#4C2E7A" />
      <rect x="10" y="3" width="48" height="4" fill="#3B2363" />
      <rect x="2" y="7" width="66" height="5" fill="#2A184A" />
      <rect x="12" y="12" width="44" height="3" fill="#1F1238" />
      <rect x="64" y="13" width="14" height="3" fill="#2A184A" />
    </g>

    {/* Nuvem 3 (meio-inferior esquerda) */}
    <g transform="translate(96, 134)">
      <rect x="12" y="0" width="20" height="3" fill="#4C2E7A" />
      <rect x="4" y="3" width="38" height="4" fill="#3B2363" />
      <rect x="0" y="7" width="48" height="4" fill="#2A184A" />
    </g>

    {/* Nuvem 4 (direita) */}
    <g transform="translate(294, 86)">
      <rect x="10" y="0" width="24" height="3" fill="#4C2E7A" />
      <rect x="4" y="3" width="40" height="4" fill="#3B2363" />
      <rect x="0" y="7" width="52" height="5" fill="#2A184A" />
      <rect x="8" y="12" width="32" height="2" fill="#1F1238" />
    </g>
  </g>
);

const PixelCloudClusterNear: React.FC = () => (
  <g>
    {/* Nuvem 1 (faixa média esquerda) */}
    <g transform="translate(18, 92)">
      <rect x="20" y="0" width="26" height="3" fill="#5B3791" />
      <rect x="10" y="3" width="52" height="4" fill="#442870" />
      <rect x="0" y="7" width="72" height="6" fill="#321C54" />
      <rect x="10" y="13" width="50" height="3" fill="#23133D" />
      <rect x="58" y="16" width="18" height="2" fill="#321C54" />
    </g>

    {/* Nuvem 2 (superior centro) */}
    <g transform="translate(132, 46)">
      <rect x="16" y="0" width="20" height="3" fill="#5B3791" />
      <rect x="6" y="3" width="44" height="4" fill="#442870" />
      <rect x="0" y="7" width="58" height="5" fill="#321C54" />
      <rect x="8" y="12" width="38" height="3" fill="#23133D" />
    </g>

    {/* Nuvem 3 (inferior direita) */}
    <g transform="translate(248, 166)">
      <rect x="18" y="0" width="30" height="3" fill="#5B3791" />
      <rect x="8" y="3" width="56" height="4" fill="#442870" />
      <rect x="0" y="7" width="74" height="5" fill="#321C54" />
      <rect x="14" y="12" width="46" height="3" fill="#23133D" />
    </g>
  </g>
);

export interface TwilightSkyProps {
  hasCritical?: boolean;
}

export const TwilightSky: React.FC<TwilightSkyProps> = React.memo(
  ({ hasCritical = false }) => {
    const moonMain = hasCritical ? '#FCA5A5' : '#E2E8F0';
    const moonShade = hasCritical ? '#DC2626' : '#94A3B8';

    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Céu crepuscular/noturno em gradiente profundo */}
        <div className="aether-sky-gradient absolute inset-0" />

        {/* Reatividade climática global quando há alerta crítico (#5) */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            hasCritical ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(127, 29, 29, 0.24), rgba(9, 11, 26, 0.35) 65%, transparent 100%)',
          }}
        />

        {/* Relâmpago distante sutil nas nuvens em estado crítico (#5) */}
        {hasCritical && (
          <div
            className="aether-lightning-flash absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 55% 35% at 72% 18%, rgba(248, 113, 113, 0.55), transparent 70%)',
            }}
          />
        )}

        {/* Estrelas sutis base */}
        <div className="aether-starfield absolute inset-0 opacity-75" />

        {/* Estrelas cintilantes + Lua crescente pixel art (#1) */}
        <svg
          className="pixel-art absolute inset-0 h-full w-full"
          viewBox="0 0 360 225"
          preserveAspectRatio="xMidYMid slice"
          shapeRendering="crispEdges"
        >
          {TWINKLE_STARS.map((star, index) => (
            <rect
              key={index}
              x={star.x}
              y={star.y}
              width={star.size}
              height={star.size}
              fill={star.color}
              className="aether-star-twinkle"
              style={{
                animationDuration: star.duration,
                animationDelay: star.delay,
              }}
            />
          ))}

          {/* Lua crescente pixel art no canto superior direito */}
          <g
            transform="translate(306, 24)"
            style={{
              filter: hasCritical
                ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.55))'
                : 'drop-shadow(0 0 8px rgba(196, 181, 253, 0.4))',
            }}
          >
            <rect x="5" y="0" width="5" height="2" fill={moonMain} />
            <rect x="3" y="2" width="4" height="2" fill={moonMain} />
            <rect x="1" y="4" width="4" height="2" fill={moonMain} />
            <rect x="0" y="6" width="4" height="4" fill={moonMain} />
            <rect x="1" y="10" width="4" height="2" fill={moonMain} />
            <rect x="3" y="12" width="4" height="2" fill={moonMain} />
            <rect x="5" y="14" width="5" height="2" fill={moonMain} />
            <rect x="9" y="12" width="2" height="2" fill={moonShade} />
            <rect x="9" y="2" width="2" height="2" fill={moonShade} />
            <rect x="3" y="6" width="1" height="4" fill={moonShade} />
          </g>
        </svg>

        {/* Camada 1 de nuvens pixel art (distante e lenta, loop contínuo 200%) */}
        <div className="aether-clouds-far absolute inset-y-0 left-0 flex w-[200%] opacity-30">
          <svg
            className="pixel-art h-full w-1/2 shrink-0"
            viewBox="0 0 360 225"
            preserveAspectRatio="xMidYMid slice"
            shapeRendering="crispEdges"
          >
            <PixelCloudClusterFar />
          </svg>
          <svg
            className="pixel-art h-full w-1/2 shrink-0"
            viewBox="0 0 360 225"
            preserveAspectRatio="xMidYMid slice"
            shapeRendering="crispEdges"
          >
            <PixelCloudClusterFar />
          </svg>
        </div>

        {/* Ilhotas minúsculas decorativas no fundo para profundidade (#8) */}
        <svg
          className="pixel-art absolute inset-0 h-full w-full opacity-25"
          viewBox="0 0 360 225"
          preserveAspectRatio="xMidYMid slice"
          shapeRendering="crispEdges"
        >
          {/* Ilhota distante esquerda */}
          <g className="aether-distant-islet" style={{ animationDelay: '0s' }}>
            <g transform="translate(52, 168)">
              <rect x="0" y="0" width="16" height="2" fill="#2B1B4A" />
              <rect x="2" y="2" width="12" height="3" fill="#1C1234" />
              <rect x="4" y="5" width="8" height="3" fill="#140D28" />
              <rect x="6" y="8" width="4" height="3" fill="#140D28" />
              <rect x="7" y="11" width="2" height="2" fill="#140D28" />
            </g>
          </g>

          {/* Ilhota distante direita superior */}
          <g className="aether-distant-islet" style={{ animationDelay: '3.2s' }}>
            <g transform="translate(296, 138)">
              <rect x="0" y="0" width="12" height="2" fill="#2B1B4A" />
              <rect x="1" y="2" width="10" height="2" fill="#1C1234" />
              <rect x="3" y="4" width="6" height="3" fill="#140D28" />
              <rect x="5" y="7" width="2" height="2" fill="#140D28" />
            </g>
          </g>

          {/* Ilhota distante centro-inferior */}
          <g className="aether-distant-islet" style={{ animationDelay: '1.8s' }}>
            <g transform="translate(198, 192)">
              <rect x="0" y="0" width="10" height="1" fill="#2B1B4A" />
              <rect x="1" y="1" width="8" height="2" fill="#1C1234" />
              <rect x="3" y="3" width="4" height="3" fill="#140D28" />
              <rect x="4" y="6" width="2" height="2" fill="#140D28" />
            </g>
          </g>
        </svg>

        {/* Camada 2 de nuvens pixel art (mais próxima e um pouco mais rápida) */}
        <div className="aether-clouds-near absolute inset-y-0 left-0 flex w-[200%] opacity-25">
          <svg
            className="pixel-art h-full w-1/2 shrink-0"
            viewBox="0 0 360 225"
            preserveAspectRatio="xMidYMid slice"
            shapeRendering="crispEdges"
          >
            <PixelCloudClusterNear />
          </svg>
          <svg
            className="pixel-art h-full w-1/2 shrink-0"
            viewBox="0 0 360 225"
            preserveAspectRatio="xMidYMid slice"
            shapeRendering="crispEdges"
          >
            <PixelCloudClusterNear />
          </svg>
        </div>

        {/* Névoa violeta inferior GPU-accelerated */}
        <div className="aether-mist absolute -inset-x-[8%] bottom-0 h-[55%]" />
      </div>
    );
  },
);

TwilightSky.displayName = 'TwilightSky';
