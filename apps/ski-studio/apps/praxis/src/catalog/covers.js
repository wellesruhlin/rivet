// Which original Praxis photograph becomes each stock ski's cover cutout.
// `full` pairs stand on the studio floor; `tips` crops rise from the bottom edge
// because no full-length photograph exists for those models.
export const stockCovers = {
  gpo: {photo: 'gpo-2.jpg', kind: 'full'},
  exp: {photo: 'exp-1.jpg', kind: 'full'},
  snd: {photo: 'snd-1.jpg', kind: 'tips'},
  'mvp-94': {photo: 'mvp-94-3.jpg', kind: 'full'},
  '9d8': {photo: '9d8-2.jpg', kind: 'full'},
  'praxis-slugger': {photo: 'praxis-slugger-3.jpg', kind: 'tips'},
  bc: {photo: 'bc-1.jpg', kind: 'full'},
  frd: {photo: 'frd-0.jpg', kind: 'tips'},
  'mvp-108': {photo: 'mvp-108-1.jpg', kind: 'full'},
  'jedi-mind-sticks': {photo: 'jedi-mind-sticks-3.jpg', kind: 'full'},
  rx: {photo: 'rx-1.jpg', kind: 'full'},
  frs: {photo: 'frs-2.jpg', kind: 'full'},
  protest: {photo: 'protest-1.jpg', kind: 'full'},
  valkyrie: {photo: 'valkyrie-0.jpg', kind: 'full'},
};

// Close-ups for editorial sections, cut out and turned so the skis lie tip-left.
export const detailCutouts = {
  'gpo-detail': {photo: 'gpo-detail.jpg', rotate: -90},
  'snd-detail': {photo: 'snd-detail.jpg', rotate: -90},
};
