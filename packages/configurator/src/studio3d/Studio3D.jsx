import {useEffect, useMemo, useRef, useState} from 'react';
import {Minus, Plus, RotateCcw} from 'lucide-react';
import {RadioGroup} from '../ui/Controls.jsx';
import {generateSkiMesh} from '@rivet/ski-geometry';
import {buildLayers} from '@rivet/ski-geometry';
import {createSkiRenderer} from './renderer.js';
import {canvasSize, paintSidewall, paintSurfaces} from './surfaces.js';
import './studio3d.css';

// Session view names (shared with the 2D stage and the packs) and their cameras.
export const VIEWS = [
  {value: 'Topsheet', label: 'Front', camera: 'front'},
  {value: 'Base', label: 'Back', camera: 'back'},
  {value: 'Sidewall', label: 'Sidewall', camera: 'sidewall'},
  {value: 'Bindings', label: 'Bindings', camera: 'bindings'},
  {value: '3D', label: '3D', camera: 'orbit'},
  {value: 'Construction', label: 'Inside', camera: 'construction'},
  {value: 'Technical', label: 'Tech Specs', camera: 'tech'},
];
export const cameraFor = (view, views = VIEWS) => views.find(v => v.value === view)?.camera ?? VIEWS.find(v => v.value === view)?.camera ?? 'front';

const HINTS = {
  construction: ['Hover or tap a layer · drag to inspect', 'Tap a layer · drag to inspect'],
  profile: ['Full-length side profile · scroll to zoom', 'Full-length side profile · pinch to zoom'],
  tech: ['Scroll to zoom', 'Pinch to zoom'],
  sidewall: ['Drag to inspect · scroll to zoom', 'Drag to inspect · pinch to zoom'],
  orbit: ['Drag to orbit · scroll to zoom', 'Drag to inspect · pinch to zoom'],
  bindings: ['Drag to orbit · scroll to zoom', 'Drag to inspect · pinch to zoom'],
  camber: ['Heights exaggerated 4× · scroll to zoom', 'Heights exaggerated 4× · pinch to zoom'],
  front: ['Scroll to zoom · Front / Back to turn', 'Pinch to zoom · Front / Back to turn'],
  back: ['Scroll to zoom · Front / Back to turn', 'Pinch to zoom · Front / Back to turn'],
};

// The configuration shown on the stage: a sample model and a display length when the
// customer hasn't chosen them. It never selects anything for them.
export function displayConfig(engine, config) {
  const {stage} = engine.pack;
  const shown = engine.context(config).model ? config : {...config, model: config.model || stage.sampleModel};
  const lengths = engine.context(shown).lengths ?? [];
  const lengthChosen = !!config.model && lengths.includes(config.length);
  const length = lengthChosen ? config.length : lengths.includes(stage.preferredLength) ? stage.preferredLength : lengths[Math.floor(lengths.length / 2)];
  return {display: {...shown, length}, lengthChosen, sample: !config.model};
}

/**
 * The 3D stage for packs that provide `model3d`. Configuration stays in the session
 * reducer; this component only renders it.
 */
