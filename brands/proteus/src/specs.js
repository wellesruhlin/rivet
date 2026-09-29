// Proteus's published numbers, from proteussnowboards.com (observed September 25, 2026):
// the sizing chart on every board page, the four builds in the Stiffness Guide and the
// camber settings on the Tech page. Everything else in the preview is an estimate and is
// labelled as one where it is shown.
import catalog from './data/catalog.json' with {type: 'json'};

export {catalog};

// Sizing chart: rider weight (lb), effective edge (cm), sidecut radius (m), waist (cm),
// binding size and stance width (cm).
export const SIZES = [
  {id: '148', length: 148, wide: false, rider: [110, 150], edge: 112, radius: 7, waist: 24.5, binding: 'S/M', stance: [46.5, 58.5]},
  {id: '151', length: 151, wide: false, rider: [125, 165], edge: 115, radius: 7, waist: 24.8, binding: 'M', stance: [49, 61]},
  {id: '154', length: 154, wide: false, rider: [130, 170], edge: 118, radius: 7, waist: 25.2, binding: 'M/L', stance: [49, 61]},
  {id: '157', length: 157, wide: false, rider: [140, 180], edge: 121, radius: 7.5, waist: 25.3, binding: 'M/L', stance: [50.5, 62.5]},
  {id: '157W', length: 157, wide: true, rider: [140, 180], edge: 121, radius: 7.5, waist: 25.8, binding: 'L', stance: [50.5, 62.5]},
  {id: '159', length: 159, wide: false, rider: [150, 190], edge: 123, radius: 8, waist: 25.5, binding: 'L', stance: [52, 64]},
  {id: '159W', length: 159, wide: true, rider: [150, 190], edge: 123, radius: 8, waist: 25.9, binding: 'L', stance: [52, 64]},
  {id: '161', length: 161, wide: false, rider: [160, 200], edge: 125, radius: 8, waist: 25.6, binding: 'L', stance: [52, 64]},
  {id: '161W', length: 161, wide: true, rider: [160, 200], edge: 125, radius: 8, waist: 25.9, binding: 'L', stance: [52, 64]},
  {id: '163W', length: 163, wide: true, rider: [165, 205], edge: 126, radius: 8, waist: 26.1, binding: 'L', stance: [52, 64]},
  {id: '165W', length: 165, wide: true, rider: [170, 210], edge: 128, radius: 8, waist: 26.2, binding: 'L', stance: [52, 64]},
];
const sizesById = new Map(SIZES.map(size => [size.id, size]));
export const sizeById = id => sizesById.get(id);
export const sizeLabel = size => `${size.id}${size.wide ? ' · Wide' : ''}`;
// The sizes whose published rider range includes a weight.
export const fitsRider = (size, lb) => Number.isFinite(lb) && lb >= size.rider[0] && lb <= size.rider[1];

// The Stiffness Guide: four builds, set by glass weight, placement and fiber orientation.
// `scale` is where Proteus's own gauge places each build (soft and playful 0 → stiff and
// aggressive 1). Prices are the variation prices on every board page, above Flex.
const flexPrice = catalog.designs[0].prices.flex;
export const STIFFNESS = [
  {id: 'flex', label: 'Flex', scale: .22, top: '12 oz biax glass', bottom: '12 oz biax glass',
    summary: 'The most playful and forgiving build. Suited to lighter riders and smaller boards; butters and presses come easy.'},
  {id: 'soft', label: 'Soft', scale: .38, top: '12 oz biax glass', bottom: '18 oz biax glass',
    summary: 'A softer ride that still lands bigger drops and takes more aggressive riding.'},
  {id: 'standard', label: 'Standard', scale: .56, top: '18 oz biax glass', bottom: '18 oz biax glass',
    summary: 'The all-mountain build: flex between your feet, with energy and rigidity from each binding out to the edge.'},
  {id: 'stiff', label: 'Stiff', scale: .78, top: '19 oz triax glass', bottom: '19 oz triax glass',
    summary: 'For riders leaving playful behind: bigger lines and higher speeds.'},
].map(build => ({...build, price: catalog.designs[0].prices[build.id] - flexPrice, reinforcement: '19 oz triax glass', carbon: 'Calculated carbon torsional support', stitch: 'Thru-Stitch Kevlar'}));
const stiffnessById = new Map(STIFFNESS.map(build => [build.id, build]));
export const stiffnessOf = id => stiffnessById.get(id);

// ---------------------------------------------------------------------------
// Adjustable Camber. One screw at the center of the board tensions each half: loose is
// full camber, tight is full rocker, and each end is set on its own. Proteus states that
// the board moves up to 1.2 in per side at the end of the effective edge, and marks flat
// with the center line of its indicator; the preview takes flat as the middle of that
// travel. Settings are 0 (full camber) to 100 (full rocker) per end.
export const TRAVEL_MM = 30.5;
export const FLAT = 50;

// The six configurations on Proteus's Tech page, as indicator positions.
export const CAMBER_PRESETS = [
  {id: 'full-camber', label: 'Full Camber', nose: 0, tail: 0, text: 'Both screws loose. The best edge hold.'},
  {id: 'mid-camber', label: 'Mid Camber', nose: 25, tail: 25, text: 'Rebound in the turn, more forgiving of a caught edge.'},
  {id: 'flat', label: 'Flat', nose: 50, tail: 50, text: 'Indicators on the center line. Responsive and forgiving.'},
  {id: 'full-rocker', label: 'Full Rocker', nose: 100, tail: 100, text: 'Both screws snug. Easiest and most playful; for the heaviest snow.'},
  {id: 'mid-s', label: 'Mid S Curve', nose: 60, tail: 25, text: 'Nose just past flat, tail in mid camber. All-mountain, if you don’t ride switch.'},
  {id: 'full-s', label: 'Full S Curve', nose: 100, tail: 0, text: 'Nose in full rocker, tail in full camber. Lift in powder, edge to lean on.'},
];
export const presetFor = (nose, tail) => CAMBER_PRESETS.find(p => p.nose === nose && p.tail === tail) ?? null;

// Height of the end of the effective edge above the board's center, in mm (negative is camber).
export const contactOffset = setting => TRAVEL_MM * (setting - FLAT) / 100;

export function describeEnd(setting) {
  const offset = contactOffset(setting);
  if (Math.abs(offset) < .5) return 'flat';
  return `${Math.abs(offset).toFixed(offset > -10 && offset < 10 ? 1 : 0)} mm ${offset < 0 ? 'camber' : 'rocker'}`;
}
export function describeCamber(nose, tail) {
  const preset = presetFor(nose, tail);
  if (preset) return preset.label;
  if (nose === tail) return `Custom · ${describeEnd(nose)}`;
  return `Custom · nose ${describeEnd(nose)}, tail ${describeEnd(tail)}`;
}

// ---------------------------------------------------------------------------
// Construction dimensions Proteus doesn't publish (estimates, shown as such).
export const ESTIMATES = {underfootMm: 9.5, endMm: 3.8, edgeWidthMm: 2, edgeHeightMm: 2.2, baseMm: 1.3, kickMm: 50};
