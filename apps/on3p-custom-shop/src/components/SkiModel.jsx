import {useEffect, useMemo, useRef, useState} from 'react';
import {Minus, Plus, RotateCcw} from 'lucide-react';
import {getBase, getTop, layups, modelByHandle, sidewalls} from '../config.js';
import {stageArt} from '../art-geometry.js';
import {configuredGeometry, configuredMesh} from '../geometry/configured.js';
import {createSkiRenderer} from '../geometry/renderer.js';
import {finishFor} from '../geometry/finishes.js';
import {cameraFor} from '../preview-views.js';
import {constructionRecipe} from '../geometry/construction.mjs';
import {constructionLayers} from '../construction-layers.js';
import {bindingFor} from '../bindings.js';

export default function SkiModel({config, view, sample, pendingLength, previewBinding, onRemoveBinding}) {
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
  const binding = bindingFor(previewBinding || config.binding);
  const cameraView = cameraFor(view);
  const layup = layups.find(option => option.id === config.layup);
  const resolved = useMemo(() => configuredGeometry(config), [config.model, config.length, config.rocker, config.layup]);
  const mesh = useMemo(() => resolved ? configuredMesh(resolved) : null, [resolved]);
  const top = getTop(config), base = getBase(config), model = modelByHandle(config.model);
  const finish = finishFor(top);
  const recipe = constructionRecipe(config.layup, finish === 'wood');
  const spec = model.lengths.find(size => size.length_cm === config.length);
  const topSrc = stageArt(top), baseSrc = stageArt(base);
  const printSpec = useMemo(() => ({id: top.id, model: model.name,
    length: `${config.length} CM`, rocker: config.rocker,
    dimensions: spec ? `${spec.tip_mm} / ${spec.waist_mm} / ${spec.tail_mm} MM` : '',
  }), [top.id, model.name, config.length, config.rocker, spec]);
  const sidewall = sidewalls.find(([name]) => name === config.sidewall)?.[1] ?? '#151515';
  const layers = constructionLayers(recipe, {layup: config.layup, sidewall: config.sidewall});
  const activeLayer = cameraView === 'construction' ? legendLayer ?? hoverLayer ?? pinnedLayer : null;
  const activeIndex = layers.findIndex(layer => layer.key === activeLayer);
  const activeInfo = layers[activeIndex];

  useEffect(() => {
    try {runtime.current = createSkiRenderer(host.current, setFatal, {onLayer: setHoverLayer, onPick: key => setPinnedLayer(current => key && key !== current ? key : null)});}
    catch {setFatal('3D is unavailable in this browser. Reload to try again.');}
    return () => {runtime.current?.dispose(); runtime.current = null;};
  }, []);
  useEffect(() => {runtime.current?.setGeometry(mesh);}, [mesh]);
  useEffect(() => {
    if (cameraView === 'construction') runtime.current?.setOverview(true);
    else runtime.current?.setView(cameraView);
    setOverview(true); setAssembled(false); setPinnedLayer(null); setLegendLayer(null);
  }, [cameraView]);
  useEffect(() => {runtime.current?.highlightLayer(activeLayer);}, [activeLayer, config.layup, config.sidewall]);
  useEffect(() => {runtime.current?.setConstruction(config.layup);}, [config.layup]);
  useEffect(() => {runtime.current?.setSidewall(sidewall);}, [sidewall]);
  useEffect(() => {
    let live = true;
    setBindingStatus(binding ? 'loading' : 'none');
    runtime.current?.setBinding(binding).then(status => {if (live && status !== 'superseded') setBindingStatus(status);});
    return () => {live = false;};
  }, [binding]);
  useEffect(() => {runtime.current?.setFinish(finish);}, [finish]);
  useEffect(() => {
    let live = true;
    setArtwork('loading');
    runtime.current?.setArtwork(topSrc, baseSrc, printSpec).then(applied => {if (live && applied) setArtwork('ready');}).catch(() => {if (live) setArtwork('error');});
    return () => {live = false;};
  }, [topSrc, baseSrc, printSpec]);

  return <div className={`ski-model view-${cameraView}`} data-model={config.model} data-length={config.length} data-artwork={artwork}>
    <div className="model-heading">
      {sample ? <h2>Custom Skis</h2> : <>
      <p className="model-category">{config.category}</p>
      <h2>{model.name}</h2>
      {cameraView === 'construction' ? <>
        <p className="model-layup-name">{layup.id} layup</p>
        <p className="model-description">{layup.description}<span className="model-layup-tradeoff">{layup.tradeoff}</span></p>
      </> : <p className="model-description">{model.description}</p>}
      {pendingLength && <p className="model-sample">{config.length} cm preview · choose your length</p>}
      {cameraView === 'back' && <p className="model-view-caption">{base.name} base</p>}
      {cameraView === 'sidewall' && <p className="model-view-caption">{config.sidewall} sidewalls</p>}
      {binding && <p className="model-binding-caption">{binding.product.id === 'pivot-13' ? 'Pivot 13 · Pivot 15 model as stand-in' : `Pivot 15 · ${binding.color}`} · {previewBinding ? 'Visual test only' : 'In your build'}</p>}
      </>}
    </div>
    <div className="model-viewport">
    <div className={`model-canvas ${!resolved || fatal ? 'is-unavailable' : ''}`} ref={host} />
    {(!resolved || fatal) && <div className="model-message" role="status">
      <strong>{fatal || 'Choose an available model and length to preview your ski.'}</strong>
    </div>}
    {resolved && !fatal && <>
      <div className="model-camera-controls">
        {cameraView === 'bindings' && binding && <button type="button" className="binding-remove-preview" onClick={onRemoveBinding}>Remove bindings</button>}
        {cameraView === 'construction' && <div className="construction-actions">
          <button type="button" aria-pressed={assembled} onClick={() => {runtime.current?.setSeparation(assembled ? 1 : 0); setAssembled(!assembled);}}>{assembled ? 'Separate layers' : 'Assemble ski'}</button>
          <button type="button" aria-pressed={overview} onClick={() => {runtime.current?.setOverview(!overview); setOverview(!overview); setAssembled(false);}}>{overview ? 'Underfoot detail' : 'Whole ski'}</button>
        </div>}
        <div className="model-zoom">
          <button type="button" aria-label="Zoom out 3D" onClick={() => runtime.current?.zoomBy(.8)}><Minus size={13} /></button>
          <button type="button" aria-label="Reset 3D camera" onClick={() => {
            if (cameraView === 'construction') runtime.current?.setOverview(true);
            else runtime.current?.setView(cameraView);
            setOverview(true); setAssembled(false);
          }}><RotateCcw size={13} /></button>
          <button type="button" aria-label="Zoom in 3D" onClick={() => runtime.current?.zoomBy(1.25)}><Plus size={13} /></button>
        </div>
      </div>
      <div className="model-display-hint">
        <p className="pointer-hint">{cameraView === 'construction' ? 'Hover or tap a layer · drag to inspect' : cameraView === 'tech' ? 'Scroll to zoom' : cameraView === 'sidewall' ? 'Drag to inspect · scroll to zoom' : ['orbit', 'bindings'].includes(cameraView) ? 'Drag to orbit · scroll to zoom' : 'Scroll to zoom · Front / Back to turn'}</p>
        <p className="touch-hint">{cameraView === 'construction' ? 'Tap a layer · drag to inspect' : cameraView === 'tech' ? 'Pinch to zoom' : ['orbit', 'bindings', 'sidewall'].includes(cameraView) ? 'Drag to inspect · pinch to zoom' : 'Pinch to zoom · Front / Back to turn'}</p>
        {artwork !== 'ready' && <p role="status">{artwork === 'loading' ? 'Updating artwork…' : 'Artwork failed to load. Reload to retry.'}</p>}
        {cameraView === 'bindings' && ['loading', 'error'].includes(bindingStatus) && <p role="status">{bindingStatus === 'loading' ? 'Loading binding…' : 'Binding failed to load. Remove and preview again to retry.'}</p>}
      </div>
    </>}
    </div>
    {resolved && !fatal && <>
      {cameraView === 'construction' && <>
        {activeInfo && <div className="layer-card" role="status" aria-live="polite">
          <p className="layer-card-eyebrow"><i className={`layer-dot layer-${activeInfo.key}`} style={activeInfo.key === 'sidewall' ? {background: sidewall} : undefined} />Layer {String(activeIndex + 1).padStart(2, '0')} of {layers.length}{pinnedLayer === activeInfo.key ? ' · pinned' : ''}</p>
          <h3>{activeInfo.name}</h3>
          <p className="layer-card-spec">{activeInfo.spec}</p>
          <p>{activeInfo.about}</p>
        </div>}
        <button type="button" className="layers-toggle" aria-expanded={layersOpen} aria-controls="construction-layers" onClick={() => setLayersOpen(open => !open)}>{layersOpen ? 'Hide layers' : 'Explore 9 layers'}</button>
        <ol id="construction-layers" className={`construction-legend ${activeLayer ? 'has-active' : ''} ${layersOpen ? 'is-open' : ''}`} aria-label="Layers in this build. Hover, focus or select a layer to highlight it.">
          {layers.map((layer, i) => <li key={layer.key}>
            <button type="button" className={`layer-chip ${activeLayer === layer.key ? 'is-active' : ''} ${layer.empty ? 'is-empty' : ''}`} aria-pressed={pinnedLayer === layer.key}
              onMouseEnter={() => setLegendLayer(layer.key)} onMouseLeave={() => setLegendLayer(null)} onFocus={() => setLegendLayer(layer.key)} onBlur={() => setLegendLayer(null)}
              onClick={() => setPinnedLayer(current => current === layer.key ? null : layer.key)}>
              <span className="layer-chip-title"><i className={`layer-dot layer-${layer.key}`} style={layer.key === 'sidewall' ? {background: sidewall} : undefined} /><span className="layer-num">{String(i + 1).padStart(2, '0')}</span>{layer.name}</span>
              <span className="layer-chip-spec">{layer.spec}</span>
            </button>
          </li>)}
        </ol>
      </>}
      {cameraView === 'tech' && spec && <dl className="model-tech-specs" aria-label="3D technical specifications">
        {[
          ['Length', `${config.length} cm`], ['Sidecut', `${spec.tip_mm} / ${spec.waist_mm} / ${spec.tail_mm} mm`],
          ['Turn radius', `${spec.turn_radius_m} m`], ['Effective edge', `${spec.effective_edge_mm} mm`],
          ['Mount from center', `${spec.mount_from_center_cm} cm`], ['Stock weight', `${spec.weight_g.toLocaleString()} g / ski`],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>}
    </>}
  </div>;
}