export default function Studio3D({engine, config, view, onView, previewBinding, onRemoveBinding}) {
  const {pack} = engine;
  const model3d = pack.model3d;
  const host = useRef(null);
  const runtime = useRef(null);
  const [fatal, setFatal] = useState('');
  const [artwork, setArtwork] = useState('loading');
  const [assembled, setAssembled] = useState(false);
  const [overview, setOverview] = useState(true);
  const [bindingStatus, setBindingStatus] = useState('none');
  const [hoverLayer, setHoverLayer] = useState(null);
  const [legendLayer, setLegendLayer] = useState(null);
  const [pinnedLayer, setPinnedLayer] = useState(null);
  const [layersOpen, setLayersOpen] = useState(false);

  const {display, lengthChosen, sample} = displayConfig(engine, config);
  const ctx = engine.context(display);
  const hasBindings = !!(previewBinding || config.binding);
  const views = (model3d.views ?? VIEWS).filter(v => v.value !== 'Bindings' || hasBindings);
  const cameraView = view === 'Bindings' && !hasBindings ? 'front' : cameraFor(view, views);
  const shape = model3d.shape(display, ctx);
  const mesh = useMemo(() => (shape ? generateSkiMesh(shape) : null), [shape?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const surfaces = model3d.surfaces(display, ctx);
  const construction = model3d.construction(display, ctx);
  const layers = useMemo(() => (mesh ? buildLayers(mesh, construction.stack(mesh)) : null), [mesh, construction.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const bindingId = previewBinding || config.binding;
  const binding = bindingId ? model3d.binding?.(bindingId, display, ctx) ?? null : null;
  const heading = model3d.heading(display, ctx, {cameraView, sample, lengthChosen});
  const legend = construction.legend;
  const activeLayer = cameraView === 'construction' ? legendLayer ?? hoverLayer ?? pinnedLayer : null;
  const activeIndex = legend.findIndex(layer => layer.key === activeLayer);
  const activeInfo = legend[activeIndex];
  const techSpecs = cameraView === 'tech' ? model3d.techSpecs?.(display, ctx) : null;
  const disclosure = model3d.disclosure?.(display, ctx, cameraView) ?? [];
  const partsKey = model3d.parts ? JSON.stringify(model3d.parts(display, ctx)) : '';
  const words = model3d.copy ?? {};
  const shownMesh = useRef(null);
  const tween = useRef(0);

  useEffect(() => {
    try {
      runtime.current = createSkiRenderer(host.current, setFatal, {
        bindingUrl: model3d.bindingModel,
        labels: model3d.labels,
        pair: model3d.pair !== false,
        detailSpan: model3d.detailSpan,
        onLayer: setHoverLayer,
        onPick: key => setPinnedLayer(current => (key && key !== current ? key : null)),
      });
    } catch {
      setFatal('3D is unavailable in this browser. Reload to try again.');
    }
    return () => {runtime.current?.dispose(); runtime.current = null;};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Shape changes with the same topology (a camber setting) glide over half a second;
  // anything else swaps at once.
  useEffect(() => {
    const from = shownMesh.current;
    shownMesh.current = mesh;
    cancelAnimationFrame(tween.current);
    const same = from && mesh && from.positions.length === mesh.positions.length && model3d.animateShape;
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!same || reduce) {runtime.current?.setGeometry(mesh); return undefined;}
    const start = performance.now(), duration = 520;
    const step = now => {
      const t = Math.min(1, (now - start) / duration), k = t * t * (3 - 2 * t);
      if (t >= 1) {runtime.current?.setGeometry(mesh); return;}
      runtime.current?.morph({
        ...mesh,
        positions: mesh.positions.map((p, i) => p.map((v, j) => from.positions[i][j] + (v - from.positions[i][j]) * k)),
        sections: mesh.sections.map((section, i) => ({...section, heightMm: from.sections[i].heightMm + (section.heightMm - from.sections[i].heightMm) * k})),
      });
      tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(tween.current);
  }, [mesh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {runtime.current?.setParts(partsKey ? JSON.parse(partsKey) : []);}, [partsKey]);
  useEffect(() => {
    runtime.current?.setView(cameraView);
    if (cameraView === 'construction') {setOverview(true); runtime.current?.setOverview(true);}
    setAssembled(false);
    setPinnedLayer(null);
    setLegendLayer(null);
  }, [cameraView]);
  useEffect(() => {runtime.current?.setConstruction(layers, {veneer: construction.veneer});}, [layers]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {runtime.current?.highlightLayer(activeLayer);}, [activeLayer, layers]);
  useEffect(() => {runtime.current?.setSidewall(surfaces.sidewall);}, [surfaces.sidewall]);
  useEffect(() => {runtime.current?.setFinish(surfaces.finish);}, [surfaces.finish]);
  useEffect(() => {
    let live = true;
    setBindingStatus(binding ? 'loading' : 'none');
    runtime.current?.setBinding(binding ? {colorway: binding.colorway, url: binding.url} : null).then(status => {if (live && status !== 'superseded') setBindingStatus(status);});
    return () => {live = false;};
  }, [binding?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mesh) return undefined;
    let live = true;
    setArtwork('loading');
    const box = {widthMm: mesh.definition.fullWidthMm, lengthMm: mesh.definition.lengthMm};
    paintSurfaces(surfaces, {...box, size: canvasSize(box.widthMm, box.lengthMm)})
      .then(painted => {if (live) {runtime.current?.setSurfaces({...painted, sidewall: surfaces.sidewallText ? paintSidewall(surfaces.sidewallText, {lengthMm: box.lengthMm, heightMm: mesh.definition.sidewallHeightMm ?? 5}) : null}); setArtwork('ready');}})
      .catch(() => {if (live) setArtwork('error');});
    return () => {live = false;};
  }, [surfaces.key, JSON.stringify(surfaces.sidewallText ?? null), mesh?.definition.fullWidthMm, mesh?.definition.lengthMm]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pointerHint, touchHint] = HINTS[cameraView] ?? HINTS.front;
  return (
    <section id="cfg-preview" className={`cfg-3d view-${cameraView}`} aria-label={words.preview ?? '3D ski preview'} data-model={display.model} data-length={display.length} data-artwork={artwork}>
      <div className="cfg-3d-stage">
        <div className="cfg-3d-heading">
          {heading.eyebrow && <p className="cfg-overline">{heading.eyebrow}</p>}
          <h2>{heading.title}</h2>
          {heading.lines.filter(Boolean).map((line, i) => (
            <p key={i} className={i === 0 ? 'cfg-3d-lead' : undefined}>{line}</p>
          ))}
          {heading.finish && (
            <p className="cfg-3d-finish">
              <span aria-hidden="true">◌</span> {heading.finish}
            </p>
          )}
          {binding && (
            <p className="cfg-3d-binding-caption">
              {binding.caption} · {previewBinding ? 'Visual test only' : 'In your build'}
            </p>
          )}
        </div>
        <div className="cfg-3d-viewport">
          <div className={`cfg-3d-canvas ${!mesh || fatal ? 'is-unavailable' : ''}`} ref={host} />
          {(!mesh || fatal) && (
            <div className="cfg-3d-message" role="status">
              <strong>{fatal || (words.empty ?? 'Choose an available model and length to preview your ski.')}</strong>
            </div>
          )}
          {mesh && !fatal && (
            <>
              <div className="cfg-3d-controls">
                {cameraView === 'bindings' && binding && (
                  <button type="button" className="cfg-3d-remove" onClick={onRemoveBinding}>
                    Remove bindings
                  </button>
                )}
                {cameraView === 'construction' && (
                  <div className="cfg-3d-actions">
                    <button type="button" aria-pressed={assembled} onClick={() => {runtime.current?.setSeparation(assembled ? 1 : 0); setAssembled(!assembled);}}>
                      {assembled ? 'Separate layers' : words.assemble ?? 'Assemble ski'}
                    </button>
                    <button type="button" aria-pressed={overview} onClick={() => {runtime.current?.setOverview(!overview); setOverview(!overview); setAssembled(false);}}>
                      {overview ? words.detail ?? 'Underfoot detail' : words.whole ?? 'Whole ski'}
                    </button>
                  </div>
                )}
                <div className="cfg-3d-zoom">
                  <button type="button" aria-label="Zoom out 3D" onClick={() => runtime.current?.zoomBy(0.8)}>
                    <Minus size={13} />
                  </button>
                  <button type="button" aria-label="Reset 3D camera" onClick={() => {if (cameraView === 'construction') {setOverview(true); runtime.current?.setOverview(true);} else runtime.current?.setView(cameraView); setAssembled(false);}}>
                    <RotateCcw size={13} />
                  </button>
                  <button type="button" aria-label="Zoom in 3D" onClick={() => runtime.current?.zoomBy(1.25)}>
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <div className="cfg-3d-hint">
                <p className="cfg-3d-pointer-hint">{pointerHint}</p>
                <p className="cfg-3d-touch-hint">{touchHint}</p>
                {artwork !== 'ready' && <p role="status">{artwork === 'loading' ? 'Updating artwork…' : 'Artwork failed to load. Reload to retry.'}</p>}
                {cameraView === 'bindings' && ['loading', 'error'].includes(bindingStatus) && (
                  <p role="status">{bindingStatus === 'loading' ? 'Loading binding…' : 'Binding failed to load. Remove it and choose again to retry.'}</p>
                )}
                {cameraView === 'bindings' && !binding && <p>Skis only · choose a binding in the Bindings step</p>}
              </div>
            </>
          )}
        </div>
        {mesh && !fatal && cameraView === 'construction' && (
          <>
            {activeInfo && (
              <div className="cfg-3d-layer-card" role="status" aria-live="polite">
                <p className="cfg-3d-layer-eyebrow">
                  <i className="cfg-3d-dot" style={{background: activeInfo.color}} />
                  Layer {String(activeIndex + 1).padStart(2, '0')} of {legend.length}
                  {pinnedLayer === activeInfo.key ? ' · pinned' : ''}
                </p>
                <h3>{activeInfo.name}</h3>
                <p className="cfg-3d-layer-spec">{activeInfo.spec}</p>
                <p>{activeInfo.about}</p>
              </div>
            )}
            <button type="button" className="cfg-3d-layers-toggle" aria-expanded={layersOpen} aria-controls="cfg-3d-layers" onClick={() => setLayersOpen(open => !open)}>
              {layersOpen ? 'Hide layers' : `Explore ${legend.length} layers`}
            </button>
            <ol id="cfg-3d-layers" className={`cfg-3d-legend ${activeLayer ? 'has-active' : ''} ${layersOpen ? 'is-open' : ''}`} aria-label="Layers in this build. Hover, focus or select a layer to highlight it.">
              {legend.map((layer, i) => (
                <li key={layer.key}>
                  <button
                    type="button"
                    className={`cfg-3d-chip ${activeLayer === layer.key ? 'is-active' : ''} ${layer.empty ? 'is-empty' : ''}`}
                    aria-pressed={pinnedLayer === layer.key}
                    onMouseEnter={() => setLegendLayer(layer.key)}
                    onMouseLeave={() => setLegendLayer(null)}
                    onFocus={() => setLegendLayer(layer.key)}
                    onBlur={() => setLegendLayer(null)}
                    onClick={() => setPinnedLayer(current => (current === layer.key ? null : layer.key))}
                  >
                    <span className="cfg-3d-chip-title">
                      <i className="cfg-3d-dot" style={{background: layer.color}} />
                      <span className="cfg-3d-num">{String(i + 1).padStart(2, '0')}</span>
                      {layer.name}
                    </span>
                    <span className="cfg-3d-chip-spec">{layer.spec}</span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
        {mesh && !fatal && techSpecs && (
          <dl className="cfg-3d-tech" aria-label="Technical specifications">
            {techSpecs.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {disclosure.length > 0 && (
          <details className="cfg-3d-disclosure">
            <summary>About this preview</summary>
            <div>
              {disclosure.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          </details>
        )}
      </div>
      <div className="cfg-3d-footer">
        <RadioGroup label="Preview view" className="cfg-segmented is-glass" options={views} value={view === 'Bindings' && !hasBindings ? 'Topsheet' : view} onChange={onView} />
      </div>
    </section>
  );
}
