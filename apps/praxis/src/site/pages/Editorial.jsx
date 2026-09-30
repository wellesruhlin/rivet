import {ArrowRight, ArrowUpRight} from 'lucide-react';
import {detailUrl, product} from '@arc/brand-praxis/catalog';
import {asset, catalog, flexGuide} from '@arc/brand-praxis/pack';
import {Cover} from '../Cards.jsx';

const External = ({href, children, className = 'px-text-link'}) => (
  <a className={className} href={href} target="_blank" rel="noreferrer">
    {children} <ArrowUpRight size={14} aria-hidden="true" />
  </a>
);

export function Workshop() {
  const craft = [
    ['Bookmatched cores', 'Each pair’s cores are sliced in sequence from one block, numbered and milled together, so both skis share the same grain, weight and flex.'],
    ['Four woods, three blends', 'Hard maple for binding retention, ash for pop and damping, aspen and paulownia to save weight. Enduro, Heavy Hitter and Ultra Light cores mix them for different jobs.'],
    ['Pre-bonded sidewalls', 'UHMW sidewalls are pressed onto the core before final layup, then machined round so edges can take a beating without chipping the top.'],
    ['Tri-axial glass and carbon', '19, 22 or 26 oz stitched tri-axial fiberglass depending on model and flex, with carbon available on most shapes for a lighter, livelier ski.'],
  ];
  return (
    <div className="px-shell">
      <section className="px-feature">
        <div>
          <p className="px-eyebrow">Incline Village, North Lake Tahoe</p>
          <h1>Small workshop. Big mountains.</h1>
          <p className="px-lede">Praxis grew from a skier’s wish to make a different kind of ski. Design, materials and hands-on building happen together in the mountains that inspire them.</p>
          <External href="https://www.praxisskis.com/pages/company.html">Read the Praxis story</External>
        </div>
        <figure className="px-feature-photo">
          <img src={detailUrl('gpo-detail')} alt="Red gum veneer on a Praxis GPO" loading="lazy" />
          <figcaption>Designed, built and finished with intention</figcaption>
        </figure>
      </section>
      <section className="px-section">
        <div className="px-section-head">
          <div>
            <p className="px-eyebrow">How Praxis builds</p>
            <h2>The details you ski on.</h2>
          </div>
          <External href="https://www.praxisskis.com/ski/construction/">Praxis construction notes</External>
        </div>
        <div className="px-craft-grid">
          {craft.map(([title, text], i) => (
            <article key={title}>
              <span className="px-craft-index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="px-band">
        <div>
          <p className="px-eyebrow">Talk to the maker</p>
          <h2>Independent by nature. Made for the mountain.</h2>
        </div>
        <a className="px-button is-outline" href="#/custom">
          Build a custom pair <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>
    </div>
  );
}

export function Materials() {
  const finishes = ['gpo', 'exp', 'rx', 'frs', 'mvp-108', 'snd'].map(product);
  return (
    <div className="px-shell">
      <header className="px-page-intro">
        <div>
          <p className="px-eyebrow">Wood &amp; finish</p>
          <h1>Nature has good taste.</h1>
        </div>
        <p>A real wood veneer brings warmth and character. Look closer: the grain is part of the graphic.</p>
      </header>
      <figure className="px-wide-photo">
        <img src={detailUrl('snd-detail')} alt="Orange and yellow artwork stained into poplar veneer on the SND" loading="lazy" />
        <figcaption>Artwork stained into poplar · SND</figcaption>
      </figure>
      <section className="px-section px-two-column">
        <h2>Art that lets the wood speak.</h2>
        <div>
          <p>Praxis stains artwork digitally into real veneer instead of printing it on plastic. Color and grain blend; white areas don’t print, so they show bare wood. Art that isn’t fully saturated shows off both.</p>
          <p>Veneer tops also save 4–8 oz per pair and add a damp, lively feel. Every sheet is its own, so no two pairs look quite alike.</p>
          <External href="https://www.praxisskis.com/digitally-stained-wood-veneer-skis/">More about the Praxis process</External>
        </div>
      </section>
      <section className="px-section">
        <div className="px-section-head">
          <div>
            <p className="px-eyebrow">Six species for custom builds</p>
            <h2>Choose your wood.</h2>
          </div>
          <a className="px-text-link" href="#/custom">
            Try them in the configurator <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="px-veneer-grid">
          {catalog.veneers.map(v => (
            <figure key={v.id}>
              <img src={asset(`art/veneers/${v.id}.webp`)} alt={`${v.name} veneer sample`} loading="lazy" />
              <figcaption>
                {v.name}
                <small>+${v.price} on a custom pair</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="px-section">
        <div className="px-section-head">
          <div>
            <p className="px-eyebrow">In the stock collection</p>
            <h2>Every top, a different tree.</h2>
          </div>
        </div>
        <div className="px-finish-grid">
          {finishes.map(p => (
            <a key={p.id} href={`#/skis/${p.id}`} className="px-finish">
              <span className="px-finish-media">
                <Cover p={p} />
              </span>
              <span className="px-finish-name">
                {p.veneer}
                <small>
                  {p.name} <ArrowRight size={13} aria-hidden="true" />
                </small>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export function Support() {
  return (
    <div className="px-shell">
      <header className="px-page-intro">
        <div>
          <p className="px-eyebrow">Here to help</p>
          <h1>Good days start with the right ski.</h1>
        </div>
        <p>Choosing a shape, a length or a flex? Bring your questions to the people who build them.</p>
      </header>
      <div className="px-support">
        <section className="px-accordion" aria-labelledby="px-faq-title">
          <h2 id="px-faq-title">A few useful answers</h2>
          <details open>
            <summary>How do I choose a length?</summary>
            <p>Start with your height, weight, ability, terrain and current skis. Shapes with more rocker ski shorter than their length suggests. Compare a few models, then ask Praxis for a recommendation.</p>
            <a className="px-text-link" href="#/compare">
              Compare skis <ArrowRight size={14} aria-hidden="true" />
            </a>
          </details>
          <details>
            <summary>Which flex is right for me?</summary>
            <p>Praxis builds five flexes. Their weight guideline is a starting point; ability and preference matter too.</p>
            <table className="px-table is-compact">
              <tbody>
                {flexGuide.map(f => (
                  <tr key={f.flex}>
                    <th scope="row">
                      #{f.flex}
                      {f.label ? ` · ${f.label}` : ''}
                    </th>
                    <td>{f.riders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <details>
            <summary>Are all catalog lengths in stock?</summary>
            <p>Lengths here reflect the catalog, not live inventory. Use “Check availability” on a ski page for the current options. The Valkyrie is listed as a preorder.</p>
          </details>
          <details>
            <summary>How long does a custom build take?</summary>
            <p>Lead time depends on the model and the build. Praxis confirms timing when you order; shipping is quoted at checkout on the Praxis store.</p>
          </details>
          <details>
            <summary>What is the warranty?</summary>
            <p>Praxis lists a one-year warranty against manufacturing defects. Contact Praxis for the full terms or help with a claim.</p>
            <External href="https://www.praxisskis.com/pages/customer-service/frequent-questions.html">Read the Praxis FAQ</External>
          </details>
          <details>
            <summary>Can I buy through this site?</summary>
            <p>This is an independent design concept. The bag saves your picks and custom builds on this device, but it doesn’t reserve skis or place orders. Purchases continue on praxisskis.com.</p>
          </details>
        </section>
        <aside className="px-contact-card">
          <p className="px-eyebrow">Straight from the workshop</p>
          <h2>Talk skis.</h2>
          <p>Tell Praxis what you ski now, where you ski, and what you want to feel on snow.</p>
          <External href="https://www.praxisskis.com/pages/customer-service/contact-us.html" className="px-button is-wide">
            Contact Praxis
          </External>
          <a className="px-text-link" href="tel:+17754139061">
            775 413 9061
          </a>
          <span className="px-fine">Incline Village, Nevada</span>
        </aside>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="px-shell px-empty px-not-found">
      <p className="px-eyebrow">A little off-piste</p>
      <h1>This trail ends here.</h1>
      <p>Let’s get you back to the skis.</p>
      <a className="px-button" href="#/skis">
        Explore stock skis <ArrowRight size={16} aria-hidden="true" />
      </a>
    </div>
  );
}
