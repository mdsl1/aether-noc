import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { cn } from '../../lib/cn';
import type { HydratedIsland } from '../../types/aether';
import {
  CENTER_X,
  CENTER_Y,
  computeArchipelagoPositions,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../utils/orbitalLayout';
import { ArcaneChain } from './ArcaneChain';
import { FloatingDebris } from './FloatingDebris';
import { Island } from './Island';
import { ZoomSidebar } from './ZoomSidebar';

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.0;

export interface ArchipelagoCanvasHandle {
  recenter: () => void;
  focusIsland: (islandSlug: string) => void;
}

export interface ArchipelagoCanvasProps {
  islands: HydratedIsland[];
  hasCritical?: boolean;
  islandPulses?: Record<string, number>;
  onSelectTotem?: (totemId: string) => void;
}

export const ArchipelagoCanvas = forwardRef<
  ArchipelagoCanvasHandle,
  ArchipelagoCanvasProps
>(({ islands, hasCritical = false, islandPulses = {}, onSelectTotem }, ref) => {
  const initialScale = useMemo(() => {
    if (typeof window === 'undefined') {
      return 1;
    }
    return window.innerWidth < 768 ? 0.65 : 1;
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [currentScale, setCurrentScale] = useState<number>(initialScale);
  const [isPanning, setIsPanning] = useState(false);

  // Chave estável de topologia para evitar recalcular posições em updates de um único totem (RNF-08)
  const topologyKey = islands
    .map((island) => `${island.slug}:${island.isCore ? 1 : 0}:${island.order}`)
    .join('|');

  const positions = useMemo(
    () => computeArchipelagoPositions(islands),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topologyKey],
  );

  const corePosition = useMemo(() => {
    for (const pos of positions.values()) {
      if (pos.isCore) {
        return pos;
      }
    }
    return { slug: 'core', x: CENTER_X, y: CENTER_Y };
  }, [positions]);

  const handleScaleChange = useCallback((nextScale: number) => {
    const api = transformRef.current;
    if (!api) {
      return;
    }

    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const wrapper = api.instance.wrapperComponent;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      void api.zoomToPoint(
        clamped,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        0,
      );
    } else {
      const { positionX, positionY } = api.instance.state;
      void api.setTransform(positionX, positionY, clamped, 0);
    }
    setCurrentScale(clamped);
  }, []);

  // Scroll do mouse com incremento suave e previsível (~7% por clique de scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const api = transformRef.current;
      if (!api) {
        return;
      }

      event.preventDefault();

      const current = api.instance.state.scale;
      // Normaliza deltaY para funcionar bem tanto em mouse tradicional quanto em trackpad
      const normalizedDelta = Math.max(-1, Math.min(1, event.deltaY / 100));
      const zoomFactor = 1 - normalizedDelta * 0.07;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, current * zoomFactor),
      );

      if (Math.abs(nextScale - current) < 0.0005) {
        return;
      }

      void api.zoomToPoint(nextScale, event.clientX, event.clientY, 0);
      setCurrentScale(nextScale);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleTransform = useCallback(
    (_ref: ReactZoomPanPinchRef, state: { scale: number }) => {
      setCurrentScale(state.scale);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      recenter() {
        const api = transformRef.current;
        if (!api) {
          return;
        }
        const targetScale =
          typeof window !== 'undefined' && window.innerWidth < 768 ? 0.65 : 1;
        void api.centerView(targetScale, 300, 'easeOut');
        setCurrentScale(targetScale);
      },
      focusIsland(islandSlug: string) {
        const api = transformRef.current;
        const pos = positions.get(islandSlug);
        if (!api || !pos) {
          return;
        }
        const wrapper = api.instance.wrapperComponent;
        const targetScale =
          typeof window !== 'undefined' && window.innerWidth < 768 ? 0.85 : 1.05;

        if (!wrapper) {
          void api.centerView(targetScale, 350, 'easeOut');
          setCurrentScale(targetScale);
          return;
        }

        const rect = wrapper.getBoundingClientRect();
        const targetX = rect.width / 2 - pos.x * targetScale;
        const targetY = rect.height / 2 - pos.y * targetScale;
        void api.setTransform(targetX, targetY, targetScale, 400, 'easeOut');
        setCurrentScale(targetScale);
      },
    }),
    [positions],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative z-10 h-full w-full',
        isPanning ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      <ZoomSidebar
        scale={currentScale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        onChangeScale={handleScaleChange}
      />

      <TransformWrapper
        ref={transformRef}
        initialScale={initialScale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        centerOnInit={true}
        limitToBounds={false}
        smooth={true}
        wheel={{ disabled: true }}
        pinch={{ step: 3 }}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: false }}
        onPanningStart={() => setIsPanning(true)}
        onPanningStop={() => setIsPanning(false)}
        onTransform={handleTransform}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{
            width: `${WORLD_WIDTH}px`,
            height: `${WORLD_HEIGHT}px`,
          }}
        >
          <div
            className="relative"
            style={{ width: `${WORLD_WIDTH}px`, height: `${WORLD_HEIGHT}px` }}
          >
            {/* Camada z-10: Correntes Arcanas */}
            <svg
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
              className="pointer-events-none absolute inset-0 z-10 overflow-visible"
              aria-hidden="true"
            >
              {islands.map((island) => {
                const pos = positions.get(island.slug);
                if (!pos || pos.isCore) {
                  return null;
                }
                const pulseNonce =
                  (islandPulses[island.slug] ?? 0) +
                  (islandPulses[corePosition.slug] ?? 0);
                return (
                  <ArcaneChain
                    key={island.slug}
                    id={island.slug}
                    x1={corePosition.x}
                    y1={corePosition.y + 18}
                    x2={pos.x}
                    y2={pos.y + 14}
                    status={island.status}
                    pulseNonce={pulseNonce}
                  />
                );
              })}
            </svg>

            {/* Camada z-15: Rochas, cristais e poeira arcana em volta da Core */}
            <FloatingDebris
              centerX={corePosition.x}
              centerY={corePosition.y}
              hasCritical={hasCritical}
            />

            {/* Camada z-20: Ilhas & Totens */}
            <div className="absolute inset-0 z-20">
              {islands.map((island) => {
                const pos = positions.get(island.slug);
                if (!pos) {
                  return null;
                }
                return (
                  <Island
                    key={island.slug}
                    island={island}
                    x={pos.x}
                    y={pos.y}
                    satelliteIndex={pos.satelliteIndex}
                    onSelectTotem={onSelectTotem}
                  />
                );
              })}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

ArchipelagoCanvas.displayName = 'ArchipelagoCanvas';
