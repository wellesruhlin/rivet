import {ArrowRight} from 'lucide-react';
import {PairPreview} from '@arc/configurator';
import {detailUrl, product} from '@arc/brand-praxis/catalog';
import {engine} from '@arc/brand-praxis';
import {catalog} from '@arc/brand-praxis/pack';
import {Cover, StockCard} from '../Cards.jsx';

const FEATURED = ['gpo', 'exp', 'mvp-108', 'rx'];

// Three configured pairs for the custom feature, built by the same engine as #/custom.
const SHOWCASE = [
  {category: 'freeride', model: 'gpo', length: 182, top: catalog.veneers.find(v => v.name === 'Red Gum').id, graphic: catalog.graphics.find(g => g.name === 'Old Growth').id},
  {category: 'powder', model: 'protest', length: 187, top: 'nylon', graphic: catalog.graphics.find(g => g.name === 'Tahoe Pier').id},
  {category: 'touring', model: 'bc', length: 180, top: catalog.veneers.find(v => v.name === 'Maple').id, graphic: catalog.graphics.find(g => g.name === 'Mountain Glow').id},
].map(config => engine.normalize(config));

export default function Home() {
  const gpo = product('gpo');
  const exp = product('exp');
  return (
    <>
      <section className="px-hero">
        <div className="px-shell px-hero-grid">
          <div className="px-hero-copy">
            <p className="px-eyebrow">Handcrafted in Tahoe</p>
            <h1 className="px-display">
              <span>Wood.</span>
              <span>Snow.</span>
              <span>Soul.</span>
            </h1>
            <p className="px-lede">Skis shaped, pressed and finished by hand on the north shore of Lake Tahoe. Real wood tops, and a shape for every kind of mountain.</p>
            <div className="px-actions">
              <a className="px-button" href="#/skis">
                Explore stock skis <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a className="px-button is-outline" href="#/custom">
                Build a custom pair
              </a>
            </div>
          </div>
          <div className="px-hero-stage" aria-label="GPO and EXP stock skis">
            <a className="px-hero-ski" href="#/skis/gpo">
              <Cover p={gpo} eager />
              <span className="px-hero-label">
                GPO <small>Red gum</small>
              </span>
            </a>
            <a className="px-hero-ski" href="#/skis/exp">
              <Cover p={exp} eager />
              <span className="px-hero-label">
                EXP <small>Ambrosia maple</small>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="px-section px-shell">
        <div className="px-section-head">
          <div>
            <p className="px-eyebrow">The stock collection</p>
            <h2>Ready to ride this season.</h2>
          </div>
          <a className="px-text-link" href="#/skis">
            All 14 skis <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="px-grid px-grid-4">
          {FEATURED.map(id => (
            <StockCard key={id} p={product(id)} compare={false} />
          ))}
        </div>
      </section>

      <section className="px-custom-feature">
        <div className="px-shell px-custom-feature-grid">
          <div className="px-custom-feature-copy">
            <p className="px-eyebrow">Custom skis</p>
            <h2>Your shape. Your wood. Your art.</h2>
            <p>Twenty-two Praxis shapes, 157 library artworks and six wood veneers, with flex, core and width tuned to you. See every choice take shape before Praxis builds it.</p>
            <a className="px-button" href="#/custom">
              Open the configurator <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="px-custom-feature-skis cfg-theme" aria-hidden="true">
            {SHOWCASE.map(config => (
              <PairPreview key={config.model} engine={engine} config={config} className="px-showcase-pair" />
            ))}
          </div>
        </div>
      </section>

      <section className="px-material px-shell">
        <figure className="px-material-photo">
          <img src={detailUrl('gpo-detail')} alt="Red gum veneer grain and green GPO artwork" loading="lazy" />
          <figcaption>Red gum veneer · GPO</figcaption>
        </figure>
        <div className="px-material-copy">
          <p className="px-eyebrow">Real wood, individual character</p>
          <h2>Good wood. Great turns.</h2>
          <p>A real veneer gives each pair its own grain and color. The artwork is stained into the wood, so the grain stays part of the design, and no two pairs are quite alike.</p>
          <a className="px-text-link" href="#/materials">
            Explore wood &amp; finish <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="px-section px-shell px-craft">
        <p className="px-eyebrow">From the workshop to the mountain</p>
        <h2>Built with intention. Skied without hesitation.</h2>
        <div>
          <p>Small-batch ski building in Incline Village, Nevada. Bookmatched wood cores, pre-bonded sidewalls and shapes refined on Tahoe snow.</p>
          <a className="px-text-link" href="#/workshop">
            Meet the workshop <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  );
}
