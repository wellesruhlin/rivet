import {useId} from 'react';
import {parametricPlanform, planformFromProfile, profileWidthAt} from './geometry.js';

const TECH = {width: 1000, height: 470, span: 880, centerline: 150, snow: 402};
// Schematic side views for brands that do not publish rocker measurements.
const SCHEMATIC = {
  Signature: {tipShare: 0.57, tipRise: 30, tailRise: 24, camber: 3, rockerScale: 1},
  'Signature Pow': {tipShare: 0.6, tipRise: 38, tailRise: 28, camber: 2, rockerScale: 1.12},
  Ripper: {tipShare: 0.56, tipRise: 24, tailRise: 18, camber: 7, rockerScale: 0.6},
};
const VERTICAL_EXAGGERATION = 2;
const number = new Intl.NumberFormat('en-US');
const at = (x, y) => ({left: `${(x / TECH.width) * 100}%`, top: `${(y / TECH.height) * 100}%`});
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

function sideProfile(x0, length, snow, geometry, scale) {
  const p = geometry.profile ?? {};
  let tipLength;
  let tailLength;
  let tipRise;
  let tailRise;
  let camber;
  if (p.kind === 'measured') {
    tipLength = p.tipRocker_mm * scale;
    tailLength = p.tailRocker_mm * scale;
    tipRise = p.tipHeight_mm * scale * VERTICAL_EXAGGERATION;
    tailRise = p.tailHeight_mm * scale * VERTICAL_EXAGGERATION;
    camber = Math.max(p.camber_mm * scale * VERTICAL_EXAGGERATION * 3, 1.5);
  } else {
    const shape = SCHEMATIC[p.rocker] ?? SCHEMATIC.Signature;
    const rocker = Math.max(0, length - (p.contact_mm ?? geometry.length_mm * 0.75) * scale) * shape.rockerScale;
    tipLength = rocker * shape.tipShare;
    tailLength = rocker * (1 - shape.tipShare);
    tipRise = shape.tipRise;
    tailRise = shape.tailRise;
    camber = shape.camber;
  }
  const tipContact = x0 + tipLength;
  const tailContact = x0 + length - tailLength;
  const mid = (tipContact + tailContact) / 2;
  return {
    d: [
      `M ${x0} ${snow - tipRise}`,
      `C ${x0 + tipLength * 0.22} ${snow - tipRise * 0.3} ${x0 + tipLength * 0.62} ${snow} ${tipContact} ${snow}`,
      `Q ${mid} ${snow - camber * 2} ${tailContact} ${snow}`,
      `C ${x0 + length - tailLength * 0.62} ${snow} ${x0 + length - tailLength * 0.22} ${snow - tailRise * 0.3} ${x0 + length} ${snow - tailRise}`,
    ].join(' '),
    tipContact,
    tailContact,
  };
}

