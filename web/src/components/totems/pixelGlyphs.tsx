import React from 'react';

export type IconKey =
  | 'server'
  | 'n8n'
  | 'globe'
  | 'api'
  | 'database'
  | 'ai_agent'
  | 'backup';

export type PixelGlyphProps = React.SVGProps<SVGSVGElement> & {
  iconKey: IconKey;
};

const ServerGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Top rack unit */}
    <path d="M2 2h12v3H2V2zm2 1v1h2V3H4zm7 0v1h1V3h-1z" />
    {/* Middle rack unit */}
    <path d="M2 6h12v3H2V6zm2 1v1h2V7H4zm7 0v1h1V7h-1z" />
    {/* Bottom rack unit */}
    <path d="M2 10h12v3H2v-3zm2 1v1h2v-1H4zm7 0v1h1v-1h-1z" />
    {/* Base feet */}
    <path d="M3 13h2v1H3v-1zm8 0h2v1h-2v-1z" />
  </svg>
);

const N8nGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Left node */}
    <path d="M1 6h4v4H1V6zm1 1v2h2V7H2z" />
    {/* Top-right node */}
    <path d="M11 2h4v4h-4V2zm1 1v2h2V3h-2z" />
    {/* Bottom-right node */}
    <path d="M11 10h4v4h-4v-4zm1 1v2h2v-2h-2z" />
    {/* Connecting flow lines */}
    <path d="M5 7h3v2H5V7zm3-3h3v1H8V4zm0 7h3v1H8v-1zM8 5h1v6H8V5z" />
  </svg>
);

const GlobeGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Outer circle */}
    <path d="M5 1h6v1H5V1zM3 2h2v1H3V2zm8 0h2v1h-2V2zM2 3h1v2H2V3zm11 0h1v2h-1V3zM1 5h1v6H1V5zm13 0h1v6h-1V5zM2 11h1v2H2v-2zm11 0h1v2h-1v-2zM3 13h2v1H3v-1zm8 0h2v1h-2v-1zM5 14h6v1H5v-1z" />
    {/* Equator & central meridian */}
    <path d="M2 7h12v1H2V7zm5-5h1v12H7V2z" />
    {/* Curved meridians */}
    <path d="M5 3h1v2H5V3zm0 8h1v2H5v-2zM4 5h1v6H4V5zm6-2h1v2h-1V3zm0 8h1v2h-1v-2zm1-6h1v6h-1V5z" />
    {/* Latitude arcs */}
    <path d="M3 4h10v1H3V4zm0 7h10v1H3v-1z" />
  </svg>
);

const ApiGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Left bracket < */}
    <path d="M4 4h2v1H4V4zM3 5h2v1H3V5zM2 6h2v1H2V6zM1 7h2v2H1V7zM2 9h2v1H2V9zM3 10h2v1H3v-1zM4 11h2v1H4v-1z" />
    {/* Right bracket > */}
    <path d="M10 4h2v1h-2V4zm1 1h2v1h-2V5zm1 1h2v1h-2V6zm1 1h2v2h-2V7zm-1 2h2v1h-2V9zm-1 1h2v1h-2v-1zm-1 1h2v1h-2v-1z" />
    {/* Center slash / */}
    <path d="M9 3h1v2H9V3zM8 5h1v2H8V5zM7 7h1v2H7V7zM6 9h1v2H6V9zM5 11h1v2H5v-2z" />
  </svg>
);

const DatabaseGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Floppy disk outer frame */}
    <path d="M2 1h11v1H2V1zm11 1h1v1h-1V2zM1 2h1v12H1V2zm13 1h1v11h-1V3zM2 14h12v1H2v-1z" />
    {/* Top shutter */}
    <path d="M4 2h1v4H4V2zm6 0h1v4h-1V2zM5 5h5v1H5V5zm3-2h1v2H8V3z" />
    {/* Bottom label */}
    <path d="M4 9h8v1H4V9zm0 1h1v4H4v-4zm7 0h1v4h-1v-4zm-6 2h6v1H5v-1z" />
  </svg>
);

const AiAgentGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Arcane 4-point star + core */}
    <path d="M7 1h2v3H7V1zM7 12h2v3H7v-3zM1 7h3v2H1V7zm11 0h3v2h-3V7z" />
    <path d="M6 4h4v2H6V4zm0 6h4v2H6v-2zM4 6h2v4H4V6zm6 0h2v4h-2V6z" />
    <path d="M7 7h2v2H7V7z" />
    {/* Corner sparks */}
    <path d="M3 3h1v1H3V3zm9 0h1v1h-1V3zM3 12h1v1H3v-1zm9 0h1v1h-1v-1z" />
  </svg>
);

const BackupGlyph: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
    {...props}
  >
    {/* Cloud outline */}
    <path d="M5 2h4v1H5V2zM3 3h2v1H3V3zm6 0h3v1H9V3zM2 4h1v2H2V4zm10 0h1v2h-1V4zM1 6h1v3H1V6zm12 0h2v3h-2V6zM2 9h2v1H2V9zm10 0h2v1h-2V9z" />
    {/* Circular restore arrow */}
    <path d="M7 7h3v1H7V7zM6 8h2v1H6V8zm4 0h1v4h-1V8zM7 6h1v1H7V6zm0 3h1v1H7V9zM5 9h1v3H5V9zm1 3h4v1H6v-1z" />
  </svg>
);

export const PIXEL_GLYPHS: Record<IconKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  server: ServerGlyph,
  n8n: N8nGlyph,
  globe: GlobeGlyph,
  api: ApiGlyph,
  database: DatabaseGlyph,
  ai_agent: AiAgentGlyph,
  backup: BackupGlyph,
};

export const PixelGlyph: React.FC<PixelGlyphProps> = ({ iconKey, ...props }) => {
  const GlyphComponent = PIXEL_GLYPHS[iconKey];
  return <GlyphComponent {...props} />;
};
