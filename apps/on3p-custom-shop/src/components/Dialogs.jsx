import {useEffect, useRef} from 'react';
import {ArrowUpRight, Check, Download, Link2, RotateCcw, X} from 'lucide-react';
import {getModel, layups, money, signed} from '../config.js';

const TITLES = {
  size: 'Get the length right',
  rocker: 'Two ways to ride',
  layups: 'What’s inside your skis',
  how: 'From your screen to the snow',
  save: 'Keep your build',
  saved: 'Build saved',
};

const External = ({href, children}) => (
  <a className="external-action" href={href} target="_blank" rel="noreferrer">
    {children}
    <ArrowUpRight size={17} strokeWidth={1.6} />
  </a>
);

function SizeGuide() {
  return (
    <>
      <p>Use the model’s actual lengths as your starting point. Your weight, stance, terrain and the ski’s rocker matter as much as height.</p>
      <p>A shorter option generally feels easier to pivot. A longer one gives you more platform and support. ON3P notes that its skis can measure longer than other brands with the same marked length.</p>
      <p>Between sizes? A free fit check with Scott is a better next step than an automatic height-only recommendation.</p>
      <External href="https://www.on3pskis.com/pages/custom-ski-fit-check">Schedule an ON3P fit check</External>
    </>
  );
}

function RockerGuide() {
  return (
    <>
      <h3>Signature</h3>
      <p>The model’s original rocker profile, built around its intended terrain and feel.</p>
      <h3>Ripper</h3>
      <p>Less rocker and more camber for additional effective edge and hard-snow performance. Available only in supported models and lengths.</p>
      <p className="fine">
        Ripper is limited to 176 / 181 / 186 cm on the supported Mango, Oski and Jeffrey shapes, and 171 / 176 / 181 / 186 cm on Woodsman. Billy Goat, Cease &amp; Desist and Jeffrey 118 / 124 have Signature only. Mango 114 custom rocker is held for confirmation. The Technical view profile is schematic.
      </p>
    </>
  );
}

function SpecTable({model, config}) {
  return (
    <>
      <p>{model.description}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Length</th>
              <th>Tip / waist / tail</th>
              <th>Radius</th>
              <th>Mount*</th>
              <th>Stock weight</th>
            </tr>
          </thead>
          <tbody>
            {model.lengths.map(l => (
              <tr key={l.length_cm} className={config.length === l.length_cm ? 'is-current' : ''}>
                <td>{l.length_cm} cm</td>
                <td>
                  {l.tip_mm} / {l.waist_mm} / {l.tail_mm}
                </td>
                <td>{l.turn_radius_m} m</td>
                <td>{signed(l.mount_from_center_cm)} cm</td>
                <td>{l.weight_g.toLocaleString('en-US')} g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">Dimensions in mm. Weight per ski, stock layup. *Mount from true center. Source: ON3P 26.27 specification table, revision September 19, 2026.</p>
    </>
  );
}

function LayupTable({config}) {
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Layup</th>
              <th>Core</th>
              <th>Base</th>
              <th>Edges</th>
              <th>Upgrade</th>
            </tr>
          </thead>
          <tbody>
            {layups.map(l => (
              <tr key={l.id} className={config.layup === l.id ? 'is-current' : ''}>
                <td>{l.id}</td>
                <td>{l.core}</td>
                <td>{l.base}</td>
                <td>{l.edge}</td>
                <td>{l.price ? money(l.price) : 'Included'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">Hybrid cores include a bamboo mounting plate. Metal prices use the regular $150 upgrade, excluding the temporary September offer. Weight changes vary by model and length.</p>
    </>
  );
}

function HowItWorks() {
  const stepsCopy = [
    ['Pick your platform', 'Choose a category, model, length and rocker. The published specs stay with the decision.'],
    ['Make it look like you', 'Explore original ON3P topsheets and bases, then finish with a sidewall color.'],
    ['Tune the feel', 'Choose the layup and flex. See the costs and tradeoffs before you commit.'],
    ['Complete the setup', 'Add a binding pair from ON3P’s current lineup, inspect the Pivot 15 test model, or keep skis only.'],
    ['Keep the build', 'Save on this device, copy a link or download your build sheet. This independent fan concept does not take orders.'],
  ];
  return (
    <>
      <ol className="how-list">
        {stepsCopy.map(([title, text], i) => (
          <li key={title}>
            <span className="how-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p>The live ON3P page listed an estimated 40-day lead time when this concept was made. Check their site for current timing and full terms.</p>
      <External href="https://www.on3pskis.com/products/custom-skis">Visit ON3P’s custom shop</External>
    </>
  );
}

export default function Dialogs({type, close, config, save, restore, hasSave, share, download}) {
  const ref = useRef(null);
  const model = getModel(config) ?? {name: 'Draft'};
  const open = !!type;

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return undefined;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus({preventScroll: true});
    };
  }, [open]);

  if (!type) return null;
  const title = type === 'specs' ? `${model.name} specifications` : TITLES[type];
  const wide = type === 'specs' || type === 'layups';

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      className={`dialog ${wide ? 'is-wide' : ''}`}
      onCancel={close}
      onClick={event => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">
        {type === 'size' && <SizeGuide />}
        {type === 'rocker' && <RockerGuide />}
        {type === 'specs' && <SpecTable model={model} config={config} />}
        {type === 'layups' && <LayupTable config={config} />}
        {type === 'how' && <HowItWorks />}
        {type === 'save' && (
          <>
            <p>Keep this setup on this device, or take a copy with you.</p>
            <div className="save-actions">
              <button type="button" className="primary-button" onClick={save}>
                Save on this device <Check size={17} />
              </button>
              {hasSave && (
                <button type="button" className="outline-button" onClick={restore}>
                  <RotateCcw size={15} strokeWidth={1.8} /> Restore last saved build
                </button>
              )}
              <button type="button" className="outline-button" onClick={share}>
                <Link2 size={15} strokeWidth={1.8} /> Copy build link
              </button>
              <button type="button" className="outline-button" onClick={download}>
                <Download size={15} strokeWidth={1.8} /> Download build sheet
              </button>
            </div>
            <p className="fine">Build links preserve your ski and binding choices. Unavailable bindings remain visual selections outside the quoted total. A localhost link works on this device until the prototype is hosted.</p>
          </>
        )}
        {type === 'saved' && (
          <>
            <div className="saved-mark">
              <Check size={28} strokeWidth={2} />
            </div>
            <p>Your {model.name} build is saved on this device. You can restore it from Save.</p>
            <button type="button" className="primary-button" onClick={close}>
              Back to your skis
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
