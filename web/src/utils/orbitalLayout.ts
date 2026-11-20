import type { HydratedIsland } from '../types/aether';

export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1400;
export const CENTER_X = 1000;
export const CENTER_Y = 700;
export const BASE_RADIUS_X = 520;
export const BASE_RADIUS_Y = 320;

export interface IslandPosition {
  slug: string;
  x: number;
  y: number;
  isCore: boolean;
  satelliteIndex: number;
}

export function computeArchipelagoPositions(
  islands: Pick<HydratedIsland, 'slug' | 'isCore' | 'order'>[],
): Map<string, IslandPosition> {
  const positions = new Map<string, IslandPosition>();
  if (islands.length === 0) {
    return positions;
  }

  const coreIsland = islands.find((island) => island.isCore) ?? islands[0];
  positions.set(coreIsland.slug, {
    slug: coreIsland.slug,
    x: CENTER_X,
    y: CENTER_Y,
    isCore: true,
    satelliteIndex: -1,
  });

  const satellites = islands
    .filter((island) => island.slug !== coreIsland.slug)
    .sort((a, b) => a.order - b.order);

  const count = satellites.length;
  if (count === 0) {
    return positions;
  }

  const expansion = count > 6 ? 45 * (count - 6) : 0;
  const radiusX = BASE_RADIUS_X + expansion;
  const radiusY = BASE_RADIUS_Y + expansion;

  // Para N = 4, offset = Math.PI / 4 posiciona exatamente nos 4 cantos (X simétrico)
  const angleOffset = count === 4 ? Math.PI / 4 : -Math.PI / 2;

  satellites.forEach((island, index) => {
    const theta = (2 * Math.PI * index) / count + angleOffset;
    positions.set(island.slug, {
      slug: island.slug,
      x: CENTER_X + radiusX * Math.cos(theta),
      y: CENTER_Y + radiusY * Math.sin(theta),
      isCore: false,
      satelliteIndex: index,
    });
  });

  return positions;
}
