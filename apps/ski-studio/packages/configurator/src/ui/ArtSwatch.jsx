import {useId} from 'react';
import {skiOutline} from './Stage.jsx';

// The tips of the pair, as a ski wall would show them.
export default function ArtSwatch({shape, layers, className = 'cfg-art-swatch', base = '#0d0e10'}) {
  const id = useId().replace(/:/g, '');
  const gap = shape.gap ?? shape.width * 0.33;
  const pairWidth = shape.width * 2 + gap;
  const width = pairWidth / 0.6;
  const height = (width * 7) / 5;
  const x = pairWidth / 2 - width / 2;
  const sides = [
    ['left', 0],
    ['right', shape.width + gap],
  ];
  return (
    <svg className={className} viewBox={`${x} -34 ${width} ${height}`} aria-hidden="true">
      <defs>
        {sides.map(([side, offset]) => (
          <clipPath key={side} id={`${id}-${side}`}>
            <path d={skiOutline(shape, side)} transform={`translate(${offset} 0)`} />
          </clipPath>
        ))}
      </defs>
      {sides.map(([side, offset]) => (
        <g key={side}>
          <path d={skiOutline(shape, side)} transform={`translate(${offset} 0)`} fill={base} />
          <g clipPath={`url(#${id}-${side})`} style={{isolation: 'isolate'}}>
            <g transform={`translate(${offset} 0)`}>
              {(layers[side] ?? []).map((layer, i) =>
                layer.fill ? (
                  <rect key={i} x={layer.x ?? 0} y={layer.y ?? 0} width={layer.width ?? shape.width} height={layer.height ?? shape.length} fill={layer.fill} />
                ) : layer.tint ? (
                  // An alpha mask recolored: the image masks a rectangle of the tint color.
                  <g key={i}>
                    <mask id={`${id}-${side}-mask-${i}`} maskUnits="userSpaceOnUse" x={layer.x} y={layer.y} width={layer.width} height={layer.height}>
                      <image href={layer.href} x={layer.x} y={layer.y} width={layer.width} height={layer.height} preserveAspectRatio="none" />
                    </mask>
                    <rect x={layer.x} y={layer.y} width={layer.width} height={layer.height} fill={layer.tint} mask={`url(#${id}-${side}-mask-${i})`} />
                  </g>
                ) : (
                  <image key={i} href={layer.href} x={layer.x} y={layer.y} width={layer.width} height={layer.height} preserveAspectRatio="none" style={layer.blend ? {mixBlendMode: layer.blend} : undefined} />
                ),
              )}
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