// Planform and rocker profile from published dimensions, with the customer's
// topsheet layers inside the outline.
export default function Technical({geometry}) {
  const id = useId().replace(/:/g, '');
  const scale = TECH.span / geometry.maxLength_mm;
  const length = geometry.length_mm * scale;
  const x0 = (TECH.width - length) / 2;
  const cy = TECH.centerline;
  const widest = geometry.width_mm ?? (Math.max(geometry.tip_mm ?? 0, geometry.tail_mm ?? 0, geometry.waist_mm ?? 0) || 120);
  const half = {tip: ((geometry.tip_mm ?? widest) * scale) / 2, waist: ((geometry.waist_mm ?? widest * 0.8) * scale) / 2, tail: ((geometry.tail_mm ?? widest * 0.9) * scale) / 2};
  const xCenter = x0 + length / 2;
  const xMount = geometry.mount_cm != null ? xCenter - geometry.mount_cm * 10 * scale : xCenter;
  const tipAt = geometry.tipTaper_mm ? geometry.tipTaper_mm / geometry.length_mm : 0.12;
  const tailAt = geometry.tailTaper_mm ? 1 - geometry.tailTaper_mm / geometry.length_mm : 0.91;
  const traced = geometry.outline;
  const maxWidth = widest * scale;
  const marks = geometry.marks;
  const plan = traced
    ? {d: planformFromProfile(traced, x0, length, cy, maxWidth), xTip: x0 + (marks?.tip ?? tipAt) * length, xTail: x0 + (marks?.tail ?? tailAt) * length}
    : parametricPlanform(x0, length, cy, half, xMount, {tipAt, tailAt});
  const xWaist = marks ? x0 + marks.waist * length : xMount;
  const halfAt = x => (traced ? (profileWidthAt(traced, (x - x0) / length) * maxWidth) / 2 : null);
  const profile = sideProfile(x0, length, TECH.snow, geometry, scale);
  const widthMarks = [
    ['Tip', plan.xTip, geometry.tip_mm, halfAt(plan.xTip) ?? half.tip],
    ['Waist', xWaist, geometry.waist_mm, halfAt(xWaist) ?? half.waist],
    ['Tail', plan.xTail, geometry.tail_mm, halfAt(plan.xTail) ?? half.tail],
  ];
  const mountHalf = halfAt(xMount) ?? half.waist;
  const lengthY = cy + 108;
  const tick = (x, y, size = 7) => `M ${x} ${y - size} V ${y + size}`;
  // Ski-local art (x across, y along a W × L ski) rotated so the tip points left without mirroring.
  const art = geometry.art;
  const artMatrix = art && `matrix(0 ${-maxWidth / art.width} ${length / art.length} 0 ${x0} ${cy + maxWidth / 2})`;

  return (
    <figure className="cfg-technical" aria-label={`Technical drawing of ${geometry.name} at ${geometry.length_mm / 10} cm`}>
      <div className="cfg-technical-canvas">
        <svg viewBox={`0 0 ${TECH.width} ${TECH.height}`} aria-hidden="true">
          <defs>
            <clipPath id={`${id}-plan`}>
              <path d={plan.d} />
            </clipPath>
          </defs>
          <path className="cfg-tech-axis" d={`M ${x0 - 24} ${cy} H ${x0 + length + 24}`} />
          <g clipPath={`url(#${id}-plan)`} style={{isolation: 'isolate'}}>
            <rect x={x0} y={cy - maxWidth / 2 - 2} width={length} height={maxWidth + 4} fill={art?.base ?? '#0d0e10'} />
            {art && (
              <g transform={artMatrix}>
                {art.layers.map((layer, i) =>
                  layer.fill ? (
                    <rect key={i} x="0" y="0" width={art.width} height={art.length} fill={layer.fill} />
                  ) : (
                    <image key={i} href={layer.href} x={layer.x} y={layer.y} width={layer.width} height={layer.height} preserveAspectRatio="none" style={layer.blend ? {mixBlendMode: layer.blend} : undefined} opacity={layer.opacity} />
                  ),
                )}
              </g>
            )}
          </g>
          <path d={plan.d} fill="none" stroke={geometry.edge ?? '#151515'} strokeWidth="2.2" />
          <path className="cfg-tech-outline" d={plan.d} />
          {widthMarks.map(([label, x, value, h]) =>
            value ? (
              <g key={label} className="cfg-tech-dim">
                <path d={`M ${x} ${cy - h - 10} V ${cy - 62}`} />
                <path d={`M ${x} ${cy - h} V ${cy + h}`} className="cfg-tech-dim-strong" />
              </g>
            ) : null,
          )}
          {geometry.mount_cm != null && (
            <g className="cfg-tech-mount">
              <path d={`M ${xMount} ${cy + mountHalf + 6} V ${cy + mountHalf + 26}`} />
              <path d={`M ${xMount - 5} ${cy + mountHalf + 12} L ${xMount} ${cy + mountHalf + 5} L ${xMount + 5} ${cy + mountHalf + 12}`} />
            </g>
          )}
          <path className="cfg-tech-dim" d={`M ${xCenter} ${cy - 14} V ${cy + 14}`} strokeDasharray="2 3" />
          <g className="cfg-tech-dim">
            <path d={`M ${x0} ${lengthY} H ${x0 + length}`} />
            <path d={`${tick(x0, lengthY)} ${tick(x0 + length, lengthY)}`} />
          </g>
          <path className="cfg-tech-snow" d={`M ${x0 - 30} ${TECH.snow + 3} H ${x0 + length + 30}`} />
          <path className="cfg-tech-contact" d={`M ${profile.tipContact} ${TECH.snow + 3} H ${profile.tailContact}`} />
          <path className="cfg-tech-profile" d={profile.d} />
        </svg>
        <span className="cfg-tech-section" style={at(x0, 26)}>
          Planform
        </span>
        {widthMarks.map(([label, x, value]) =>
          value ? (
            <span key={label} className="cfg-tech-value" style={at(x, cy - 66)}>
              <strong>{value}</strong>
              <small>{label} · mm</small>
            </span>
          ) : null,
        )}
        {geometry.mount_cm != null && (
          <span className="cfg-tech-note" style={at(xMount, cy + mountHalf + 30)}>
            {geometry.mountLabel ?? 'Mount'} {signed(geometry.mount_cm)} cm from center
          </span>
        )}
        <span className="cfg-tech-length" style={at(xCenter, lengthY)}>
          {number.format(geometry.length_mm / 10)} cm
        </span>
        <span className="cfg-tech-section" style={at(x0, TECH.snow - 76)}>
          Profile{geometry.profileLabel ? ` · ${geometry.profileLabel}` : ''}
        </span>
        <span className="cfg-tech-note" style={at((profile.tipContact + profile.tailContact) / 2, TECH.snow + 14)}>
          {geometry.contactLabel ?? 'Snow contact'}
        </span>
      </div>
      {geometry.stats?.length > 0 && (
        <dl className="cfg-tech-stats">
          {geometry.stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <figcaption>{geometry.caption}</figcaption>
    </figure>
  );
}
