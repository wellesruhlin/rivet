import {useState} from 'react';
import {ArrowUpRight, Download, Link2} from 'lucide-react';
import {formatWeight} from '../engine/engine.js';
import {Field, RadioGroup} from './Controls.jsx';
import {GroupField} from './Fields.jsx';
import ArtSwatch from './ArtSwatch.jsx';

export function PanelHead({index, step, config}) {
  // An intro may depend on the build (a prompt that retires once it is answered).
  const intro = typeof step.intro === 'function' ? step.intro(config) : step.intro;
  return (
    <header className="cfg-panel-head">
      <h2><span className="cfg-heading-number">{String(index + 1).padStart(2, '0')}</span>{step.title}</h2>
      {intro && <p className="cfg-panel-intro">{intro}</p>}
    </header>
  );
}

function FooterLink({link}) {
  if (!link) return null;
  return (
    <a className="cfg-row-link" href={link.href} target={link.external === false ? undefined : '_blank'} rel="noreferrer">
      <span>
        <strong>{link.strong}</strong> {link.text}
      </span>
      <ArrowUpRight size={18} strokeWidth={1.6} />
    </a>
  );
}

// Consecutive toggles or text fields that share `ui.fieldGroup` render under one label;
// consecutive groups that share a `ui.fold` label fold into one disclosure (advanced options).
function bundle(groups) {
  const out = [];
  for (const group of groups) {
    const last = out[out.length - 1];
    const fold = typeof group.ui?.fold === 'string' ? group.ui.fold : null;
    if (fold && last?.fold === fold) last.groups.push(group);
    else if (fold) out.push({fold, groups: [group]});
    else if (group.ui?.fieldGroup && last?.fieldGroup === group.ui.fieldGroup) last.groups.push(group);
    else out.push({fieldGroup: group.ui?.fieldGroup, groups: [group]});
  }
  return out;
}

function MoreDetails({engine, label, groups, props}) {
  const defaults = engine.defaults();
  const changed = groups.some(group => props.config[group.id] !== defaults[group.id]);
  return (
    <details className="cfg-more-details" open={changed || undefined}>
      <summary>
        <strong>{label}</strong>
        <span>{groups.map(group => engine.format(group, props.config[group.id], props.config)).join(' · ')}</span>
      </summary>
      {groups.map(group => (
        <GroupField key={group.id} engine={engine} group={group} {...props} />
      ))}
    </details>
  );
}

function GroupList({engine, groups, props}) {
  const ctx = engine.context(props.config);
  const visible = groups.filter(group => group.ui?.visible?.(props.config, ctx) ?? true);
  return bundle(visible).map(({fieldGroup, fold, groups: members}) =>
    fold ? (
      <MoreDetails key={fold} engine={engine} label={fold} groups={members} props={props} />
    ) : fieldGroup ? (
      <Field key={fieldGroup} label={fieldGroup} className={members[0].type === 'toggle' ? 'is-switches' : 'is-texts'}>
        {members.map(group => (
          <GroupField key={group.id} engine={engine} group={group} {...props} />
        ))}
      </Field>
    ) : (
      <GroupField key={members[0].id} engine={engine} group={members[0]} {...props} />
    ),
  );
}

export function StepPanel({engine, index, config, field, update, onView, onField, openGuide, display, binding}) {
  const step = engine.steps[index];
  const groups = engine.stepGroups(step.id);
  const tabs = step.layout === 'tabs' ? step.tabs ?? groups.map(group => ({group: group.id, label: group.ui?.tab ?? group.label})) : null;
  const initialTab = tabs?.find(tab => tab.group === field)?.group ?? tabs?.[0].group;
  const [tab, setTab] = useState(initialTab);
  const props = {config, update, onView, openGuide, display, binding};
  const ctx = engine.context(config);

  return (
    <>
      <PanelHead index={index} step={step} config={config} />
      {tabs ? (
        <>
          <RadioGroup
            label={step.tabsLabel ?? step.label}
            className="cfg-segmented is-block cfg-tabs"
            options={tabs.map(t => ({value: t.group, label: t.label}))}
            value={tab}
            onChange={next => {
              // On a confirmation step the tab is the choice being confirmed, so it moves the
              // session (and the primary button) with it.
              if (engine.pack.confirm?.step === step.id && onField) return onField(next);
              setTab(next);
              const view = tabs.find(t => t.group === next)?.view;
              if (view) onView(view);
            }}
          />
          <GroupList engine={engine} groups={groups.filter(group => group.id === tab)} props={{...props, bare: true}} />
        </>
      ) : (
        <GroupList engine={engine} groups={groups} props={props} />
      )}
      {step.footnote && <p className="cfg-fine">{typeof step.footnote === 'function' ? step.footnote(config, ctx) : step.footnote}</p>}
      <FooterLink link={step.link} />
    </>
  );
}

// Hands the exact build to the maker desk for review, a confirmed quote and an order
// export. The pack decides where it is offered (local pilots only, for example).
function Handoff({handoff, config, previewBinding}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (handoff.available && !handoff.available()) return null;
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      location.assign(await handoff.submit(config, {previewBinding}));
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };
  return (
    <section className="cfg-review-block" aria-label={handoff.label ?? 'Maker review'}>
      <h3 className="cfg-overline">{handoff.title}</h3>
      <p className="cfg-fine cfg-handoff-text">{handoff.text}</p>
      <button className="cfg-outline-button" type="button" disabled={busy} onClick={submit}>
        {busy ? handoff.busy ?? 'Saving your build…' : handoff.button}
      </button>
      {error && <p role="alert" className="cfg-fine cfg-handoff-error">{error}</p>}
    </section>
  );
}

