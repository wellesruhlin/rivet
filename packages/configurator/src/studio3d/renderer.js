import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFinishMaps, FINISH_RESPONSE} from './finishes.js';
import {createConstructionStudy} from './construction-renderer.js';
import {createBindingStudy} from './binding-renderer.js';

// The shared 3D ski studio, ported from the ON3P configurator's renderer. Views:
// front, back, sidewall, orbit, bindings, construction (exploded layers), tech (side
// profile at true proportions) and camber (side profile with heights exaggerated). A pair
// of skis stands nose-up, each turning on its own axis; `pair: false` shows one board.

const MAX_INSPECTION_ZOOM = 32;
export const smoothTransition = value => {const x = Math.max(0, Math.min(1, value)); return x * x * x * (x * (x * 6 - 15) + 10);};
// Looking underneath the physical pair reverses its left/right order. Only the Back
// presentation counter-swaps the artwork for the individual-ski flip.
export const baseArtworkSide = (side, view = 'front') => (view === 'back' ? side : 1 - side);
const INSPECTION = ['sidewall', 'tech', 'construction', 'bindings', 'camber', 'profile'];
const SIDE_VIEWS = ['tech', 'camber', 'profile'];
export const CAMBER_EXAGGERATION = 4;

export function bufferGeometry(mesh) {
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions.flat(), 3));
  const indices = [];
  for (const face of mesh.faces) for (let i = 1; i < face.length - 1; i++) indices.push(face[0], face[i], face[i + 1]);
  indexed.setIndex(indices);
  indexed.computeVertexNormals();
  const normals = indexed.getAttribute('normal');
  // Smooth only the lighting normals along each longitudinal band; vertices stay put.
  const smoothNormals = new Float32Array(normals.array);
  const direction = new THREE.Vector3();
  for (let row = 0; row < mesh.sections.length; row++) for (let band = 0; band < mesh.ringSize; band++) {
    direction.set(0, 0, 0);
    for (let offset = -5; offset <= 5; offset++) {
      const neighbor = Math.max(0, Math.min(mesh.sections.length - 1, row + offset)) * mesh.ringSize + band;
      const weight = 6 - Math.abs(offset);
      direction.x += normals.getX(neighbor) * weight;
      direction.y += normals.getY(neighbor) * weight;
      direction.z += normals.getZ(neighbor) * weight;
    }
    direction.normalize().toArray(smoothNormals, (row * mesh.ringSize + band) * 3);
  }
  const geometry = new THREE.BufferGeometry();
  const position = [], uv = [], normal = [];
  for (let material = 0; material < 5; material++) {
    const start = position.length / 3;
    mesh.faces.forEach((face, fi) => {
      if (mesh.materials[fi] !== material) return;
      for (let i = 1; i < face.length - 1; i++) for (const corner of [0, i, i + 1]) {
        const id = face[corner];
        position.push(...mesh.positions[id]);
        uv.push(...mesh.uvs[fi][corner]);
        normal.push(smoothNormals[id * 3], smoothNormals[id * 3 + 1], smoothNormals[id * 3 + 2]);
      }
    });
    geometry.addGroup(start, position.length / 3 - start, material);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();
  indexed.dispose();
  return geometry;
}

