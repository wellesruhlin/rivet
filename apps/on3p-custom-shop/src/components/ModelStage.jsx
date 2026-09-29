import {lazy, Suspense} from 'react';
import {modelByHandle} from '../config.js';
import {RadioGroup} from './Controls.jsx';
import {PREVIEW_VIEWS} from '../preview-views.js';
import './comparison.css';

const SkiModel = lazy(() => import('./SkiModel.jsx'));

// A displayed sample never selects a purchasable size for the customer.
export function displaySelection(config) {
  const model = modelByHandle(config.model) ?? modelByHandle('jeffrey-106');
  const sizes = model.lengths.map(size => size.length_cm);
  const length = config.length ?? (sizes.includes(186) ? 186 : sizes[Math.floor(sizes.length / 2)]);
  return {...config, model: model.handle, length};
}

export default function ModelStage({config, view, onView, previewRef, previewBinding, onRemoveBinding}) {
  const hasBinding = !!(previewBinding || config.binding);
  const views = PREVIEW_VIEWS.filter(option => option.value !== 'Bindings' || hasBinding);
  const displayView = view === 'Bindings' && !hasBinding ? '3D' : view;
  return <section id="ski-preview" ref={previewRef} className={`preview-comparison model-primary ${view === 'Construction' ? 'is-construction' : ''}`} aria-label="3D ski preview">
    <Suspense fallback={<div className="model-message" role="status">Loading your ski…</div>}>
      <SkiModel config={displaySelection(config)} view={displayView} sample={!config.model} pendingLength={!!config.model && !config.length} previewBinding={previewBinding} onRemoveBinding={onRemoveBinding} />
    </Suspense>
    <div className="comparison-footer">
      <RadioGroup label="Preview view" className="segmented glass" options={views} value={displayView} onChange={onView} />
    </div>
  </section>;
}
