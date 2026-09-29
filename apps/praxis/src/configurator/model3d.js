// Praxis in the shared 3D studio: shape, surfaces, layup, bindings and the words around them.
import {formatWeight} from '@rivet/configurator/engine';
import {praxisShape} from './geometry.js';
import {praxisLayers, praxisStack, CONSTRUCTION_SOURCE} from './construction.js';
import {bindingCaption, bindingFor, colorwayFor} from './bindings.js';

const FINISHES = {wood: 'Satin wood veneer', nylon: 'Satin printed nylon'};
const BASE_COLOR = '#141516';
const SIDEWALL_COLOR = '#171717';

export function createModel3d({asset, graphicById, veneerById, cores, estimateWeight, lengthLabel, artLine}) {
  const coreOf = (config, ctx) => {
    const id = cores[config.core] ? config.core : ctx.standardCore ?? 'enduro';
    const label = (ctx.model?.cores.find(c => c.value === id)?.label ?? 'Enduro').replace(/^Ultra light/, 'Ultra Light');
    return {id, label, ...cores[id]};
  };
  const shapeOf = (config, ctx) => praxisShape(ctx.model, config.length, {offsetMm: ctx.offset});

  return {
    bindingModel: asset('models/look-pivot-15.glb'),
    labels: {bindings: 'Binding inspection. Drag to orbit the binding on the selected ski; scroll to zoom.'},

    shape: shapeOf,

    // The same recipe as the 2D preview: veneer halves (bookmatched) with the artwork
    // multiplied in, or artwork printed on nylon. The base is shown in black sintered.
    surfaces(config) {
      const veneer = config.top && config.top !== 'nylon' ? veneerById(config.top) : null;
      const art = config.graphic && config.graphic !== 'none' ? asset(`art/graphics/${config.graphic}.webp`) : null;
      const side = half => [
        veneer ? {href: asset(`art/veneers/${veneer.id}-${half}.webp`)} : {fill: '#24211d'},
        ...(art ? [{href: art, blend: veneer ? 'multiply' : undefined}] : []),
      ];
      return {
        key: `${config.top}|${config.graphic}`,
        top: {left: side('l'), right: side('r')},
        base: {left: [{fill: BASE_COLOR}], right: [{fill: BASE_COLOR}]},
        finish: veneer ? 'wood' : 'nylon',
        sidewall: SIDEWALL_COLOR,
      };
    },

    construction(config, ctx) {
      const core = coreOf(config, ctx);
      const veneer = !!config.top && config.top !== 'nylon';
      return {
        key: `${core.id}|${veneer}`,
        veneer,
        stack: mesh => praxisStack(mesh, {family: core.family, carbon: core.carbon, veneer}),
        legend: praxisLayers({core: core.family, coreLabel: core.label.replace(/ with carbon$/, ''), woods: core.woods, carbon: core.carbon, veneer, veneerName: veneer ? veneerById(config.top)?.name : ''}),
      };
    },

    binding(id) {
      const variant = bindingFor(id);
      return variant ? {key: variant.id, colorway: colorwayFor(variant.color), caption: bindingCaption(variant)} : null;
    },

    heading(config, ctx, {cameraView, sample, lengthChosen}) {
      const model = ctx.model;
      const shape = shapeOf(config, ctx);
      const weight = lengthChosen && ctx.spec ? formatWeight(estimateWeight(config, ctx)) : null;
      const core = coreOf(config, ctx);
      const length = `${lengthLabel(model, config.length)} cm`;
      return {
        eyebrow: sample ? '' : `${ctx.category?.label ?? ''}${ctx.category ? ' · ' : ''}Handcrafted in Tahoe`,
        title: sample ? 'Custom Skis' : model.name,
        lines: sample ? [] : cameraView === 'construction' ? [`${core.label} construction`, core.description] : [model.summary],
        finish: sample ? null : cameraView === 'construction' ? 'Illustrative internal thickness and placement' : cameraView === 'back' ? 'Sintered base · shown in black' : artLine(config),
      };
    },

    techSpecs(config, ctx) {
      const shape = shapeOf(config, ctx);
      if (!shape) return null;
      const spec = ctx.spec, o = ctx.offset, d = ctx.dims;
      const weight = spec ? formatWeight(estimateWeight(config, ctx)) : null;
      const round = x => Math.round(x);
      const p = shape.profile;
      return [
        ['Length', `${lengthLabel(ctx.model, config.length + Math.sign(o))} cm`],
        ['Tip / waist / tail', d.tip ? `${d.tip + o} / ${d.waist + o} / ${d.tail + o} mm` : `≈ ${round(shape.tipMm)} / ${round(shape.waistMm)} / ${round(shape.tailMm)} mm`],
        ['Turn radius', spec ? `${spec.radius} m` : 'Not published'],
        ['Sidecut length', spec ? `${spec.sidecut} cm` : 'Not published'],
        ['Profile', p.molding === 'Continuous rocker' ? 'Continuous rocker' : `${p.molding} · ${p.camberMm} mm camber`],
        ['Tip / tail rocker', spec ? `${spec.tipRocker} / ${spec.tailRocker} cm` : p.kind === 'chart' ? `≈ ${round(p.tipRocker * config.length)} / ${round(p.tailRocker * config.length)} cm` : 'Estimated'],
        ['Boot center', `${p.bootCm} cm from center${p.kind === 'chart' && p.exact ? '' : ' (est.)'}`],
        ['Weight', weight?.value ? weight.text : 'Not published'],
      ];
    },

    disclosure(config, ctx, cameraView) {
      const shape = shapeOf(config, ctx);
      if (!shape) return [];
      const p = shape.profile;
      const notes = [
        shape.published ? 'Outline traced from Praxis’s shape drawing and scaled to the published tip, waist and tail.' : 'Praxis hasn’t published this model’s dimensions: widths come from the proportions of its shape drawing.',
        p.kind === 'chart'
          ? `Rocker, camber and contact from Praxis’s ${p.year} spec chart${p.exact ? '' : ` at ${p.from} cm, scaled to this length`}.`
          : `Profile estimated from ${p.basis}; Praxis hasn’t published a chart for this model.`,
        'Thickness, edge and base sizes are estimates. Artwork and veneer come from Praxis’s order-form images, which are small, so close-ups are soft.',
      ];
      if (ctx.model?.id === 'quixote') notes.push('Praxis builds the Quixote with left- and right-foot outlines; the 3D preview uses one symmetric outline.');
      if (config.molding === 'custom') notes.push('Custom molding is agreed with Praxis; the standard profile is shown.');
      if (cameraView === 'construction') notes.push(`Layers follow Praxis’s construction notes (${CONSTRUCTION_SOURCE}); internal thicknesses and placement are illustrative.`);
      return notes;
    },
  };
}