// Overlays a small high-resolution texture on part of a material's artwork (UV bounds
// [u, v, width, height]), so fine print keeps its detail without a huge whole-ski
// texture. The ink shares the material's lighting and finish.
export function withDetail(material, detail) {
  if (!detail) return material;
  material.onBeforeCompile = shader => {
    shader.uniforms.printDetail = {value: detail.texture};
    shader.uniforms.printBounds = {value: new THREE.Vector4(...detail.bounds)};
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>',
      '#include <map_pars_fragment>\nuniform sampler2D printDetail;\nuniform vec4 printBounds;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 detailUv = (vMapUv - printBounds.xy) / printBounds.zw;
      vec4 detailInk = texture2D(printDetail, clamp(detailUv, 0.0, 1.0));
      float inside = step(0.0, detailUv.x) * step(detailUv.x, 1.0) * step(0.0, detailUv.y) * step(detailUv.y, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, detailInk.rgb, detailInk.a * inside);
    `);
  };
  material.customProgramCacheKey = () => 'arc-print-detail-v1';
  return material;
}

export function createSkiRenderer(host, onFailure, {onLayer, onPick, bindingUrl, labels = {}, pair: showPair = true, detailSpan = .86} = {}) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(2.5, Math.max(2, devicePixelRatio)));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral lights at modest energy preserve the artwork's color; no filmic shoulder.
  renderer.toneMapping = THREE.NoToneMapping;
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const finishes = {textured: createFinishMaps('textured', anisotropy), wood: createFinishMaps('wood', anisotropy), nylon: createFinishMaps('nylon', anisotropy)};
  // Soft studio reflections for the construction materials only.
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04).texture;
  room.dispose(); pmrem.dispose();
  const canvas = renderer.domElement;
  host.append(canvas);
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 20);
  camera.up.set(0, 0, 1);
  let controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minZoom = .3;
  controls.maxZoom = MAX_INSPECTION_ZOOM;
  controls.enablePan = false;
  const pair = new THREE.Group();
  const pivots = [new THREE.Group(), new THREE.Group()];
  pivots.forEach((pivot, side) => {pivot.position.set(showPair ? (.5 - side) * .18 : 0, .009, 0); pair.add(pivot);});
  pivots[1].visible = showPair;
  // The snow line under the side profiles, so contact points and rocker read at a glance.
  const ground = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -.0004, -1.3), new THREE.Vector3(0, -.0004, 1.3)]), new THREE.LineBasicMaterial({color: 0x8d949c, transparent: true, opacity: .55}));
  ground.visible = false;
  scene.add(ground);
  scene.add(pair, new THREE.HemisphereLight(0xffffff, 0xb4bcc5, .55));
  for (const [pos, power] of [[[-1.5, 3, 2], 1.8], [[2, 1.8, -1], 1.35], [[-.4, .8, -3], .65], [[2, -.3, 1], .7], [[0, -3, 1], .65]]) {
    const light = new THREE.DirectionalLight(0xffffff, power);
    light.position.set(...pos);
    scene.add(light);
  }
  let alive = true, geometry, meshes = [], textures = {top: [], base: [], sidewall: null}, details = [], view = 'front', length = 1.8, sidewall = '#151515', finish = 'nylon';
  let parts = [], partSpecs = [];
  let shell = null, layers = null, veneer = false, study = null, reveal = 0, overview = true, highlighted = null, hovered = null, pressed = null;
  let animation = null, frame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const render = () => {if (alive) renderer.render(scene, camera);};
  const bindingStudy = createBindingStudy(pivots, canvas, render, bindingUrl);
  const materials = (side, artworkView = 'front') => {
    const maps = finishes[finish] ?? finishes.nylon;
    const response = FINISH_RESPONSE[finish] ?? FINISH_RESPONSE.nylon;
    const top = textures.top[side] ?? null, base = textures.base[baseArtworkSide(side, artworkView)] ?? null;
    return [
      withDetail(new THREE.MeshPhysicalMaterial({map: top, color: top ? 0xffffff : 0x24211d, roughness: 1, roughnessMap: maps.roughness, normalMap: maps.normal, normalScale: new THREE.Vector2(1, 1), metalness: 0, ior: 1.48, ...response}), top ? details[side] : null),
      new THREE.MeshStandardMaterial({map: base, color: base ? 0xffffff : 0x121314, roughness: .62, metalness: 0}),
      new THREE.MeshStandardMaterial({color: sidewall, roughness: .52}),
      new THREE.MeshStandardMaterial({color: 0xc4c9cc, metalness: .9, roughness: .3}),
      // Printed sidewall (sidewall text); plain sidewall when there is nothing to print.
      new THREE.MeshStandardMaterial({map: textures.sidewall, color: textures.sidewall ? 0xffffff : sidewall, roughness: .52}),
    ];
  };
  const pose = () => ({position: camera.position.clone(), up: camera.up.clone(), target: controls.target.clone(), zoom: camera.zoom, rolls: pivots.map(p => p.rotation.z), xs: pivots.map(p => p.position.x), reveal, exaggeration: pair.scale.y});
  function targetPose(next) {
    const aspect = Math.max(.2, host.clientWidth / Math.max(1, host.clientHeight));
    const mount = (shell?.definition.mountMm ?? -60) / 1000;
    const result = {position: new THREE.Vector3(0, 3, 0), up: new THREE.Vector3(0, 0, 1), target: new THREE.Vector3(0, .009, 0), zoom: 1, rolls: [0, 0], xs: showPair ? [.09, -.09] : [0, 0], reveal: 0, exaggeration: 1};
    if (next === 'back') result.rolls = [Math.PI, Math.PI];
    if (!showPair) result.zoom = Math.min(1.4, 2.25 / (length * 1.18));
    if (next === 'orbit') result.position.set(.85, 2.8, .65);
    if (next === 'bindings') {
      result.position.set(.85, .6, mount + .25);
      result.up.set(0, 1, 0);
      result.target.set(0, .038, mount);
      // Narrow (phone) stages zoom out enough to keep toe and heel in view.
      result.zoom = Math.min(6.3, Math.max(aspect < .8 ? 2.6 : 3.7, aspect * 3.3));
      result.xs = [0, -.22];
    }
    if (next === 'sidewall') {
      result.position.set(1, .31, .48);
      result.up.set(0, 1, 0);
      result.target.set(0, .012, -.045);
      result.zoom = Math.max(2.5, Math.min(10, 2.2 * aspect / .28));
      result.xs = [0, -.22];
    }
    if (next === 'tech' || next === 'camber' || next === 'profile') {
      result.position.set(3, .025, 0);
      result.up.set(0, 1, 0);
      result.target.set(0, next === 'camber' ? .06 : .025, 0);
      result.zoom = Math.max(.3, 2.2 * aspect / (length * 1.12));
      result.xs = [0, -.22];
      if (next === 'camber') result.exaggeration = CAMBER_EXAGGERATION;
    }
    if (next === 'construction') {
      result.position.set(1, .34, .28);
      result.up.set(0, 1, 0);
      result.target.set(0, .065, overview ? 0 : mount);
      result.zoom = Math.max(.3, Math.min(7, 2.2 * aspect / (overview ? length * 1.2 : detailSpan)));
      result.xs = [0, -.22];
      result.reveal = 1;
    }
    return result;
  }
  function applyPose(from, to, t, rollProgress = [t, t], revealProgress = t) {
    camera.position.lerpVectors(from.position, to.position, t);
    camera.up.lerpVectors(from.up, to.up, t).normalize();
    controls.target.lerpVectors(from.target, to.target, t);
    camera.zoom = THREE.MathUtils.lerp(from.zoom, to.zoom, t);
    pivots.forEach((pivot, i) => {pivot.rotation.z = THREE.MathUtils.lerp(from.rolls[i], to.rolls[i], rollProgress[i]); pivot.position.x = THREE.MathUtils.lerp(from.xs[i], to.xs[i], t);});
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    reveal = THREE.MathUtils.lerp(from.reveal, to.reveal, revealProgress);
    pair.scale.y = THREE.MathUtils.lerp(from.exaggeration ?? 1, to.exaggeration ?? 1, t);
    study?.reveal(reveal);
    meshes.forEach(mesh => {mesh.visible = reveal <= .0001;});
    parts.forEach(part => {part.visible = reveal <= .0001;});
    bindingStudy.visibility(view !== 'construction' && !SIDE_VIEWS.includes(view));
    canvas.dataset.separation = String(Math.round(reveal * 100));
  }
  function tick(now) {
    frame = 0;
    if (!alive || !animation) return;
    const {from, to, start, duration, flip, opening} = animation;
    const elapsed = now - start;
    const t = smoothTransition(elapsed / duration);
    const rolls = flip ? [smoothTransition(elapsed / (duration - 50)), smoothTransition((elapsed - 50) / (duration - 50))] : [t, t];
    applyPose(from, to, opening ? smoothTransition(elapsed / 950) : t, rolls, opening ? smoothTransition((elapsed - 260) / (duration - 260)) : t);
    render();
    if (elapsed < duration) frame = requestAnimationFrame(tick);
    else {animation = null; canvas.dataset.transition = 'settled';}
  }
  function stopAnimation() {if (frame) cancelAnimationFrame(frame); frame = 0; animation = null; canvas.dataset.transition = 'settled';}
  function settleAnimation() {
    if (!animation) return;
    const to = animation.to;
    stopAnimation();
    applyPose(pose(), to, 1);
    render();
  }
  function describe(next) {
    const text = labels[next] ?? {
      construction: 'Exploded construction of your selected ski. Drag or use arrow keys to inspect the layers.',
      orbit: 'Full 3D ski view. Drag or use arrow keys to orbit; scroll to zoom.',
      sidewall: 'Close-up of the sidewall and topsheet finish. Drag to inspect.',
      profile: 'Full-length side profile of the selected rocker and tail. Scroll to zoom.',
      tech: 'Side profile at actual proportions, with technical specifications.',
      bindings: 'Binding inspection. Drag to orbit the binding on the selected ski; scroll to zoom.',
      camber: `Side profile with heights exaggerated ${CAMBER_EXAGGERATION} times, over a snow line.`,
      back: 'Back view. Each ski turns on its own vertical axis. Scroll to zoom.',
      front: 'Front view. Each ski turns on its own vertical axis. Scroll to zoom.',
    }[next];
    canvas.setAttribute('aria-label', text);
  }
  function setView(next, {animate = true} = {}) {
    const previous = view;
    const from = pose(), to = targetPose(next);
    stopAnimation();
    // OrbitControls caches its up-axis at construction. Recreate it when moving between
    // the upright pair and the horizontal inspection views.
    if (INSPECTION.includes(previous) !== INSPECTION.includes(next)) {
      controls.removeEventListener('change', onControls);
      controls.removeEventListener('start', startControls);
      controls.dispose();
      camera.up.copy(to.up);
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = false;
      controls.minZoom = .3;
      controls.maxZoom = MAX_INSPECTION_ZOOM;
      controls.enablePan = false;
      controls.addEventListener('change', onControls);
      controls.addEventListener('start', startControls);
    }
    view = next;
    meshes.forEach((ski, side) => {ski.material[1].map = textures.base[baseArtworkSide(side, view)] ?? null; ski.material[1].needsUpdate = true;});
    ground.visible = SIDE_VIEWS.includes(next);
    canvas.dataset.view = next;
    if (next !== 'construction') hover(null);
    describe(next);
    controls.enableRotate = ['orbit', 'sidewall', 'construction', 'bindings'].includes(next);
    if (SIDE_VIEWS.includes(next)) controls.enableRotate = false;
    pivots[1].visible = showPair && !INSPECTION.includes(next);
    if (!animate || reducedMotion.matches) {applyPose(from, to, 1); render(); return;}
    const flip = ['front', 'back'].includes(previous) && ['front', 'back'].includes(next);
    animation = {from, to, start: performance.now(), duration: next === 'construction' ? 1650 : flip ? 1050 : 1000, flip, opening: next === 'construction' && from.reveal < .01};
    canvas.dataset.transition = 'turning';
    frame = requestAnimationFrame(tick);
  }
  function resize() {
    const {width, height} = host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height);
    const half = Math.max(1.1, .25 * height / width);
    camera.left = -half * width / height;
    camera.right = half * width / height;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    // ResizeObserver follows the React layout before an animated transition.
    if (animation) animation.to = targetPose(view);
    else if (INSPECTION.includes(view)) {
      const preserved = reveal;
      setView(view, {animate: false});
      if (view === 'construction') {reveal = preserved; study?.reveal(reveal); meshes.forEach(mesh => {mesh.visible = reveal <= .0001;}); canvas.dataset.separation = String(Math.round(reveal * 100));}
    }
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const onControls = () => {if (!animation) render();};
  controls.addEventListener('change', onControls);
  const startControls = () => settleAnimation();
  controls.addEventListener('start', startControls);
  const lost = event => {event.preventDefault(); stopAnimation(); onFailure('3D graphics context lost. Reload to try again.');};
  canvas.addEventListener('webglcontextlost', lost);
  const zoomBy = factor => {settleAnimation(); camera.zoom = Math.min(MAX_INSPECTION_ZOOM, Math.max(.3, camera.zoom * factor)); camera.updateProjectionMatrix(); render();};
  const keyboard = event => {
    if (event.key === 'Home') {event.preventDefault(); setView(view);}
    if (['+', '=', '-'].includes(event.key)) {event.preventDefault(); zoomBy(event.key === '-' ? .8 : 1.25);}
    if (!controls.enableRotate || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); settleAnimation();
    const offset = camera.position.clone().sub(controls.target);
    const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? camera.up.clone().normalize() : new THREE.Vector3().crossVectors(camera.up, offset).normalize();
    offset.applyAxisAngle(axis, event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -.12 : .12);
    camera.position.copy(controls.target.clone().add(offset));
    camera.lookAt(controls.target); controls.update(); render();
  };
  canvas.addEventListener('keydown', keyboard);
  // Layer picking in the exploded view: hover reports the part under the pointer, and a
  // click or tap without dragging reports a pick (touch has no hover).
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function layerAt(event) {
    if (view !== 'construction' || !study || animation || reveal < .5) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return study.pick(raycaster);
  }
  function hover(key) {
    if (key === hovered) return;
    hovered = key;
    canvas.style.cursor = key ? 'pointer' : '';
    canvas.dataset.hoverLayer = key || '';
    onLayer?.(key);
  }
  const pointerMove = event => {if (!event.buttons) hover(layerAt(event));};
  const pointerLeave = () => hover(null);
  const pointerDown = event => {pressed = [event.clientX, event.clientY];};
  const pointerUp = event => {
    if (!pressed || view !== 'construction') {pressed = null; return;}
    const moved = Math.hypot(event.clientX - pressed[0], event.clientY - pressed[1]);
    pressed = null;
    if (moved < 6) onPick?.(layerAt(event));
  };
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  resize();
  setView(view, {animate: false});
  function rebuildStudy() {
    if (study) {pivots[0].remove(study.group); study.dispose(); study = null;}
    if (shell && layers?.length) {
      study = createConstructionStudy(layers, {exterior: materials(0), anisotropy, envMap: environment, veneer});
      pivots[0].add(study.group);
      study.reveal(reveal);
      study.highlight(highlighted);
      canvas.dataset.layers = String(layers.length);
    }
    meshes.forEach(mesh => {mesh.visible = reveal <= .0001;});
  }
  function refreshMaterials() {meshes.forEach((ski, side) => {ski.material.forEach(m => m.dispose()); ski.material = materials(side, view);}); rebuildStudy(); render();}
  // Raised parts on the topsheet (for example an adjustment cap): prisms from an outline in
  // millimetres (x across, z along the ski) at `u`, standing on the local top surface.
  function placeParts() {
    parts.forEach(part => {
      if (!shell) return;
      const {u, liftMm = 0} = part.userData;
      const section = shell.sections.reduce((a, b) => (Math.abs(a.u - u) < Math.abs(b.u - u) ? a : b));
      part.position.set(0, (section.heightMm + section.thicknessMm + liftMm) / 1000 - .009, (.5 - u) * shell.definition.lengthMm / 1000);
    });
  }
  function buildParts() {
    parts.forEach(part => {part.parent?.remove(part); part.geometry.dispose(); part.material.dispose();});
    parts = [];
    for (const spec of partSpecs) for (const [side, pivot] of pivots.entries()) {
      if (side === 1 && !showPair) continue;
      const outline = new THREE.Shape(spec.outline.map(([x, z]) => new THREE.Vector2(x / 1000, -z / 1000)));
      const geometryPart = new THREE.ExtrudeGeometry(outline, {depth: spec.heightMm / 1000, bevelEnabled: !!spec.bevelMm, bevelSize: (spec.bevelMm ?? 0) / 1000, bevelThickness: (spec.bevelMm ?? 0) / 1000, bevelSegments: 3, curveSegments: 12});
      geometryPart.rotateX(-Math.PI / 2);
      const part = new THREE.Mesh(geometryPart, new THREE.MeshPhysicalMaterial({color: spec.color ?? 0x1c1d20, roughness: spec.roughness ?? .7, metalness: spec.metalness ?? 0, clearcoat: spec.clearcoat ?? 0, clearcoatRoughness: .3}));
      part.name = spec.id;
      part.userData = {u: spec.u ?? .5, liftMm: spec.liftMm ?? 0};
      part.visible = reveal <= .0001;
      pivot.add(part);
      parts.push(part);
    }
    placeParts();
  }
  const canvasTexture = source => {
    if (!source) return null;
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  };
  return {
    setView, zoomBy,
    highlightLayer(key) {highlighted = key || null; canvas.dataset.activeLayer = highlighted || ''; study?.highlight(highlighted); render();},
    setBinding: next => bindingStudy.set(next),
    setConstruction(next, options = {}) {layers = next; veneer = !!options.veneer; rebuildStudy(); render();},
    setOverview(next) {overview = next; setView('construction');},
    setSeparation(value) {
      settleAnimation();
      const from = pose(), to = {...from, reveal: value};
      if (reducedMotion.matches) {applyPose(from, to, 1); render(); return;}
      animation = {from, to, start: performance.now(), duration: 1000, flip: false};
      canvas.dataset.transition = 'turning';
      frame = requestAnimationFrame(tick);
    },
    /** Swap the exterior shape in place (same topology), for animating a profile change. */
    morph(mesh) {
      if (!geometry || !mesh || mesh.positions.length !== shell?.positions.length) return this.setGeometry(mesh);
      const next = bufferGeometry(mesh);
      meshes.forEach(ski => {ski.geometry = next;});
      geometry.dispose();
      geometry = next;
      shell = mesh;
      bindingStudy.geometry(mesh);
      placeParts();
      render();
    },
    setParts(next = []) {partSpecs = next; buildParts(); render();},
    setGeometry(mesh) {
      const first = !geometry;
      meshes.forEach((ski, i) => {pivots[i].remove(ski); ski.material.forEach(m => m.dispose());});
      geometry?.dispose();
      shell = mesh;
      bindingStudy.geometry(mesh);
      geometry = mesh ? bufferGeometry(mesh) : null;
      meshes = geometry ? [0, 1].map(side => new THREE.Mesh(geometry, materials(side, view))) : [];
      meshes.forEach((ski, i) => {ski.position.y = -.009; ski.scale.x = mesh.definition.mirrorPair && i === 1 ? -1 : 1; pivots[i].add(ski);});
      if (mesh) {
        length = mesh.definition.lengthMm / 1000;
        Object.values(finishes).forEach(maps => maps.size(mesh.definition.fullWidthMm ?? Math.max(mesh.definition.tipMm, mesh.definition.tailMm), mesh.definition.lengthMm));
      }
      placeParts();
      if (first || INSPECTION.includes(view)) setView(view, {animate: false});
      render();
    },
    setSidewall(color) {sidewall = color; meshes.forEach(ski => {ski.material[2].color.set(color); if (!textures.sidewall) ski.material[4].color.set(color);}); rebuildStudy(); render();},
    setFinish(kind) {finish = kind; canvas.dataset.finish = kind; refreshMaterials();},
    /** The largest texture this device accepts, for packs that paint high-resolution detail. */
    get maxTextureSize() {return renderer.capabilities.maxTextureSize;},
    /** High-resolution topsheet detail, [left ski, right ski]: {canvas, bounds: [u, v, w, h]} or null. */
    setDetails(list = []) {
      const previous = details;
      details = list.map(detail => (detail ? {texture: canvasTexture(detail.canvas), bounds: detail.bounds} : null));
      details.forEach(detail => {if (detail) detail.texture.anisotropy = anisotropy;});
      canvas.dataset.printDetail = details.some(Boolean) ? 'detail' : 'source';
      refreshMaterials();
      previous.forEach(detail => detail?.texture.dispose());
    },
    /** Top and base artwork as canvases (or images), [left ski, right ski] each. */
    setSurfaces({top = [], base = [], sidewall: print = null}) {
      const previous = [...textures.top, ...textures.base, textures.sidewall];
      textures = {top: top.map(canvasTexture), base: base.map(canvasTexture), sidewall: canvasTexture(print)};
      if (textures.sidewall) textures.sidewall.anisotropy = anisotropy;
      refreshMaterials();
      previous.forEach(texture => texture?.dispose());
    },
    dispose() {
      alive = false; stopAnimation(); observer.disconnect();
      controls.removeEventListener('change', onControls); controls.removeEventListener('start', startControls); controls.dispose();
      canvas.removeEventListener('keydown', keyboard); canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
      environment.dispose();
      geometry?.dispose(); meshes.forEach(ski => ski.material.forEach(material => material.dispose()));
      study?.dispose();
      bindingStudy.dispose();
      [...textures.top, ...textures.base, textures.sidewall].forEach(texture => texture?.dispose());
      details.forEach(detail => detail?.texture.dispose());
      parts.forEach(part => {part.geometry.dispose(); part.material.dispose();});
      ground.geometry.dispose(); ground.material.dispose();
      Object.values(finishes).forEach(maps => maps.dispose());
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
