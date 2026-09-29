import {lazy, Suspense, useState} from 'react';
import Stage, {displaySelection} from './Stage.jsx';
import {RadioGroup} from './Controls.jsx';
import {PREVIEW_VIEWS} from '../preview-views.js';
import './comparison.css';

const SkiModel = lazy(() => import('./SkiModel.jsx'));
const modes = [{value: 'compare', label: 'Compare'}, {value: 'original', label: 'Original'}, {value: '3d', label: 'Model only'}];

export default function ComparisonStage({config, view, onView, previewRef}) {
  const [mode, setMode] = useState('compare');
  const inside = view === 'Construction';
  const displayMode = inside ? '3d' : mode;
  const display = displaySelection(config);
  return (
    <section ref={previewRef} className={`preview-comparison mode-${displayMode} ${inside ? 'is-construction' : ''}`} aria-label="Linked ski previews">
      <div className="comparison-toolbar">
        {inside ? <span className="inside-eyebrow">Inside your ski <span> / {config.layup}</span></span> : <RadioGroup label="Preview layout" className="segmented comparison-modes" options={modes} value={mode} onChange={setMode} />}
        <span className="comparison-linked"><i aria-hidden="true" /> {inside ? 'Your selected construction' : 'One build · two views'}</span>
      </div>
      <div className="comparison-panes">
        {displayMode !== '3d' && <div className="comparison-pane original-pane">
          <div className="comparison-label"><strong>01 / Original</strong><span>Artwork preview</span></div>
          <Stage config={config} view={view} onView={onView} linked />
        </div>}
        {displayMode !== 'original' && <div className="comparison-pane model-pane">
          <div className="comparison-label"><strong>{inside ? 'A closer look / Construction' : '02 / 3D study'}</strong><span>{inside ? 'Same ski. From the inside out.' : 'Image-derived shape'}</span></div>
          <Suspense fallback={<div className="model-message" role="status">Loading 3D preview…</div>}>
            <SkiModel config={display} view={view} sample={!config.model} pendingLength={!!config.model && !config.length} />
          </Suspense>
        </div>}
      </div>
      <div className="comparison-footer">
        <RadioGroup label="Preview view" className="segmented glass" options={PREVIEW_VIEWS} value={view} onChange={onView} />
      </div>
    </section>
  );
}
