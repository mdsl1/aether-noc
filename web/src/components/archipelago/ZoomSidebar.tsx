import React, { useCallback, useRef } from 'react';

export interface ZoomSidebarProps {
  scale: number;
  minScale: number;
  maxScale: number;
  onChangeScale: (nextScale: number) => void;
}

export const ZoomSidebar: React.FC<ZoomSidebarProps> = React.memo(
  ({ scale, minScale, maxScale, onChangeScale }) => {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const draggingRef = useRef(false);

    const clampScale = useCallback(
      (value: number) => Math.min(maxScale, Math.max(minScale, value)),
      [minScale, maxScale],
    );

    const updateFromClientY = useCallback(
      (clientY: number) => {
        const track = trackRef.current;
        if (!track) {
          return;
        }
        const rect = track.getBoundingClientRect();
        const padding = 10;
        const usableHeight = Math.max(1, rect.height - padding * 2);
        // Topo = maxScale, base = minScale
        const ratio = 1 - (clientY - (rect.top + padding)) / usableHeight;
        const clampedRatio = Math.min(1, Math.max(0, ratio));
        const nextScale = minScale + clampedRatio * (maxScale - minScale);
        onChangeScale(clampScale(nextScale));
      },
      [minScale, maxScale, clampScale, onChangeScale],
    );

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromClientY(event.clientY);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }
      updateFromClientY(event.clientY);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }
      draggingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = 0.05;
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault();
        onChangeScale(clampScale(scale + step));
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault();
        onChangeScale(clampScale(scale - step));
      } else if (event.key === 'Home') {
        event.preventDefault();
        onChangeScale(minScale);
      } else if (event.key === 'End') {
        event.preventDefault();
        onChangeScale(maxScale);
      }
    };

    const normalized =
      (clampScale(scale) - minScale) / Math.max(0.001, maxScale - minScale);
    const thumbTopPercent = (1 - normalized) * 100;
    const zoomPercent = Math.round(scale * 100);

    return (
      <aside
        aria-label="Controle de zoom"
        className="fixed top-28 left-4 z-40 flex flex-col items-center gap-2.5 select-none"
      >
        <span className="text-[13px] font-medium tracking-wide text-[var(--text-primary)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          Zoom
        </span>

        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Zoom do arquipélago"
          aria-orientation="vertical"
          aria-valuemin={Math.round(minScale * 100)}
          aria-valuemax={Math.round(maxScale * 100)}
          aria-valuenow={zoomPercent}
          aria-valuetext={`${zoomPercent}%`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative flex h-[256px] w-[24px] cursor-ns-resize items-center justify-center rounded-full border border-[var(--border-arcane)] bg-[var(--surface-glass)] py-[10px] shadow-lg shadow-black/50 backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <div className="relative h-full w-full">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.75)] transition-[top] duration-75"
              style={{ top: `${thumbTopPercent}%` }}
            />
          </div>
        </div>

        <span className="font-mono text-[11px] text-[var(--text-secondary)]">
          {zoomPercent}%
        </span>
      </aside>
    );
  },
);

ZoomSidebar.displayName = 'ZoomSidebar';
