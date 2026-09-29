import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CROPS, PAIR_LEFTS, SKI_WIDTH, SKI_TOP, SKI_BOTTOM} from '../art-geometry.js';
import {createFinishMaps} from './finishes.js';
import {baseArtworkSide, smoothTransition} from '../preview-views.js';
import {createConstructionStudy} from './construction-renderer.js';
import {createPrintDetails, factoryName, loadPrintFonts, withPrintDetail} from './print-detail.js';
import {createBindingStudy} from './binding-renderer.js';

const images = new Map();
const MAX_INSPECTION_ZOOM = 32;
function decodedImage(src) {
  if (!images.has(src)) {
    const image = new Image();
    image.src = src;
    const promise = image.decode().then(() => image).catch(error => {images.delete(src); throw error;});
    images.set(src, promise);
    if (images.size > 12) images.delete(images.keys().next().value);
  }
  return images.get(src);
}

function textureFrom(image, kind, side, anisotropy) {
  const canvas = document.createElement('canvas');
  // Keep the native pixels: resampling 92 px to 256 and back was softening art.
  canvas.width = SKI_WIDTH;
  canvas.height = SKI_BOTTOM - SKI_TOP;
  const context = canvas.getContext('2d');
  const crop = CROPS.stage[kind];
  context.fillStyle = '#0d0e10';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.setTransform(canvas.width / SKI_WIDTH, 0, 0, canvas.height / (SKI_BOTTOM - SKI_TOP), 0, 0);
  context.drawImage(image, crop.x - PAIR_LEFTS[kind][side], crop.y - SKI_TOP, crop.w, crop.h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

export function bufferGeometry(mesh) {
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions.flat(), 3));
  const indices = [];
  for (const face of mesh.faces) for (let i = 1; i < face.length - 1; i++) indices.push(face[0], face[i], face[i + 1]);
  indexed.setIndex(indices);
  indexed.computeVertexNormals();
  const normals = indexed.getAttribute('normal');
  // Image traces have pixel-scale slope noise. Smooth only the lighting normals
  // along each longitudinal band; keep every measured/derived vertex unchanged.
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
  for (let material = 0; material < 4; material++) {
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

export function createSkiRenderer(host, onFailure, {onLayer, onPick} = {}) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  // Supersample fine logo strokes even on a 1× desktop display.
  renderer.setPixelRatio(Math.min(2.5, Math.max(2, devicePixelRatio)));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral lights at modest energy preserve the original artwork's color.
  // No filmic shoulder to lift blacks or desaturate the pigment.
  renderer.toneMapping = THREE.NoToneMapping;
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const finishes = {textured: createFinishMaps('textured', anisotropy), wood: createFinishMaps('wood', anisotropy)};
  // Soft studio reflections for the construction materials only (resin, steel, UHMW);
  // the exterior views keep their neutral direct lighting.
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
  pivots.forEach((pivot, side) => {pivot.position.set((.5 - side) * .18, .009, 0); pair.add(pivot);});
  scene.add(pair, new THREE.HemisphereLight(0xffffff, 0xb4bcc5, .55));
  for (const [pos, power] of [[[-1.5, 3, 2], 1.8], [[2, 1.8, -1], 1.35], [[-.4, .8, -3], .65], [[2, -.3, 1], .7], [[0, -3, 1], .65]]) {
    const light = new THREE.DirectionalLight(0xffffff, power);
    light.position.set(...pos);
    scene.add(light);
  }
  let alive = true, generation = 0, geometry, meshes = [], textures = [], view = 'front', length = 1.86, sidewall = '#151515', finish = 'textured';
  let shell = null, study = null, layup = 'Stock', reveal = 0, overview = true, highlighted = null, hovered = null, pressed = null;
  let printDetails = [];
  let animation = null, frame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const render = () => {if (alive) renderer.render(scene, camera);};
  const bindingStudy = createBindingStudy(pivots, canvas, render);
  const materials = (side, artworkView = 'front') => {
    const maps = finishes[finish];
    return [
      withPrintDetail(new THREE.MeshPhysicalMaterial({map: textures[side] ?? null, color: 0xffffff, roughness: 1, roughnessMap: maps.roughness, normalMap: maps.normal, normalScale: new THREE.Vector2(1, 1), metalness: 0, ior: 1.48, specularIntensity: finish === 'wood' ? .35 : .58, clearcoat: finish === 'wood' ? .02 : .015, clearcoatRoughness: .7}), printDetails[side]),
      new THREE.MeshStandardMaterial({map: textures[2 + baseArtworkSide(side, artworkView)] ?? null, color: textures.length ? 0xffffff : 0x151719, roughness: .8, metalness: 0}),
      new THREE.MeshStandardMaterial({color: sidewall, roughness: .52}),
      new THREE.MeshStandardMaterial({color: 0xc4c9cc, metalness: .9, roughness: .3}),
    ];
  };
  const pose = () => ({position: camera.position.clone(), up: camera.up.clone(), target: controls.target.clone(), zoom: camera.zoom, rolls: pivots.map(p => p.rotation.z), xs: pivots.map(p => p.position.x), reveal});
  function targetPose(next) {
    const aspect = Math.max(.2, host.clientWidth / Math.max(1, host.clientHeight));
    const result = {position: new THREE.Vector3(0, 3, 0), up: new THREE.Vector3(0, 0, 1), target: new THREE.Vector3(0, .009, 0), zoom: 1, rolls: [0, 0], xs: [.09, -.09], reveal: 0};
    if (next === 'back') result.rolls = [Math.PI, Math.PI];
    if (next === 'orbit') result.position.set(.85, 2.8, .65);
    if (next === 'bindings') {
      const mount = (shell?.definition.mountMm ?? -45) / 1000;
      result.position.set(.85, .6, mount + .25);
      result.up.set(0, 1, 0);
      result.target.set(0, .038, mount);
      result.zoom = Math.min(6.3, Math.max(3.7, aspect * 3.3));
      result.xs = [0, -.22];
    }
    if (next === 'sidewall') {
      result.position.set(1, .31, .48);
      result.up.set(0, 1, 0);
      result.target.set(0, .012, -.045);
      result.zoom = Math.max(2.5, Math.min(10, 2.2 * aspect / .28));
      result.xs = [0, -.22];
    }
    if (next === 'tech') {
      result.position.set(3, .025, 0);
      result.up.set(0, 1, 0);
      result.target.set(0, .025, 0);
      result.zoom = Math.max(.3, 2.2 * aspect / (length * 1.12));
      result.xs = [0, -.22];
    }
    if (next === 'construction') {
      result.position.set(1, .34, .28);
      result.up.set(0, 1, 0);
      result.target.set(0, .065, overview ? 0 : (shell?.definition.mountMm ?? -45) / 1000);
      // Leave vertical room for the separated layers in short, wide viewports.
      result.zoom = Math.max(.3, Math.min(overview ? 4.5 : 7, 2.2 * aspect / (overview ? length * 1.2 : .86)));
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
    study?.reveal(reveal);
    meshes.forEach(mesh => {mesh.visible = reveal <= .0001;});
    bindingStudy.visibility(view !== 'construction' && view !== 'tech');
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
  function setView(next, {animate = true} = {}) {
    const previous = view;
    const from = pose(), to = targetPose(next);
    stopAnimation();
    // OrbitControls caches its up-axis at construction. Recreate it when moving
    // between the upright pair and the horizontal inspection views.
    if ((['sidewall', 'tech', 'construction', 'bindings'].includes(previous)) !== (['sidewall', 'tech', 'construction', 'bindings'].includes(next))) {
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
    // Back is a presentation-only swap. Orbit and the construction study keep
    // the physical base assignment; topsheet maps and UVs never change.
    meshes.forEach((ski, side) => {
      ski.material[1].map = textures[2 + baseArtworkSide(side, view)] ?? null;
    });
    canvas.dataset.view = next;
    if (next !== 'construction') hover(null);
    canvas.setAttribute('aria-label', next === 'construction' ? 'Exploded construction of your selected ski. Drag or use arrow keys to inspect the layers.' : next === 'orbit' ? 'Full 3D ski view. Drag or use arrow keys to orbit; scroll to zoom.' : next === 'sidewall' ? 'Close-up of the selected sidewall and topsheet finish. Drag to inspect.' : next === 'tech' ? 'Side profile at actual proportions, with technical specifications below.' : `${next === 'back' ? 'Back' : 'Front'} view. Each ski turns on its own vertical axis. Scroll to zoom.`);
    if (next === 'bindings') canvas.setAttribute('aria-label', 'Binding inspection. Drag to orbit the Blender Pivot 15 model on the selected ski; scroll to zoom.');
    controls.enableRotate = ['orbit', 'sidewall', 'construction', 'bindings'].includes(next);
    pivots[1].visible = !['sidewall', 'tech', 'construction', 'bindings'].includes(next);
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
    else if (['tech', 'sidewall', 'construction', 'bindings'].includes(view)) {
      const preservedReveal = reveal;
      setView(view, {animate: false});
      if (view === 'construction') {reveal = preservedReveal; study?.reveal(reveal); meshes.forEach(mesh => {mesh.visible = reveal <= .0001;}); canvas.dataset.separation = String(Math.round(reveal * 100));}
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
  // Layer picking in the exploded view: hover reports the part under the pointer,
  // a click or tap without dragging reports a pick (touch has no hover).
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
    if (shell) {
      study = createConstructionStudy(shell, layup, {wood: finish === 'wood', exterior: materials(0), anisotropy, envMap: environment});
      pivots[0].add(study.group); study.reveal(reveal); study.highlight(highlighted);
      canvas.dataset.layup = layup;
      canvas.dataset.layers = String(study.data.layers.length);
    }
    meshes.forEach(mesh => {mesh.visible = reveal <= .0001;});
  }
  function refreshMaterials() {meshes.forEach((ski, side) => {ski.material.forEach(m => m.dispose()); ski.material = materials(side, view);}); rebuildStudy(); render();}
  return {
    setView, zoomBy,
    highlightLayer(key) {highlighted = key || null; canvas.dataset.activeLayer = highlighted || ''; study?.highlight(highlighted); render();},
    setBinding: next => bindingStudy.set(next),
    setConstruction(next) {layup = next; rebuildStudy(); render();},
    setOverview(next) {overview = next; setView('construction');},
    setSeparation(value) {
      settleAnimation();
      const from = pose(), to = {...from, reveal: value};
      if (reducedMotion.matches) {applyPose(from, to, 1); render(); return;}
      animation = {from, to, start: performance.now(), duration: 1000, flip: false};
      canvas.dataset.transition = 'turning'; frame = requestAnimationFrame(tick);
    },
    setGeometry(mesh) {
      const first = !geometry;
      meshes.forEach((ski, i) => {pivots[i].remove(ski); ski.material.forEach(m => m.dispose());});
      geometry?.dispose();
      shell = mesh;
      bindingStudy.geometry(mesh);
      geometry = mesh ? bufferGeometry(mesh) : null;
      meshes = geometry ? [0, 1].map(side => new THREE.Mesh(geometry, materials(side, view))) : [];
      meshes.forEach((ski, i) => {ski.position.y = -.009; pivots[i].add(ski);});
      if (mesh) {
        length = mesh.definition.lengthMm / 1000;
        Object.values(finishes).forEach(maps => maps.size(Math.max(mesh.definition.tipMm, mesh.definition.tailMm), mesh.definition.lengthMm));
      }
      rebuildStudy();
      if (first || view === 'tech' || view === 'bindings') setView(view, {animate: false});
      render();
    },
    setSidewall(color) {sidewall = color; meshes.forEach(ski => ski.material[2].color.set(color)); rebuildStudy(); render();},
    setFinish(kind) {finish = kind; canvas.dataset.finish = kind; refreshMaterials();},
    async setArtwork(top, base, print = {}) {
      const ticket = ++generation;
      const [topImage, baseImage] = await Promise.all([decodedImage(top), decodedImage(base), factoryName(print.id) ? loadPrintFonts() : null]);
      if (!alive || ticket !== generation) return false;
      const next = [textureFrom(topImage, 'top', 0, anisotropy), textureFrom(topImage, 'top', 1, anisotropy), textureFrom(baseImage, 'base', 0, anisotropy), textureFrom(baseImage, 'base', 1, anisotropy)];
      const nextDetails = createPrintDetails(topImage, print.id, print, anisotropy, renderer.capabilities.maxTextureSize);
      const previous = textures;
      const previousDetails = printDetails;
      textures = next;
      printDetails = nextDetails;
      canvas.dataset.printDetail = printDetails.length ? 'factory-vector' : 'source';
      refreshMaterials();
      previous.forEach(texture => texture.dispose());
      previousDetails.forEach(detail => detail.texture.dispose());
      return true;
    },
    dispose() {
      alive = false; generation++; stopAnimation(); observer.disconnect();
      controls.removeEventListener('change', onControls); controls.removeEventListener('start', startControls); controls.dispose();
      canvas.removeEventListener('keydown', keyboard); canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
      environment.dispose();
      geometry?.dispose(); meshes.forEach(ski => ski.material.forEach(material => material.dispose()));
      study?.dispose();
      bindingStudy.dispose();
      printDetails.forEach(detail => detail.texture.dispose());
      textures.forEach(texture => texture.dispose()); Object.values(finishes).forEach(maps => maps.dispose());
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
