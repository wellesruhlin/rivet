export const PREVIEW_VIEWS = [
  {value: 'Topsheet', label: 'Front'},
  {value: 'Base', label: 'Back'},
  {value: 'Sidewall', label: 'Sidewall'},
  {value: 'Bindings', label: 'Bindings'},
  {value: '3D', label: '3D'},
  {value: 'Construction', label: 'Inside'},
  {value: 'Technical', label: 'Tech Specs'},
];
export const cameraFor = view => ({Topsheet: 'front', Base: 'back', Sidewall: 'sidewall', '3D': 'orbit', Bindings: 'bindings', Construction: 'construction', Technical: 'tech'})[view] ?? 'front';
// Looking underneath the physical pair reverses its left/right order. Only the
// Back presentation counter-swaps the artwork for the individual-ski flip.
export const baseArtworkSide = (side, view = 'front') => view === 'back' ? side : 1 - side;
export const viewForField = (field, step) => step === 3 || field === 'binding' ? 'Bindings' : step === 2 || ['layup', 'flex', 'detune', 'skinClip'].includes(field) ? 'Construction' : field === 'base' ? 'Base' : field === 'sidewall' ? 'Sidewall' : 'Topsheet';
export const smoothTransition = value => {const x = Math.max(0, Math.min(1, value)); return x * x * x * (x * (x * 6 - 15) + 10);};
