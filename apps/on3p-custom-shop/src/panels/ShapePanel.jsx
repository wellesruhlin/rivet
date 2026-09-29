import {useRef, useState} from 'react';
import {ArrowUpRight, Check, ChevronDown, Info} from 'lucide-react';
import {canRipper, categories, getModel, modelByHandle, rockerReason, rulesFor} from '../config.js';
import {Field, PanelHead, RadioGroup} from '../components/Controls.jsx';

export function Note({children, tone = 'caution'}) {
  return (
    <div className={`note note-${tone}`}>
      <Info size={16} strokeWidth={1.8} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

const Dot = ({checked}) => <span className="radio-dot">{checked && <Check size={12} strokeWidth={3} />}</span>;

export default function ShapePanel({config, update, openModal}) {
  const model = getModel(config);
  const group = categories.find(g => g.id === config.category);
  const rules = rulesFor(config);
  const [changingStyle, setChangingStyle] = useState(false);
  const modelSelect = useRef(null);
  const chooseStyle = category => {
    update({category});
    setChangingStyle(false);
    requestAnimationFrame(() => modelSelect.current?.focus({preventScroll: true}));
  };
  const rockerOptions = [
    {value: 'Signature', title: 'Signature', text: 'Original profile', disabled: !config.length},
    {value: 'Ripper', title: 'Ripper', text: 'More camber & edge', disabled: !config.length || !canRipper(model, config.length), describedBy: 'rocker-availability'},
  ];

  return (
    <div className="shape-panel">
      <PanelHead index={0} title="Shape">
        {!group && 'Choose your skiing style to find your shape.'}
      </PanelHead>

      {group && !changingStyle ? (
        <button type="button" className="choice-summary" aria-expanded={false} aria-controls="ski-style-choices" onClick={() => setChangingStyle(true)}>
          <span><small>Skiing style</small><strong>{group.id}</strong></span>
          <span className="summary-change">Change <ChevronDown size={15} /></span>
        </button>
      ) : <div id="ski-style-choices"><Field label="The way you ski" action={group && <button type="button" className="text-button" onClick={() => setChangingStyle(false)}>Done</button>}>
        <RadioGroup
          label="The way you ski"
          className="category-grid"
          itemClassName="choice-card category-card"
          options={categories.map(g => ({value: g.id, group: g}))}
          value={config.category}
          onChange={chooseStyle}
          render={({value, group: g}, checked) => (
            <>
              <span className="card-top">
                <span className="card-title">{value}</span>
                <Dot checked={checked} />
              </span>
              <span className="card-text">{g.description}</span>
              <span className="card-meta">{g.models.length} shapes</span>
            </>
          )}
        />
      </Field></div>}

      {group && (
        <div className="reveal">
          <Field
            label="Your model"
            action={
              model && (
                <button type="button" className="text-button" onClick={() => openModal('specs')}>
                  View specs
                </button>
              )
            }
          >
            <div className="select">
              <select ref={modelSelect} aria-label={`${group.id} model`} value={config.model} onChange={e => update({model: e.target.value})}>
                <option value="" disabled>
                  Choose your {group.id.toLowerCase()} model
                </option>
                {group.models.map(handle => (
                  <option key={handle} value={handle}>
                    {modelByHandle(handle).name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
            {model && <details className="choice-details mobile-model-about"><summary>About this ski</summary><p>{model.description}</p></details>}
            {group.id === 'Touring' && (
              <p className="hint">These shapes also appear in ON3P’s Touring collection. Selecting one starts with Tour layup (+$150); you can change the layup later.</p>
            )}
          </Field>

          {model && (
            <>
              <Field
                label="Length · cm"
                action={
                  <button type="button" className="text-button" onClick={() => openModal('size')}>
                    Size guide
                  </button>
                }
              >
                <RadioGroup
                  label="Length in centimeters"
                  className="length-row"
                  itemClassName="length-chip"
                  options={rules.lengths.map(length => ({value: length, label: length}))}
                  value={config.length}
                  onChange={length => update({length})}
                />
                {rules.timing[config.length] && <p className="hint">{rules.timing[config.length]}</p>}
                {model.handle === 'woodsman-92' && <p className="hint">166 cm appears in the spec table but is unavailable in the live custom builder.</p>}
              </Field>

              {(
                <Field
                  label="Rocker"
                  action={
                    <button type="button" className="text-button" onClick={() => openModal('rocker')}>
                      About rocker
                    </button>
                  }
                >
                  <RadioGroup
                    label="Rocker profile"
                    className="rocker-grid"
                    itemClassName="choice-card rocker-card"
                    options={rockerOptions}
                    value={config.rocker}
                    onChange={rocker => update({rocker})}
                    render={(option, checked) => (
                      <>
                        <span className="card-top">
                          <span className="card-title">{option.title}</span>
                          <Dot checked={checked} />
                        </span>
                        <span className="card-text">{option.text}</span>
                      </>
                    )}
                  />
                  <p id="rocker-availability" className="hint">
                    {!config.length ? 'Choose a length to unlock rocker options.' : !canRipper(model, config.length) ? rockerReason(config) : null}
                  </p>
                </Field>
              )}

              {!rules.verified && <Note>{rules.notes[0]}</Note>}
            </>
          )}
        </div>
      )}

      <a className="row-link" href="https://www.on3pskis.com/pages/custom-ski-fit-check" target="_blank" rel="noreferrer">
        <span>
          <strong>Not sure?</strong> Talk skis with Scott at ON3P
        </span>
        <ArrowUpRight size={18} strokeWidth={1.6} />
      </a>
    </div>
  );
}
