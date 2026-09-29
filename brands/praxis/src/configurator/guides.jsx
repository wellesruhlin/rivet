import {ArrowUpRight} from 'lucide-react';
import {formatMoney} from '@rivet/configurator/engine';
import {asset, catalog, cores, flexGuide} from './pack.js';
import {chartFor, specAt} from '../catalog/specs.js';

const External = ({href, children}) => (
  <a className="cfg-external-action" href={href} target="_blank" rel="noreferrer">
    {children}
    <ArrowUpRight size={17} strokeWidth={1.6} />
  </a>
);
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

// Praxis help dialogs inside the configurator.
export const guides = {
  how: {
    title: 'How a Praxis custom build works',
    render: () => (
      <>
        <ol className="cfg-how-list">
          {[
            ['Choose your shape', 'Pick a category, then one of 22 Praxis models and a length. Published dimensions and weights stay with the choice.'],
            ['Wood meets art', 'Choose printed nylon or one of six wood veneers, then artwork from the Praxis library.'],
            ['Tune the ride', 'Set the flex from #1 to #5, the core, a ±10 mm width change or a custom profile. Prices and weight update as you go.'],
            ['Tell Praxis about you', 'Your ability, size and where you ski help Praxis confirm the build.'],
            ['Save it to your bag', 'The build is kept on this device with its build sheet. Orders continue with Praxis, who confirm every custom pair before it is made.'],
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
        <External href="https://www.praxisskis.com/custom-ski-order-information/">Praxis’s custom order guide</External>
      </>
    ),
  },
  size: {
    title: 'Choosing a length',
    render: ({ctx}) => (
      <>
        <p>Start with your height and weight, then think about ability, terrain and the skis you ride now. Shapes with more rocker ski shorter than their length suggests.</p>
        <p>{ctx.model ? `The ${ctx.model.name} comes in ${ctx.model.lengths.map(l => l.label).join(', ')} cm.` : 'Each model lists its own lengths.'} Between two? Praxis would rather talk it through than guess from a chart.</p>
        <External href="https://www.praxisskis.com/pages/customer-service/contact-us.html">Ask Praxis about sizing</External>
      </>
    ),
  },
  specs: {
    title: (config, ctx) => `${ctx.model?.name ?? 'Model'} specifications`,
    wide: true,
    render: ({config, ctx}) => {
      const chart = chartFor(ctx.model.id);
      if (!chart)
        return (
          <>
            <p>{ctx.model.summary}</p>
            <p>Praxis hasn’t published a spec chart for the {ctx.model.name}. Lengths offered: {ctx.model.lengths.map(l => l.label).join(', ')} cm.</p>
            <External href={ctx.model.url}>The {ctx.model.name} at praxisskis.com</External>
          </>
        );
      const rows = chart.lengths.map(length => specAt(ctx.model.id, length));
      return (
        <>
          <p>{ctx.model.summary}</p>
          <div className="cfg-table-scroll">
            <table className="cfg-table">
              <thead>
                <tr>
                  <th>Length</th>
                  <th>Tip / waist / tail</th>
                  <th>Radius</th>
                  <th>Sidecut</th>
                  <th>Rocker tip / tail</th>
                  <th>Boot center</th>
                  <th>Weight / pair</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.length} className={config.length === row.length ? 'is-current' : ''}>
                    <td>{row.length} cm</td>
                    <td>
                      {row.tip} / {row.waist} / {row.tail}
                    </td>
                    <td>{row.radius} m</td>
                    <td>{row.sidecut} cm</td>
                    <td>
                      {row.tipRocker} / {row.tailRocker} cm
                    </td>
                    <td>{signed(row.boot)} cm</td>
                    <td>{row.weight} lb</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cfg-fine">
            Widths in mm. Weight for the standard edition{chart.weightNote ? ` (${chart.weightNote.toLowerCase()})` : ''}. Boot center is measured from the ski’s center. Transcribed from Praxis’s {chart.year} spec chart.{' '}
            {ctx.model.lengths.some(l => !chart.lengths.includes(l.value)) && `Lengths not on the chart (${ctx.model.lengths.filter(l => !chart.lengths.includes(l.value)).map(l => l.label).join(', ')} cm) have no published figures.`}
          </p>
        </>
      );
    },
  },
  flex: {
    title: 'Choosing a flex',
    render: ({ctx, config}) => (
      <>
        <p>Praxis builds five flexes, #1 softest to #5 stiffest. Softer skis bend more, turn easily at lower speed, float sooner and weigh a little less. Stiffer skis need more speed and energy, and hold their line through crud.</p>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
            <thead>
              <tr>
                <th>Flex</th>
                <th>Praxis weight guideline</th>
              </tr>
            </thead>
            <tbody>
              {flexGuide.map(f => (
                <tr key={f.flex} className={String(f.flex) === config.flex ? 'is-current' : ''}>
                  <td>
                    #{f.flex}
                    {f.label ? ` · ${f.label}` : ''}
                    {f.flex === ctx.standardFlex ? ' · standard' : ''}
                  </td>
                  <td>{f.riders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cfg-fine">A starting point, not a rule: ability and preference matter too. Praxis will talk through a flex outside the guideline.</p>
      </>
    ),
  },
  cores: {
    title: 'Core options',
    wide: true,
    render: ({ctx, config}) => (
      <>
        <p>Praxis cores combine hard maple, ash, aspen and paulownia, bookmatched so both skis of a pair share the same grain and flex.</p>
        <div className="cfg-table-scroll">
          <table className="cfg-table">
            <thead>
              <tr>
                <th>Core</th>
                <th>Woods</th>
                <th>Layup</th>
                <th>For the {ctx.model?.name}</th>
              </tr>
            </thead>
            <tbody>
              {(ctx.model?.cores ?? []).map(c => (
                <tr key={c.value} className={c.value === config.core ? 'is-current' : ''}>
                  <td>
                    {c.label.replace(/^Ultra light/, 'Ultra Light')}
                    {c.value === ctx.standardCore ? ' · standard' : ''}
                  </td>
                  <td>{cores[c.value].woods}</td>
                  <td>{cores[c.value].layup}</td>
                  <td>{c.price ? `+${formatMoney(c.price)}` : 'Included'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cfg-fine">Carbon saves about 3 oz per ski at the same flex. Ultra Light always includes carbon. Heavy Hitter adds weight, most noticeably on wide skis.</p>
      </>
    ),
  },
  veneer: {
    title: 'Digitally stained wood veneer',
    wide: true,
    render: () => (
      <>
        <p>Any library artwork can be stained into a real wood veneer sheet instead of printed on nylon. The art blends with the color and grain of the wood; white areas don’t print, so they show bare grain. Artwork that isn’t fully saturated shows off both.</p>
        <div className="px-veneer-guide">
          {catalog.veneers.map(v => (
            <figure key={v.id}>
              <img src={asset(`art/veneers/${v.id}.webp`)} alt={`${v.name} veneer sample`} loading="lazy" />
              <figcaption>{v.name}</figcaption>
            </figure>
          ))}
        </div>
        <p>A veneer top also saves 4–8 oz per pair and adds a damp, lively feel. Every sheet is different, so your grain will not match the sample.</p>
        <External href="https://www.praxisskis.com/digitally-stained-wood-veneer-skis/">More about the Praxis process</External>
      </>
    ),
  },
};
