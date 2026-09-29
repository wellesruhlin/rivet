import {useEffect, useId, useRef, useState} from 'react';
import {Minus, Plus} from 'lucide-react';
import {familyOf, getBase, getTop, modelByHandle, sidewalls, signed} from '../config.js';
import {CROPS, PAIR_LEFTS, SKI_BOTTOM, SKI_TOP, SKI_WIDTH, pairBox, skiPath, stageArt, waistInset} from '../art-geometry.js';
import {RadioGroup} from './Controls.jsx';

const SAMPLE_MODEL = 'jeffrey-106';
const MAX_LENGTH = 191;
const FLOOR = SKI_BOTTOM + 2;
const REFLECTION = 300;
// Where the floor sits inside the pair SVG; CSS uses it to align the lit floor.
const FLOOR_RATIO = (FLOOR - 128) / (FLOOR - 128 + REFLECTION);
const ZOOM_LEVELS = [1, 1.6, 2.4];
const ZOOM_ORIGIN_Y = 0.41;
const VIEWS = ['Topsheet', 'Base', 'Technical'].map(value => ({value, label: value}));
const grams = new Intl.NumberFormat('en-US');

const sidewallColor = name => sidewalls.find(([id]) => id === name)?.[1] ?? '#151515';
const useSvgId = () => useId().replace(/:/g, '');

