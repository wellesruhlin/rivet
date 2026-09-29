import {ArrowUpRight} from 'lucide-react';
import {formatMoney} from '@ski-studio/configurator/engine';
import {BASE_PRICE, catalog, COLLAB_PRICE, CUSTOM_FEE} from './brand/pack.js';
import {CAMBER_PRESETS, describeEnd, SIZES, STIFFNESS, TRAVEL_MM} from './brand/specs.js';

const capital = text => text.charAt(0).toUpperCase() + text.slice(1);

const External = ({href, children}) => (
  <a className="cfg-external-action" href={href} target="_blank" rel="noreferrer">
    {children}
    <ArrowUpRight size={17} strokeWidth={1.6} />
  </a>
);

// Proteus help dialogs, rendered inside the shared configurator.
export const guides = {
  size: {
    title: 'Proteus sizing chart',
    wide: true,
    render: ({config}) => (
      <>
        <p>Proteus sizes every board by rider weight. Each size shares one all-mountain twin shape; wide sizes keep the length and add width underfoot.</p>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Rider weight</th>
                <th>Effective edge</th>
                <th>Sidecut</th>
                <th>Waist</th>
                <th>Bindings</th>
                <th>Stance</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map(s => (
                <tr key={s.id} className={config.length === s.id ? 'is-current' : ''}>
                  <td>{s.id}</td>
                  <td>{s.rider[0]}–{s.rider[1]} lb</td>
                  <td>{s.edge} cm</td>
                  <td>{s.radius} m</td>
                  <td>{s.waist} cm</td>
                  <td>{s.binding}</td>
                  <td>{s.stance[0]}–{s.stance[1]} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cfg-fine">From the sizing chart on Proteus’s board pages, observed {catalog.observed}. Sidecut is the radius; binding size is Proteus’s compatibility guide.</p>
      </>
    ),
  },
  stiffness: {
    title: 'The stiffness guide',
    wide: true,
    render: ({config}) => (
      <>
        <p>Four builds, set by fiberglass weight, placement and fiber orientation. Every build has 19 oz triax reinforcement, calculated carbon torsional support and Thru-Stitch Kevlar.</p>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
            <thead>
              <tr>
                <th>Build</th>
                <th>Top sheet</th>
                <th>Bottom sheet</th>
                <th>Feel</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {STIFFNESS.map(b => (
                <tr key={b.id} className={config.stiffness === b.id ? 'is-current' : ''}>
                  <td>{b.label}</td>
                  <td>{b.top}</td>
                  <td>{b.bottom}</td>
                  <td>
                    <span className="pt-gauge is-inline" role="img" aria-label={`${Math.round(b.scale * 100)}% toward stiff`}>
                      <i style={{left: `${b.scale * 100}%`}} />
                    </span>
                  </td>
                  <td>{b.price ? `+${formatMoney(b.price)}` : 'Base'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cfg-fine">From Proteus’s Stiffness Guide; the gauge repeats Proteus’s own scale from soft and playful to stiff and aggressive.</p>
      </>
    ),
  },
  camber: {
    title: 'Adjustable Camber',
    wide: true,
    render: () => (
      <>
        <p>
          A screw at the center of the board sets each end: loosen it for camber, tighten it for rocker. The nose and tail adjust independently, anywhere from full camber to full rocker, with the wrench that comes with every board. Proteus says each end moves up to 1.2 in ({TRAVEL_MM} mm) at the end of the effective edge.
        </p>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
            <thead>
              <tr>
                <th>Setting</th>
                <th>Nose</th>
                <th>Tail</th>
                <th>What it’s for</th>
              </tr>
            </thead>
            <tbody>
              {CAMBER_PRESETS.map(p => (
                <tr key={p.id}>
                  <td>{p.label}</td>
                  <td>{capital(describeEnd(p.nose))}</td>
                  <td>{capital(describeEnd(p.tail))}</td>
                  <td>{p.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Reading the indicator</h3>
        <p>Fully loose is full camber. The center line is flat, and a flat surface confirms it. Tightened until you feel resistance, just short of the mark nearest the board’s center, is full rocker. Don’t force a screw past its limit.</p>
        <p>Proteus recommends returning to full camber at the end of each day. A Snow Stopper keeps snow out of the port; a key or screwdriver clears it too.</p>
        <p className="cfg-fine">Millimeters are this preview’s reading of Proteus’s description, with flat as mid-travel. Proteus doesn’t publish its molded camber or rocker heights.</p>
        <External href="https://www.proteussnowboards.com/technology/">Proteus technology</External>
      </>
    ),
  },
  custom: {
    title: 'Your own artwork',
    render: () => (
      <>
        <p>
          Custom boards start at {formatMoney(BASE_PRICE)} plus a {formatMoney(CUSTOM_FEE)} graphic processing fee, and take 2–8 weeks depending on the season. Proteus hand-builds them in Lakewood, Colorado.
        </p>
        <h3>The template</h3>
        <p>Art fills a 68 × 13 in artboard, edge to edge, with no board outline; Proteus scales it to your size. The outline, inserts and mechanism in the template are for reference only.</p>
        <h3>Files</h3>
        <p>Vector .ai or .svg is preferred. Raster images need 300 ppi at full size, 72 ppi at the least. Work in CMYK; some bright RGB colors don’t print.</p>
        <h3>Placement</h3>
        <p>Keep key details away from the center mechanism, the binding inserts and the edges. Bold shapes and strong contrast read best from a few feet away.</p>
        <h3>Rights</h3>
        <p>Art must be original or yours to use: no sports teams, films or other copyrighted images. Proteus can refuse a design and refunds the deposit if it does.</p>
        <External href="https://www.proteussnowboards.com/custom-snowboard/">Proteus custom snowboards</External>
      </>
    ),
  },
  how: {
    title: 'A Proteus, built your way',
    render: () => (
      <>
        <ol className="cfg-how-list">
          {[
            ['Find your size', 'Enter your weight and choose from Proteus’s eleven sizes, regular or wide.'],
            ['Pick the graphic', `Fifty-three designs in their colorways; collaborations add ${formatMoney(COLLAB_PRICE)}. Or bring your own art and choose base colors.`],
            ['Choose the build', 'Flex, Soft, Standard or Stiff: the glass inside sets the feel. The Inside view shows every layer.'],
            ['Try the camber', 'Set the nose and tail the way you would on the hill, and watch the board change shape.'],
            ['Keep the build', 'Save on this device, copy a link or download the build sheet. This independent fan concept doesn’t take orders.'],
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
        <p>Proteus’s shop listed its boards as “{catalog.status}” on {catalog.observed}, with a few ready-to-ride boards in stock. Check their site for current availability.</p>
        <External href="https://www.proteussnowboards.com/shop/">Visit the Proteus shop</External>
      </>
    ),
  },
};
