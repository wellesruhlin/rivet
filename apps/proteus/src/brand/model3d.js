// Proteus in the shared 3D studio: one board, its artwork, layup and camber, and the words
// around them.
import {boardShape} from './geometry.js';
import {proteusLayers, proteusStack, CONSTRUCTION_SOURCE} from './construction.js';
import {describeCamber, describeEnd, ESTIMATES, presetFor, sizeLabel, TRAVEL_MM} from './specs.js';

export const SIDEWALL_COLOR = '#17181b';

export const VIEWS = [
  {value: 'Topsheet', label: 'Front', camera: 'front'},
  {value: 'Base', label: 'Back', camera: 'back'},
  {value: 'Sidewall', label: 'Sidewall', camera: 'sidewall'},
  {value: '3D', label: '3D', camera: 'orbit'},
  {value: 'Camber', label: 'Camber', camera: 'camber'},
  {value: 'Construction', label: 'Inside', camera: 'construction'},
  {value: 'Technical', label: 'Tech Specs', camera: 'tech'},
];

export function createModel3d({art, designLine}) {
  const shapeOf = (config, ctx) => boardShape(ctx.displaySize, config.nose ?? 0, config.tail ?? 0);

  return {
    pair: false,
    // The Inside view frames a wider piece of the board than it would for a ski.
    detailSpan: 1.25,
    views: VIEWS,
    animateShape: true,
    copy: {preview: '3D snowboard preview', empty: 'Choose a size to preview your board.', assemble: 'Assemble board', whole: 'Whole board', detail: 'Center detail'},
    labels: {
      front: 'Front view of your board. The board turns to show its base. Scroll to zoom.',
      back: 'Back view: the base of your board. Scroll to zoom.',
      orbit: 'Full 3D view of your board. Drag or use arrow keys to orbit; scroll to zoom.',
      sidewall: 'Close-up of the sidewall and topsheet. Drag to inspect.',
      construction: 'Exploded construction of your board. Drag or use arrow keys to inspect the layers.',
      tech: 'Side profile at actual proportions, with technical specifications.',
      camber: 'Side profile of your camber setting with heights exaggerated four times, over a snow line.',
    },

    shape: shapeOf,

    surfaces(config, ctx) {
      const shape = shapeOf(config, ctx);
      const box = {width: shape.plan.contactWidth, length: shape.lengthMm};
      const layers = art.layers(config, ctx, box);
      return {
        key: art.key(config, ctx),
        top: {left: layers.top, right: layers.top},
        base: {left: layers.base, right: layers.base},
        finish: 'textured',
        sidewall: SIDEWALL_COLOR,
        sidewallText: config.sidewallText ? {text: config.sidewallText, color: '#f1f1ee', background: SIDEWALL_COLOR, font: '600 1px "Urbanist Variable", "Urbanist", system-ui, sans-serif', span: .3, capHeightMm: 3.4} : null,
      };
    },

    construction(config, ctx) {
      const build = ctx.stiffness;
      const stopper = !!config.snowStopper;
      return {
        key: `${ctx.displaySize.id}|${build.id}|${stopper}`,
        veneer: false,
        stack: mesh => proteusStack(mesh, {size: ctx.displaySize, build, stopper}),
        legend: proteusLayers({build, stopper, custom: ctx.custom}),
      };
    },

    // The Snow Stopper sits in the adjustment port at the center of the topsheet.
    parts(config) {
      if (!config.snowStopper) return [];
      const r = 3, h = 11, points = [];
      for (const [cx, cz, a0] of [[h - r, h - r, 0], [-(h - r), h - r, 90], [-(h - r), -(h - r), 180], [h - r, -(h - r), 270]]) {
        for (let k = 0; k <= 4; k++) {const a = (a0 + k * 22.5) * Math.PI / 180; points.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);}
      }
      return [{id: 'snow-stopper', outline: points, heightMm: 1.6, liftMm: -.2, u: .5, color: 0x2c2f35, roughness: .5, clearcoat: .35, bevelMm: .6}];
    },

    heading(config, ctx, {cameraView, lengthChosen}) {
      const size = ctx.displaySize;
      const camber = describeCamber(config.nose, config.tail);
      return {
        eyebrow: 'All-mountain twin · Adjustable Camber',
        title: ctx.custom ? 'Your artwork' : ctx.design.name,
        lines: [
          `${lengthChosen ? sizeLabel(size) : `${size.id} shown · select a size`} · ${ctx.stiffness.label} build`,
          cameraView === 'camber' || cameraView === 'tech' ? camber : designLine(config, ctx),
        ],
        finish: cameraView === 'construction' ? 'Your graphic. Every layer beneath it.'
          : cameraView === 'back' ? (ctx.custom ? 'Sintered base in your colors' : 'Sintered base · the design’s own colors')
          : cameraView === 'camber' ? 'Heights exaggerated 4× · nose on the left'
          : cameraView === 'sidewall' ? (config.sidewallText ? `Sidewall text: ${config.sidewallText}` : 'Polyurethane sidewall')
          : 'PiO2 textured topsheet',
      };
    },

    techSpecs(config, ctx) {
      const shape = shapeOf(config, ctx);
      const size = ctx.displaySize, p = shape.profile;
      return [
        ['Size', size.wide ? `${size.id} · wide · ${size.length} cm` : `${size.length} cm`],
        ['Effective edge', `${size.edge} cm`],
        ['Sidecut radius', `${size.radius} m`],
        ['Waist', `${size.waist} cm`],
        ['Rider weight', `${size.rider[0]}–${size.rider[1]} lb`],
        ['Stance width', `${size.stance[0]}–${size.stance[1]} cm`],
        ['Binding size', size.binding],
        ['Camber', [
          describeCamber(config.nose, config.tail),
          presetFor(config.nose, config.tail) && config.nose !== config.tail ? `nose ${describeEnd(config.nose)}, tail ${describeEnd(config.tail)}` : null,
          Math.abs(p.centerMm) >= .5 ? `center ${p.centerMm.toFixed(1)} mm off the snow` : 'center on the snow',
        ].filter(Boolean).join(' · ')],
      ];
    },

    disclosure(config, ctx, cameraView) {
      const notes = [
        'Waist, sidecut radius and effective edge are Proteus’s published figures for this size. The nose and tail outline is traced from Proteus’s product art.',
        `Camber: Proteus states each end moves up to 1.2 in (${TRAVEL_MM} mm) at the end of the effective edge and marks flat with the center line of its indicator, so the preview takes flat as mid-travel. The molded curve, kick height (about ${ESTIMATES.kickMm} mm), thickness and edge sizes are estimates.`,
        'Artwork comes from Proteus’s product images, which are small, so close-ups are soft.',
      ];
      if (cameraView === 'construction') notes.push(`Layers follow Proteus’s construction notes (${CONSTRUCTION_SOURCE}). The camber mechanism’s internals aren’t published; the housing and tension members are illustrative, as are all internal thicknesses and positions.`);
      if (ctx.custom) notes.push('Custom artwork is shown the way Proteus asks for it: one image stretched over the full 13 × 68 in template. Proteus reviews every file before production.');
      return notes;
    },
  };
}
