import {ArrowUpRight} from 'lucide-react';
import {formatMoney} from '@rivet/configurator/engine';
import {layups} from '../rules.js';

const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

const External = ({href, children}) => (
  <a className="cfg-external-action" href={href} target="_blank" rel="noreferrer">
    {children}
    <ArrowUpRight size={17} strokeWidth={1.6} />
  </a>
);

// ON3P help dialogs, rendered inside the shared configurator.
export const guides = {
  size: {
    title: 'Get the length right',
    render: () => (
      <>
        <p>Use the model’s actual lengths as your starting point. Your weight, stance, terrain and the ski’s rocker matter as much as height.</p>
        <p>A shorter option generally feels easier to pivot. A longer one gives you more platform and support. ON3P notes that its skis can measure longer than other brands with the same marked length.</p>
        <p>Between sizes? A free fit check with Scott is a better next step than an automatic height-only recommendation.</p>
        <External href="https://www.on3pskis.com/pages/custom-ski-fit-check">Schedule an ON3P fit check</External>
      </>
    ),
  },
  rocker: {
    title: 'Two ways to ride',
    render: () => (
      <>
        <h3>Signature</h3>
        <p>The model’s original rocker profile, built around its intended terrain and feel.</p>
        <h3>Ripper</h3>
        <p>Less rocker and more camber for additional effective edge and hard-snow performance. Available only in supported models and lengths.</p>
        <p className="cfg-fine">
          Ripper is limited to 176 / 181 / 186 cm on the supported Mango, Oski and Jeffrey shapes, and 171 / 176 / 181 / 186 cm on Woodsman. Billy Goat, Cease &amp; Desist and Jeffrey 118 / 124 have Signature only. Mango 114 custom rocker is held for confirmation. The Technical view profile is schematic.
        </p>
      </>
    ),
  },
  specs: {
    title: (config, ctx) => `${ctx.model?.name ?? 'Model'} specifications`,
    wide: true,
    render: ({config, ctx}) => (
      <>
        <p>{ctx.model.description}</p>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
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
              {ctx.model.lengths.map(l => (
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
        <p className="cfg-fine">Dimensions in mm. Weight per ski, stock layup; other layups change it by ON3P’s published ranges. *Mount from true center. Source: ON3P 26.27 specification table, revision September 19, 2026.</p>
      </>
    ),
  },
  layups: {
    title: 'What’s inside your skis',
    wide: true,
    render: ({config}) => (
      <>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
            <thead>
              <tr>
                <th>Layup</th>
                <th>Core</th>
                <th>Base</th>
                <th>Edges</th>
                <th>Weight</th>
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
                  <td>{l.weight}</td>
                  <td>{l.price ? formatMoney(l.price) : 'Included'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cfg-fine">Hybrid cores include a bamboo mounting plate. Metal prices use the regular $150 upgrade, excluding the temporary September offer. Weight changes vary by model and length.</p>
      </>
    ),
  },
  how: {
    title: 'From your screen to the snow',
    render: () => (
      <>
        <ol className="cfg-how-list">
          {[
            ['Pick your platform', 'Choose a category, model, length and rocker. The published specs stay with the decision.'],
            ['Make it look like you', 'Explore original ON3P topsheets and bases, then finish with a sidewall color.'],
            ['Tune the feel', 'Choose the layup and flex. See the costs, weight and tradeoffs before you commit.'],
            ['Complete the setup', 'Add a binding pair from ON3P’s current lineup, inspect the Pivot 15 test model, or keep skis only.'],
            ['Keep the build', 'Save on this device, copy a link or download your build sheet. This independent fan concept does not take orders.'],
          ].map(([title, text], i) => (
            <li key={title}>
              <span className="cfg-how-index">{String(i + 1).padStart(2, '0')}</span>
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
    ),
  },
};