function ReviewBlock({title, onEdit, children}) {
  return (
    <section className="cfg-review-block">
      <div className="cfg-review-head">
        <h3 className="cfg-overline">{title}</h3>
        <button type="button" className="cfg-text-button" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

const Rows = ({rows}) => (
  <dl className="cfg-review-rows">
    {rows.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

export function ReviewPanel({engine, config, setStep, share, download, display, previewBinding, notify}) {
  const index = engine.steps.length - 1;
  const step = engine.steps[index];
  const lines = engine.bom(config);
  const ctx = engine.context(config);
  const {amount, quote} = engine.total(config);
  const weight = engine.weight(config);
  const formattedWeight = weight && formatWeight(weight);
  const shape = engine.pack.art.shape(display, engine.context(display));
  const review = engine.pack.review ?? {};
  const missing = engine.missingForOrder(config);
  const isBinding = line => engine.group(line.key)?.type === 'binding';
  const bindingGroup = engine.groups.find(group => group.type === 'binding');
  // A visual-test binding is shown on the skis and listed here, but it is not priced.
  const bindingRows = line => {
    if (previewBinding) return [['Visual test', engine.format(bindingGroup, previewBinding, config)]];
    return [[config[line.key] ? 'Binding pair' : 'Setup', line.value]];
  };
  const bindingNote = bindingGroup?.ui?.reviewNote?.(config, ctx, previewBinding);

  return (
    <>
      <PanelHead index={index} step={step} config={config} />
      {engine.steps.slice(0, -1).map((s, stepIndex) => {
        const stepLines = lines.filter(line => line.step === stepIndex);
        const galleries = stepLines.filter(line => engine.group(line.key).type === 'gallery');
        const hero = stepLines.find(line => engine.group(line.key).type === 'model');
        const texts = engine.stepGroups(s.id).filter(group => group.type === 'text' && config[group.id] && !group.ui?.reviewHidden);
        const rows = stepLines.filter(line => line !== hero && !galleries.includes(line) && !isBinding(line) && !(hero && (engine.group(line.key).type === 'length' || engine.group(line.key).ui?.size)));
        const binding = stepLines.find(isBinding);
        return (
          <ReviewBlock key={s.id} title={s.label} onEdit={() => setStep(stepIndex)}>
            {hero && (
              <>
                <p className="cfg-review-model">{hero.value}</p>
                <p className="cfg-review-meta">{review.heroMeta?.(config, ctx)}</p>
              </>
            )}
            {galleries.length > 0 && (
              <div className="cfg-review-art">
                {galleries.map(line => {
                  const group = engine.group(line.key);
                  const item = engine.options(group, config, ctx).find(option => option.value === config[line.key]);
                  return (
                    <figure key={line.key}>
                      {item && <ArtSwatch shape={shape} layers={engine.pack.art.swatch(item, line.key, display, engine.context(display))} className="cfg-review-swatch" />}
                      <figcaption>
                        <span>{line.label}</span>
                        {line.value}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
            {rows.length > 0 && <Rows rows={rows.map(line => [line.label, line.value])} />}
            {binding && (
              <>
                <Rows rows={bindingRows(binding)} />
                {bindingNote && <p className="cfg-fine cfg-review-note">{bindingNote}</p>}
              </>
            )}
            {texts.length > 0 && <Rows rows={texts.map(group => [group.ui?.reviewLabel ?? group.label, config[group.id]])} />}
          </ReviewBlock>
        );
      })}

      <section className="cfg-price-card" aria-label="Price breakdown">
        {lines
          .filter(line => (review.priceKeys ? review.priceKeys.includes(line.key) : line.price || line.quote))
          .map(line =>
            isBinding(line) && previewBinding ? (
              <div key={line.key} className="cfg-price-line">
                <span>{engine.format(bindingGroup, previewBinding, config)} · visual test</span>
                <span>Not in total</span>
              </div>
            ) : (
              <div key={line.key} className="cfg-price-line">
                <span>{review.priceLabel?.(line) ?? `${line.value} ${line.label.toLowerCase()}`}</span>
                <span>{line.quote ? `Quote ${engine.money(line.quote[0])}–${engine.money(line.quote[1])}` : line.price ? engine.money(line.price) : 'Included'}</span>
              </div>
            ),
          )}
        <div className="cfg-price-total">
          <span>{engine.pack.copy.totalLabel ?? 'Reference total'}</span>
          <strong>{engine.money(amount)}</strong>
        </div>
        {quote && (
          <p className="cfg-price-quote">
            Plus quote items estimated at {engine.money(quote[0])}–{engine.money(quote[1])}, confirmed by {engine.pack.name}.
          </p>
        )}
        {formattedWeight?.value && (
          <p className="cfg-price-weight">
            <span>{review.weightLabel ?? 'Estimated weight'}</span>
            {formattedWeight.text}
          </p>
        )}
        <p className="cfg-fine">{engine.pack.copy.priceNote}</p>
      </section>

      {missing.length > 0 && (
        <div className="cfg-note cfg-note-caution cfg-review-missing" role="status">
          <p>
            Before ordering: {missing.map(item => item.label).join(', ')}.{' '}
            <button type="button" className="cfg-text-button" onClick={() => setStep(missing[0].step)}>
              Add now
            </button>
          </p>
        </div>
      )}

      {engine.pack.handoff && <Handoff handoff={engine.pack.handoff} config={config} previewBinding={previewBinding} />}
      <div className="cfg-review-actions">
        <button type="button" className="cfg-outline-button" onClick={share}>
          <Link2 size={15} strokeWidth={1.8} /> Copy build link
        </button>
        <button type="button" className="cfg-outline-button" onClick={download}>
          <Download size={15} strokeWidth={1.8} /> Download build sheet
        </button>
      </div>
      <FooterLink link={step.link} />
    </>
  );
}
