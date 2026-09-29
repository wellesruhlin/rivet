// Stage view names (shared with the 2D stage and the packs) and their cameras. Node-safe.
export const VIEWS = [
  {value: 'Topsheet', label: 'Front', camera: 'front'},
  {value: 'Base', label: 'Back', camera: 'back'},
  {value: 'Sidewall', label: 'Sidewall', camera: 'sidewall'},
  {value: 'Bindings', label: 'Bindings', camera: 'bindings'},
  {value: '3D', label: '3D', camera: 'orbit'},
  {value: 'Construction', label: 'Inside', camera: 'construction'},
  {value: 'Technical', label: 'Tech Specs', camera: 'tech'},
];
export const cameraFor = (view, views = VIEWS) => views.find(v => v.value === view)?.camera ?? VIEWS.find(v => v.value === view)?.camera ?? 'front';
