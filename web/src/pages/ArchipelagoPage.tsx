import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import {
  ArchipelagoCanvas,
  type ArchipelagoCanvasHandle,
} from '../components/archipelago/ArchipelagoCanvas';
import { TwilightSky } from '../components/background/TwilightSky';
import {
  TotemDrawer,
  type SelectedTotemContext,
} from '../components/drawer/TotemDrawer';
import { TopHud } from '../components/hud/TopHud';
import { useAuth } from '../context/useAuth';
import { useAetherStream } from '../hooks/useAetherStream';
import { useIslands } from '../hooks/useIslands';
import type { TotemStatus } from '../types/aether';

export const ArchipelagoPage: React.FC = () => {
  const { logout } = useAuth();
  const { data, isLoading, isError, error, refetch } = useIslands();
  const { connectionState, islandPulses } = useAetherStream();

  const canvasRef = useRef<ArchipelagoCanvasHandle | null>(null);
  const focusCursorRef = useRef<Record<'critical' | 'warning', number>>({
    critical: 0,
    warning: 0,
  });

  const [selectedTotemId, setSelectedTotemId] = useState<string | null>(null);

  const hasCritical = (data?.summary.critical ?? 0) > 0;

  let selectedContext: SelectedTotemContext | null = null;
  if (selectedTotemId && data) {
    for (const island of data.islands) {
      const totem = island.totems.find((item) => item.totemId === selectedTotemId);
      if (totem) {
        selectedContext = { island, totem };
        break;
      }
    }
  }

  const handleSelectTotem = useCallback((totemId: string) => {
    setSelectedTotemId(totemId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTotemId(null);
  }, []);

  const handleRecenter = useCallback(() => {
    canvasRef.current?.recenter();
  }, []);

  const focusIslandByStatus = useCallback(
    (targetStatus: Extract<TotemStatus, 'critical' | 'warning'>) => {
      if (!data) {
        return;
      }
      const matchingIslands = data.islands.filter((island) =>
        island.totems.some((totem) => totem.status === targetStatus),
      );
      if (matchingIslands.length === 0) {
        return;
      }
      const cursor = focusCursorRef.current[targetStatus] % matchingIslands.length;
      const target = matchingIslands[cursor];
      focusCursorRef.current[targetStatus] = cursor + 1;
      if (target) {
        canvasRef.current?.focusIsland(target.slug);
      }
    },
    [data],
  );

  const handleFocusCritical = useCallback(() => {
    focusIslandByStatus('critical');
  }, [focusIslandByStatus]);

  const handleFocusWarning = useCallback(() => {
    focusIslandByStatus('warning');
  }, [focusIslandByStatus]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden"
      data-sse-state={connectionState}
    >
      <TwilightSky hasCritical={hasCritical} />

      <TopHud
        connectionState={connectionState}
        summary={data?.summary}
        onFocusCritical={handleFocusCritical}
        onFocusWarning={handleFocusWarning}
        onRecenter={handleRecenter}
        onLogout={logout}
      />

      {isLoading && (
        <div className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin text-violet-400"
            aria-hidden="true"
          />
          <p className="font-display text-xs tracking-widest text-[var(--text-secondary)] uppercase">
            Invocando Arquipélago...
          </p>
        </div>
      )}

      {isError && !isLoading && (
        <div className="relative z-20 flex h-full w-full items-center justify-center px-4">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-red-500/35 bg-[var(--surface-glass)] p-6 text-center backdrop-blur-md">
            <AlertTriangle
              className="h-8 w-8 text-red-400"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Falha ao carregar o arquipélago
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {error instanceof Error
                  ? error.message
                  : 'Não foi possível consultar a API.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-arcane)] bg-[var(--surface-card)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-violet-400/60 hover:bg-violet-500/15"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tentar novamente</span>
            </button>
          </div>
        </div>
      )}

      {data && !isLoading && (
        <ArchipelagoCanvas
          ref={canvasRef}
          islands={data.islands}
          hasCritical={hasCritical}
          islandPulses={islandPulses}
          onSelectTotem={handleSelectTotem}
        />
      )}

      <TotemDrawer selected={selectedContext} onClose={handleCloseDrawer} />
    </main>
  );
};