// Keeps showing the current artwork until the next one is decoded, then keeps
// it underneath while the new one fades in: a crossfade, never an empty ski.
function useCrossfade(src) {
  const [layers, setLayers] = useState({current: src, previous: null});
  useEffect(() => {
    if (src === layers.current) return undefined;
    let live = true;
    const image = new Image();
    image.src = src;
    const show = () => live && setLayers(({current}) => ({current: src, previous: current}));
    image.decode().then(show, show);
    return () => {
      live = false;
    };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  return layers;
}

function PairSurface({id, kind, layers, paths, edge}) {
  const crop = CROPS.stage[kind];
  const outline = paths.join(' ');
  const art = {x: crop.x, y: crop.y, width: crop.w, height: crop.h, preserveAspectRatio: 'none', clipPath: `url(#${id}-clip)`};
  return (
    <>
      <path d={outline} fill="#0d0e10" />
      {layers.previous && <image key={`under-${layers.previous}`} href={layers.previous} {...art} />}
      <image key={layers.current} className="ski-art-image" href={layers.current} {...art} />
      {paths.map(d => (
        <path key={d} d={d} fill={`url(#${id}-sheen)`} />
      ))}
      <path d={outline} fill={`url(#${id}-light)`} />
      <path d={outline} fill="none" stroke={edge} strokeWidth={kind === 'top' ? 4 : 3} />
    </>
  );
}

// The pair standing on a glossy studio floor. Artwork is clipped to a schematic outline.
function SkiPair({graphic, kind, waist, sidewall, side}) {
  const id = useSvgId();
  const layers = useCrossfade(stageArt(graphic));
  const box = side === undefined ? pairBox(kind) : {x: PAIR_LEFTS[kind][side] - 5, y: 128, w: SKI_WIDTH + 10, h: 1444};
  const inset = waistInset(waist);
  const paths = (side === undefined ? PAIR_LEFTS[kind] : [PAIR_LEFTS[kind][side]]).map(left => skiPath(left, inset));
  const edge = kind === 'top' ? sidewallColor(sidewall) : '#8e959c';
  const surface = <PairSurface id={id} kind={kind} layers={layers} paths={paths} edge={edge} />;
  return (
    <svg className="ski-pair" viewBox={`${box.x} ${box.y} ${box.w} ${FLOOR - box.y + REFLECTION}`} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={paths.join(' ')} />
        </clipPath>
        <linearGradient id={`${id}-sheen`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".035" />
          <stop offset=".14" stopColor="#fff" stopOpacity=".01" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset=".86" stopColor="#000" stopOpacity=".02" />
          <stop offset="1" stopColor="#000" stopOpacity=".06" />
        </linearGradient>
        <linearGradient id={`${id}-light`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".015" />
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".75" stopColor="#000" stopOpacity=".015" />
          <stop offset="1" stopColor="#000" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={FLOOR} y2={FLOOR + REFLECTION * 0.8}>
          <stop offset="0" stopColor="#fff" stopOpacity=".24" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-mirror`} maskUnits="userSpaceOnUse" x={box.x - 60} y={FLOOR} width={box.w + 120} height={REFLECTION}>
          <rect x={box.x - 60} y={FLOOR} width={box.w + 120} height={REFLECTION} fill={`url(#${id}-fade)`} />
        </mask>
        <radialGradient id={`${id}-contact`}>
          <stop offset="0" stopColor="#000" stopOpacity=".75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={box.x + box.w / 2} cy={FLOOR} rx={box.w * 0.66} ry="16" fill={`url(#${id}-contact)`} />
      <g mask={`url(#${id}-mirror)`}>
        <g transform={`translate(0 ${2 * FLOOR}) scale(1 -1)`}>{surface}</g>
      </g>
      {surface}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Technical view: planform and rocker profile drawn from the published specs.

const TECH = {width: 1000, height: 470, span: 880, centerline: 150, snow: 402};
const ROCKER = {
  Signature: {tipShare: 0.57, tipRise: 30, tailRise: 24, camber: 3, rockerScale: 1},
  'Signature Pow': {tipShare: 0.6, tipRise: 38, tailRise: 28, camber: 2, rockerScale: 1.12},
  Ripper: {tipShare: 0.56, tipRise: 24, tailRise: 18, camber: 7, rockerScale: 0.6},
};

function planformPath(x0, length, cy, half, xWaist) {
  const xTip = x0 + 0.12 * length;
  const xTail = x0 + 0.91 * length;
  const edge = sign => {
    const t = cy + sign * half.tip;
    const w = cy + sign * half.waist;
    const a = cy + sign * half.tail;
    return {
      down: [
        `C ${x0} ${cy + sign * half.tip * 0.72} ${x0 + 0.045 * length} ${t} ${xTip} ${t}`,
        `C ${xTip + (xWaist - xTip) * 0.45} ${t} ${xWaist - (xWaist - xTip) * 0.35} ${w} ${xWaist} ${w}`,
        `C ${xWaist + (xTail - xWaist) * 0.35} ${w} ${xTail - (xTail - xWaist) * 0.45} ${a} ${xTail} ${a}`,
        `C ${x0 + 0.965 * length} ${a} ${x0 + length} ${cy + sign * half.tail * 0.7} ${x0 + length} ${cy}`,
      ],
      up: [
        `C ${x0 + length} ${cy + sign * half.tail * 0.7} ${x0 + 0.965 * length} ${a} ${xTail} ${a}`,
        `C ${xTail - (xTail - xWaist) * 0.45} ${a} ${xWaist + (xTail - xWaist) * 0.35} ${w} ${xWaist} ${w}`,
        `C ${xWaist - (xWaist - xTip) * 0.35} ${w} ${xTip + (xWaist - xTip) * 0.45} ${t} ${xTip} ${t}`,
        `C ${x0 + 0.045 * length} ${t} ${x0} ${cy + sign * half.tip * 0.72} ${x0} ${cy}`,
      ],
    };
  };
  return {d: [`M ${x0} ${cy}`, ...edge(-1).down, ...edge(1).up, 'Z'].join(' '), xTip, xTail};
}

function profilePath(x0, length, snow, tipLength, tailLength, rocker) {
  const tipContact = x0 + tipLength;
  const tailContact = x0 + length - tailLength;
  const mid = (tipContact + tailContact) / 2;
  return {
    d: [
      `M ${x0} ${snow - rocker.tipRise}`,
      `C ${x0 + tipLength * 0.22} ${snow - rocker.tipRise * 0.3} ${x0 + tipLength * 0.62} ${snow} ${tipContact} ${snow}`,
      `Q ${mid} ${snow - rocker.camber * 2} ${tailContact} ${snow}`,
      `C ${x0 + length - tailLength * 0.62} ${snow} ${x0 + length - tailLength * 0.22} ${snow - rocker.tailRise * 0.3} ${x0 + length} ${snow - rocker.tailRise}`,
    ].join(' '),
    tipContact,
    tailContact,
  };
}

const at = (x, y) => ({left: `${(x / TECH.width) * 100}%`, top: `${(y / TECH.height) * 100}%`});

function TechnicalDrawing({model, spec, rocker, graphic, sidewall}) {
  const id = useSvgId();
  const scale = TECH.span / (MAX_LENGTH * 10);
  const length = spec.length_cm * 10 * scale;
  const x0 = (TECH.width - length) / 2;
  const cy = TECH.centerline;
  const half = {tip: (spec.tip_mm * scale) / 2, waist: (spec.waist_mm * scale) / 2, tail: (spec.tail_mm * scale) / 2};
  const xCenter = x0 + length / 2;
  // Negative mount values sit behind true center, toward the tail on the right.
  const xMount = xCenter - spec.mount_from_center_cm * 10 * scale;
  const plan = planformPath(x0, length, cy, half, xMount);
  const profileName = rocker === 'Signature' && model.rocker === 'Signature Pow' ? 'Signature Pow' : rocker;
  const shape = ROCKER[profileName] ?? ROCKER.Signature;
  const rockerLength = Math.max(0, length - spec.effective_edge_mm * scale) * shape.rockerScale;
  const profile = profilePath(x0, length, TECH.snow, rockerLength * shape.tipShare, rockerLength * (1 - shape.tipShare), shape);
  const [artLeft] = PAIR_LEFTS.top;
  const kx = length / (SKI_BOTTOM - SKI_TOP);
  const ky = (half.tip * 2) / SKI_WIDTH;
  const crop = CROPS.stage.top;
  const artMatrix = `matrix(0 ${-ky} ${kx} 0 ${x0 - SKI_TOP * kx} ${cy + (artLeft + SKI_WIDTH / 2) * ky})`;
  const widthMarks = [
    ['Tip', plan.xTip, spec.tip_mm, half.tip],
    ['Waist', xMount, spec.waist_mm, half.waist],
    ['Tail', plan.xTail, spec.tail_mm, half.tail],
  ];
  const lengthY = cy + 108;
  const tick = (x, y, size = 7) => `M ${x} ${y - size} V ${y + size}`;

  return (
    <figure className="technical" aria-label={`Technical drawing of ${model.name} at ${spec.length_cm} cm`}>
      <div className="technical-canvas">
        <svg viewBox={`0 0 ${TECH.width} ${TECH.height}`} aria-hidden="true">
          <defs>
            <clipPath id={`${id}-plan`}>
              <path d={plan.d} />
            </clipPath>
          </defs>
          <path className="tech-axis" d={`M ${x0 - 24} ${cy} H ${x0 + length + 24}`} />
          <g clipPath={`url(#${id}-plan)`}>
            <rect x={x0} y={cy - half.tip - 2} width={length} height={half.tip * 2 + 4} fill="#0d0e10" />
            <g transform={artMatrix}>
              <image href={stageArt(graphic)} x={crop.x} y={crop.y} width={crop.w} height={crop.h} preserveAspectRatio="none" />
            </g>
          </g>
          <path d={plan.d} fill="none" stroke={sidewallColor(sidewall)} strokeWidth="2.2" />
          <path className="tech-outline" d={plan.d} />
          {widthMarks.map(([label, x, , h]) => (
            <g key={label} className="tech-dim">
              <path d={`M ${x} ${cy - h - 10} V ${cy - 62}`} />
              <path d={`M ${x} ${cy - h} V ${cy + h}`} className="tech-dim-strong" />
            </g>
          ))}
          <g className="tech-mount">
            <path d={`M ${xMount} ${cy + half.waist + 6} V ${cy + half.waist + 26}`} />
            <path d={`M ${xMount - 5} ${cy + half.waist + 12} L ${xMount} ${cy + half.waist + 5} L ${xMount + 5} ${cy + half.waist + 12}`} />
          </g>
          <path className="tech-dim" d={`M ${xCenter} ${cy - 14} V ${cy + 14}`} strokeDasharray="2 3" />
          <g className="tech-dim">
            <path d={`M ${x0} ${lengthY} H ${x0 + length}`} />
            <path d={`${tick(x0, lengthY)} ${tick(x0 + length, lengthY)}`} />
          </g>
          <path className="tech-snow" d={`M ${x0 - 30} ${TECH.snow + 3} H ${x0 + length + 30}`} />
          <path className="tech-contact" d={`M ${profile.tipContact} ${TECH.snow + 3} H ${profile.tailContact}`} />
          <path className="tech-profile" d={profile.d} />
        </svg>
        <span className="tech-section" style={at(x0, 26)}>
          Planform
        </span>
        {widthMarks.map(([label, x, value]) => (
          <span key={label} className="tech-value" style={at(x, cy - 66)}>
            <strong>{value}</strong>
            <small>{label} · mm</small>
          </span>
        ))}
        <span className="tech-note" style={at(xMount, cy + half.waist + 30)}>
          Mount {signed(spec.mount_from_center_cm)} cm from center
        </span>
        <span className="tech-length" style={at(xCenter, lengthY)}>
          {spec.length_cm} cm
        </span>
        <span className="tech-section" style={at(x0, TECH.snow - 76)}>
          Profile · {profileName}
        </span>
        <span className="tech-note" style={at((profile.tipContact + profile.tailContact) / 2, TECH.snow + 14)}>
          {rocker === 'Ripper' ? 'Snow contact · Ripper adds edge beyond the published figure' : 'Snow contact · effective edge'}
        </span>
      </div>
      <dl className="tech-stats">
        {[
          ['Turn radius', `${spec.turn_radius_m} m`],
          ['Stock weight', `${grams.format(spec.weight_g)} g / ski`],
          ['Effective edge', `${grams.format(spec.effective_edge_mm)} mm`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <figcaption>Schematic drawing from ON3P’s published dimensions · profile height exaggerated · not a manufacturing drawing</figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------

function usePanZoom(resetKey) {
  const viewport = useRef(null);
  const drag = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x: 0, y: 0});
  const [dragging, setDragging] = useState(false);

  const clamp = (point, level) => {
    const element = viewport.current;
    if (!element || level === 1) return {x: 0, y: 0};
    const over = level - 1;
    const width = element.clientWidth;
    const height = element.clientHeight;
    return {
      x: Math.max((-width * over) / 2, Math.min((width * over) / 2, point.x)),
      y: Math.max(-(1 - ZOOM_ORIGIN_Y) * height * over, Math.min(ZOOM_ORIGIN_Y * height * over, point.y)),
    };
  };
  const setLevel = level => {
    setZoom(level);
    setPan(current => clamp(current, level));
  };

  useEffect(() => {
    setZoom(1);
    setPan({x: 0, y: 0});
  }, [resetKey]);

  useEffect(() => {
    const element = viewport.current;
    if (!element || zoom === 1) return undefined;
    const onWheel = event => {
      event.preventDefault();
      setPan(current => clamp({x: current.x - event.deltaX, y: current.y - event.deltaY}, zoom));
    };
    element.addEventListener('wheel', onWheel, {passive: false});
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const end = () => {
    drag.current = null;
    setDragging(false);
  };
  const handlers = {
    onPointerDown: event => {
      if (zoom === 1 || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {x: event.clientX, y: event.clientY, pan};
      setDragging(true);
    },
    onPointerMove: event => {
      const start = drag.current;
      if (start) setPan(clamp({x: start.pan.x + event.clientX - start.x, y: start.pan.y + event.clientY - start.y}, zoom));
    },
    onPointerUp: end,
    onPointerCancel: end,
    onDoubleClick: () => setLevel(zoom === 1 ? ZOOM_LEVELS[1] : 1),
    onKeyDown: event => {
      const moves = {ArrowUp: [0, 48], ArrowDown: [0, -48], ArrowLeft: [48, 0], ArrowRight: [-48, 0]};
      if (zoom === 1 || !moves[event.key]) return;
      event.preventDefault();
      setPan(current => clamp({x: current.x + moves[event.key][0], y: current.y + moves[event.key][1]}, zoom));
    },
  };
  return {viewport, zoom, pan, dragging, setLevel, handlers};
}

function Readout({model, spec, lengthChosen}) {
  const lengths = model.lengths.map(l => l.length_cm);
  const items = lengthChosen
    ? [
        ['Tip · waist · tail', `${spec.tip_mm} · ${spec.waist_mm} · ${spec.tail_mm}`, 'mm'],
        ['Turn radius', spec.turn_radius_m, 'm'],
        ['Stock weight', grams.format(spec.weight_g), 'g / ski'],
      ]
    : [
        ['Waist', model.waist_mm, 'mm'],
        ['Lengths', `${Math.min(...lengths)}–${Math.max(...lengths)}`, 'cm'],
      ];
  return (
    <dl className="readout" aria-label="Published specifications">
      {items.map(([label, value, unit]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value}
            <small>{unit}</small>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function displaySelection(config) {
  const shown = modelByHandle(config.model) ?? modelByHandle(SAMPLE_MODEL);
  const lengths = shown.lengths.map(l => l.length_cm);
  const length = config.model && config.length ? config.length : lengths.includes(186) ? 186 : lengths[Math.floor(lengths.length / 2)];
  return {...config, model: shown.handle, length};
}

export default function Stage({config, view, onView, linked = false}) {
  const model = modelByHandle(config.model);
  const shown = model ?? modelByHandle(SAMPLE_MODEL);
  const lengthChosen = !!model && !!config.length;
  const length = displaySelection(config).length;
  const spec = shown.lengths.find(l => l.length_cm === length);
  const top = getTop(config);
  const base = getBase(config);
  const technical = view === 'Technical';
  const {viewport, zoom, pan, dragging, setLevel, handlers} = usePanZoom(`${shown.handle}-${technical}`);
  const family = familyOf(shown).toUpperCase();
  const face = view === 'Base' ? base : top;
  const detail = [
    lengthChosen ? `${config.length} cm` : null,
    model ? `${config.rocker} rocker` : null,
    `${face.name} ${view === 'Base' ? 'base' : 'topsheet'}`,
  ].filter(Boolean);
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);

  return (
    <section
      className={`stage ${technical ? 'is-technical' : ''} ${model ? '' : 'is-sample'}`}
      aria-label="Ski preview"
      style={{'--floor-ratio': FLOOR_RATIO, '--chars': family.length}}
    >
      {model && (
        <span className="stage-word" aria-hidden="true">
          {family}
        </span>
      )}

      <div className="nameplate">
        <p className="overline">
          {model ? config.category : <span className="sample-tag">Sample</span>}
          <span className="nameplate-origin">
            {model && <span aria-hidden="true"> · </span>}
            Handbuilt in Portland, Oregon
          </span>
        </p>
        <h2>{model ? model.name : 'Build your pair'}</h2>
        <p className="nameplate-detail">
          {model ? (
            <>
              {!lengthChosen && (
                <>
                  <span className="nameplate-pending">Select a length</span>
                  {' · '}
                </>
              )}
              {detail.join(' · ')}
            </>
          ) : (
            `Shown: ${shown.name} with ${top.name}. Start with how you ski.`
          )}
        </p>
      </div>

      <div
        ref={viewport}
        className={`stage-viewport ${zoom > 1 ? 'is-zoomed' : ''} ${dragging ? 'is-dragging' : ''}`}
        tabIndex={zoom > 1 ? 0 : -1}
        aria-label={zoom > 1 ? 'Zoomed preview. Drag or use arrow keys to explore.' : undefined}
        {...handlers}
      >
        <div className="stage-zoom" style={{'--zoom': zoom, '--pan-x': `${pan.x}px`, '--pan-y': `${pan.y}px`}}>
          <div className="stage-scale" style={{'--length-scale': length / MAX_LENGTH}}>
            <div className="ski-pair-turntable">
              {[0, 1].map(side => <div className="ski-individual" key={side}>
                <div className={`ski-individual-rotor ${view === 'Base' ? 'is-flipped' : ''}`}>
                  <div className="ski-face"><SkiPair graphic={top} kind="top" waist={shown.waist_mm} sidewall={config.sidewall} side={side} /></div>
                  <div className="ski-face is-back"><SkiPair graphic={base} kind="base" waist={shown.waist_mm} sidewall={config.sidewall} side={side} /></div>
                </div>
              </div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="stage-technical" aria-hidden={!technical}>
        {technical && <TechnicalDrawing model={shown} spec={spec} rocker={config.rocker} graphic={top} sidewall={config.sidewall} />}
      </div>

      {model && <Readout model={shown} spec={spec} lengthChosen={lengthChosen} />}

      <p className="stage-hint">
        {technical ? 'Schematic · published dimensions · profile exaggerated' : zoom > 1 ? 'Drag to explore the artwork' : 'Illustrative preview · schematic outline'}
      </p>

      <div className="stage-controls">
        <span className="controls-spacer" aria-hidden="true" />
        {!linked && <RadioGroup label="Preview view" className="segmented glass" options={VIEWS} value={view} onChange={onView} />}
        <div className="stage-controls-end">
          <div className={`zoom ${technical ? 'is-hidden' : ''}`}>
            <button type="button" className="icon-button" aria-label="Zoom out" disabled={zoomIndex <= 0} onClick={() => setLevel(ZOOM_LEVELS[zoomIndex - 1])}>
              <Minus size={15} />
            </button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" className="icon-button" aria-label="Zoom in" disabled={zoomIndex >= ZOOM_LEVELS.length - 1} onClick={() => setLevel(ZOOM_LEVELS[zoomIndex + 1])}>
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
