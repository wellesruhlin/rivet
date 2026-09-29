import {useEffect, useId, useRef, useState} from 'react';
import {Minus, Plus} from 'lucide-react';
import {formatWeight} from '../engine/engine.js';
import {RadioGroup} from './Controls.jsx';
import Technical from './Technical.jsx';
import {profilePath} from './geometry.js';

const REFLECTION = 300;
const FLOOR_GAP = 2;
const useSvgId = () => useId().replace(/:/g, '');

const ZOOM_ORIGIN_Y = 0.41;

// Keeps the current layers until the next images decode, then keeps the old ones
// underneath while the new ones fade in: a crossfade, never an empty ski.
function useCrossfade(key, value) {
  const [state, setState] = useState({key, value, previous: null});
  useEffect(() => {
    if (key === state.key) return undefined;
    let live = true;
    const sources = [...(value.left ?? []), ...(value.right ?? [])].filter(layer => layer.href).map(layer => layer.href);
    Promise.all(
      sources.map(src => {
        const image = new Image();
        image.src = src;
        return image.decode().catch(() => {});
      }),
    ).then(() => live && setState(current => ({key, value, previous: current.value})));
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

// Resolves the outline for one ski in a W × L box.
export function skiOutline(shape, side) {
  if (shape.path) return shape.path(side);
  const profile = side === 'right' && shape.profileRight ? shape.profileRight : shape.profile;
  return profilePath(profile, shape.width, shape.length);
}

function Layers({layers, width, length, clip}) {
  return (
    <g clipPath={`url(#${clip})`} style={{isolation: 'isolate'}}>
      {layers.map((layer, i) =>
        layer.fill ? (
          <rect key={`fill-${i}`} x="0" y="0" width={width} height={length} fill={layer.fill} opacity={layer.opacity} />
        ) : (
          <image
            key={`${layer.href}-${i}`}
            className={layer.fade ? 'cfg-art-image' : undefined}
            href={layer.href}
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            preserveAspectRatio="none"
            opacity={layer.opacity}
            style={layer.blend ? {mixBlendMode: layer.blend} : undefined}
          />
        ),
      )}
    </g>
  );
}

function Ski({id, side, shape, surface, outline, x}) {
  const clip = `${id}-${side}-clip`;
  const current = surface.current[side] ?? [];
  const previous = surface.previous?.[side] ?? [];
  return (
    <g transform={`translate(${x} 0)`}>
      <path d={outline} fill={surface.base ?? '#0d0e10'} />
      {previous.length > 0 && <Layers layers={previous} width={shape.width} length={shape.length} clip={clip} />}
      <Layers layers={current.map(layer => ({...layer, fade: true}))} width={shape.width} length={shape.length} clip={clip} key={surface.key} />
      <path d={outline} fill={`url(#${id}-sheen)`} />
      <path d={outline} fill={`url(#${id}-light)`} />
      <path d={outline} fill="none" stroke={surface.edge?.color ?? '#151515'} strokeWidth={surface.edge?.width ?? 4} />
    </g>
  );
}

// The pair standing on a glossy studio floor (or, without `reflection`, just the pair).
function SkiPair({shape, surface, reflection = true}) {
  const id = useSvgId();
  const gap = shape.gap ?? shape.width * 0.33;
  const pairWidth = shape.width * 2 + gap;
  const margin = 6;
  const floor = shape.length + FLOOR_GAP;
  const cx = pairWidth / 2;
  const outlines = {left: skiOutline(shape, 'left'), right: skiOutline(shape, 'right')};
  const skis = (
    <>
      <Ski id={id} side="left" shape={shape} surface={surface} outline={outlines.left} x={0} />
      <Ski id={id} side="right" shape={shape} surface={surface} outline={outlines.right} x={shape.width + gap} />
    </>
  );
  return (
    <svg className="cfg-ski-pair" viewBox={`${-margin} -10 ${pairWidth + margin * 2} ${floor + 10 + (reflection ? REFLECTION : 0)}`} aria-hidden="true">
      <defs>
        {Object.entries(outlines).map(([side, d]) => (
          <clipPath key={side} id={`${id}-${side}-clip`}>
            <path d={d} />
          </clipPath>
        ))}
        <linearGradient id={`${id}-sheen`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".11" />
          <stop offset=".14" stopColor="#fff" stopOpacity=".03" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset=".86" stopColor="#000" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id={`${id}-light`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".06" />
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".75" stopColor="#000" stopOpacity=".05" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={floor} y2={floor + REFLECTION * 0.8}>
          <stop offset="0" stopColor="#fff" stopOpacity=".24" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-mirror`} maskUnits="userSpaceOnUse" x={-60} y={floor} width={pairWidth + 120} height={REFLECTION}>
          <rect x={-60} y={floor} width={pairWidth + 120} height={REFLECTION} fill={`url(#${id}-fade)`} />
        </mask>
        <radialGradient id={`${id}-contact`}>
          <stop offset="0" stopColor="#000" stopOpacity=".75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {reflection && (
        <>
          <ellipse cx={cx} cy={floor} rx={pairWidth * 0.66} ry="16" fill={`url(#${id}-contact)`} />
          <g mask={`url(#${id}-mirror)`}>
            <g transform={`translate(0 ${2 * floor}) scale(1 -1)`}>{skis}</g>
          </g>
        </>
      )}
      {skis}
    </svg>
  );
}

function usePanZoom(resetKey, levels, originY) {
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
      y: Math.max(-(1 - originY) * height * over, Math.min(originY * height * over, point.y)),
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
    onDoubleClick: () => levels.length > 1 && setLevel(zoom === 1 ? levels[1] : 1),
    onKeyDown: event => {
      const moves = {ArrowUp: [0, 48], ArrowDown: [0, -48], ArrowLeft: [48, 0], ArrowRight: [-48, 0]};
      if (zoom === 1 || !moves[event.key]) return;
      event.preventDefault();
      setPan(current => clamp({x: current.x + moves[event.key][0], y: current.y + moves[event.key][1]}, zoom));
    },
  };
  return {viewport, zoom, pan, dragging, setLevel, handlers};
}

function Readout({items}) {
  return (
    <dl className="cfg-readout" aria-label="Specifications">
      {items.map(([label, value, unit]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value}
            {unit && <small>{unit}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function Stage({engine, config, view, onView}) {
  const {pack} = engine;
  const {art, stage, specs} = pack;
  const shown = engine.context(config).model ? config : {...config, model: config.model || stage.sampleModel};
  const baseCtx = engine.context(shown);
  const lengths = baseCtx.lengths ?? [];
  const lengthChosen = !!config.model && !!config.length;
  const length = lengthChosen ? config.length : lengths.includes(stage.preferredLength) ? stage.preferredLength : lengths[Math.floor(lengths.length / 2)];
  const display = {...shown, length};
  const ctx = engine.context(display);
  const model = config.model ? ctx.model : null;
  const geometry = specs?.geometry?.(display, ctx) ?? null;
  const views = [...art.faces, ...(geometry ? ['Technical'] : [])];
  const technical = view === 'Technical' && !!geometry;
  const face = technical ? art.faces[0] : view;
  const levels = art.zoomLevels ?? [1, 1.6, 2.4];
  const shape = art.shape(display, ctx);
  const floorRatio = (shape.length + FLOOR_GAP + 10) / (shape.length + FLOOR_GAP + 10 + REFLECTION);
  const {viewport, zoom, pan, dragging, setLevel, handlers} = usePanZoom(`${ctx.model?.id}-${technical}`, levels, ZOOM_ORIGIN_Y);
  const surfaces = art.faces.map(f => ({face: f, ...art.surface(display, f, ctx)}));
  const layerKey = surface => [surface.left, surface.right].flat().map(layer => layer.href ?? layer.fill).join('|');
  const faded = surfaces.map(surface => ({...surface, key: layerKey(surface)}));
  const family = stage.family(ctx.model).toUpperCase();
  const weight = engine.weight(display);
  const readout = model ? specs?.readout?.(display, ctx, weight && formatWeight(weight), lengthChosen) : null;
  const detail = model ? stage.detail(display, ctx, face, lengthChosen) : [];
  const zoomIndex = levels.indexOf(zoom);
  const lengthScale = length / stage.maxLength;

  return (
    <section
      className={`cfg-stage ${technical ? 'is-technical' : ''} ${model ? '' : 'is-sample'}`}
      aria-label="Ski preview"
      style={{'--floor-ratio': floorRatio, '--chars': family.length}}
    >
      {model && (
        <span className="cfg-stage-word" aria-hidden="true">
          {family}
        </span>
      )}

      <div className="cfg-nameplate">
        <p className="cfg-overline">
          {model ? stage.category(display, ctx) : <span className="cfg-sample-tag">Sample</span>}
          <span className="cfg-nameplate-origin">
            {model && <span aria-hidden="true"> · </span>}
            {stage.origin}
          </span>
        </p>
        <h2>{model ? model.name : stage.emptyTitle ?? 'Build your pair'}</h2>
        <p className="cfg-nameplate-detail">
          {model ? (
            <>
              {!lengthChosen && (
                <>
                  <span className="cfg-nameplate-pending">Select a length</span>
                  {detail.length > 0 && ' · '}
                </>
              )}
              {detail.join(' · ')}
            </>
          ) : (
            stage.sampleText(display, ctx)
          )}
        </p>
      </div>

      <div
        ref={viewport}
        className={`cfg-stage-viewport ${zoom > 1 ? 'is-zoomed' : ''} ${dragging ? 'is-dragging' : ''}`}
        tabIndex={zoom > 1 ? 0 : -1}
        aria-label={zoom > 1 ? 'Zoomed preview. Drag or use arrow keys to explore.' : undefined}
        {...handlers}
      >
        <div className="cfg-stage-zoom" style={{'--zoom': zoom, '--pan-x': `${pan.x}px`, '--pan-y': `${pan.y}px`}}>
          <div className="cfg-stage-scale" style={{'--length-scale': lengthScale}}>
            <div className={`cfg-ski-flip ${art.faces.length > 1 && face === art.faces[1] ? 'is-flipped' : ''}`}>
              {faded.map((surface, i) => (
                <FaceView key={surface.face} className={i === 1 ? 'is-back' : ''} shape={shape} surface={surface} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="cfg-stage-technical" aria-hidden={!technical}>
        {technical && <Technical geometry={geometry} />}
      </div>

      {readout && <Readout items={readout} />}

      <p className="cfg-stage-hint">{technical ? stage.hints?.technical : zoom > 1 ? 'Drag to explore the artwork' : stage.hints?.art}</p>

      <div className="cfg-stage-controls">
        <span className="cfg-controls-spacer" aria-hidden="true" />
        {views.length > 1 ? (
          <RadioGroup label="Preview view" className="cfg-segmented is-glass" options={views.map(value => ({value, label: value}))} value={technical ? 'Technical' : face} onChange={onView} />
        ) : (
          <span />
        )}
        <div className="cfg-stage-controls-end">
          <div className={`cfg-zoom ${technical || levels.length < 2 ? 'is-hidden' : ''}`}>
            <button type="button" className="cfg-icon-button" aria-label="Zoom out" disabled={zoomIndex <= 0} onClick={() => setLevel(levels[zoomIndex - 1])}>
              <Minus size={15} />
            </button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" className="cfg-icon-button" aria-label="Zoom in" disabled={zoomIndex >= levels.length - 1} onClick={() => setLevel(levels[zoomIndex + 1])}>
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaceView({className, shape, surface}) {
  const faded = useCrossfade(surface.key, {left: surface.left, right: surface.right});
  return (
    <div className={`cfg-ski-face ${className}`}>
      <SkiPair shape={shape} surface={{current: faded.value, previous: faded.previous, key: faded.key, base: surface.base, edge: surface.edge}} />
    </div>
  );
}

// A static render of a configured pair, for bags, cards and summaries.
export function PairPreview({engine, config, reflection = false, className = 'cfg-pair-preview', label}) {
  const ctx = engine.context(config);
  const face = engine.pack.art.faces[0];
  const shape = engine.pack.art.shape(config, ctx);
  const surface = engine.pack.art.surface(config, face, ctx);
  return (
    <div className={className} role={label ? 'img' : undefined} aria-label={label}>
      <SkiPair shape={shape} surface={{current: {left: surface.left, right: surface.right}, previous: null, key: 'static', base: surface.base, edge: surface.edge}} reflection={reflection} />
    </div>
  );
}
