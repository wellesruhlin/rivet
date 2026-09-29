import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';


export function meshGeometry(mesh) {
  const pos=[],uv=[],normal=[];
  mesh.faces.forEach((face,fi)=>{for(let k=1;k<face.length-1;k++)for(const corner of [0,k,k+1]){pos.push(...mesh.positions[face[corner]]);uv.push(...mesh.uvs[fi][corner]);if(mesh.normals)normal.push(...mesh.normals[face[corner]]);}});
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  if(normal.length)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));else geometry.computeVertexNormals();
  return geometry;
}
const ease=t=>t*t*(3-2*t);
export function createStudio(canvas,{onError,onReady,onLabels}) {
  let disposed=false,frame=0,sceneData=null,mode='Studio',parts=[],targetSeparation=0,separation=0,transition=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=.94;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  const scene=new THREE.Scene();scene.fog=new THREE.Fog('#30342d',9,22);
  const camera=new THREE.PerspectiveCamera(36,1,.01,50);camera.position.set(2.6,1.8,2.7);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.minDistance=.35;controls.maxDistance=9;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,.35,0);controls.enablePan=true;
  const envScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.02);
  scene.environment=environment.texture;scene.environmentIntensity=.45;envScene.dispose();pmrem.dispose();
  const hemi=new THREE.HemisphereLight('#fff3e0','#34372d',.85);scene.add(hemi);
  const key=new THREE.DirectionalLight('#fff0db',2.05);key.position.set(-1.5,5,1);key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-2.8,right:2.8,top:2.8,bottom:-2.8,near:.1,far:15});key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.003;key.shadow.bias=-.00005;key.shadow.radius=32;key.shadow.blurSamples=24;scene.add(key);
  const rim=new THREE.DirectionalLight('#e5eddf',1.25);rim.position.set(2,2,-3);scene.add(rim);
  const fill=new THREE.DirectionalLight('#fff4e8',.65);fill.position.set(4,1,3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({color:'#11170f',opacity:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=256;const contactContext=contactCanvas.getContext('2d');const gradient=contactContext.createRadialGradient(128,128,8,128,128,128);gradient.addColorStop(0,'rgba(0,0,0,.32)');gradient.addColorStop(.45,'rgba(0,0,0,.20)');gradient.addColorStop(1,'rgba(0,0,0,0)');contactContext.fillStyle=gradient;contactContext.fillRect(0,0,256,256);const contactMap=new THREE.CanvasTexture(contactCanvas);const contact=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.001;scene.add(contact);
  const group=new THREE.Group();scene.add(group);
  const dimensionGroup=new THREE.Group();scene.add(dimensionGroup);
  const texLoader=new THREE.TextureLoader(),maps=new Map();
  for(const id of ['walnut','oak']) {
    const map=texLoader.load(`/materials/${id}.png`,()=>{requestRender();onReady?.();},undefined,()=>onError?.('A wood texture could not load. The model remains available.'));
    map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping;map.anisotropy=renderer.capabilities.getMaxAnisotropy();maps.set(id,map);
  }
  const materials=new Map();
  function makeMaterial(def) {
    const m=new THREE.MeshPhysicalMaterial({color:def.color,roughness:def.roughness??.73,metalness:def.metalness??0,clearcoat:.02,clearcoatRoughness:.8,specularIntensity:.4,envMapIntensity:.3,bumpScale:def.bumpScale??.00024});
    const texture=def.texture?.includes('walnut')?'walnut':def.texture?.includes('oak')?'oak':null;
    if(texture){m.map=maps.get(texture);m.bumpMap=m.map;}
    m.onBeforeCompile=shader=>{
      shader.uniforms.grainContrast={value:def.grainContrast??1};shader.uniforms.neutralGrain={value:def.neutralGrain?1:0};shader.uniforms.grainScale={value:def.grainScale??1};
      shader.fragmentShader='uniform float grainContrast;\nuniform float neutralGrain;\nuniform float grainScale;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
        vec4 sampledDiffuseColor=texture2D(map,vMapUv*grainScale);
        if(neutralGrain>0.5){float grain=clamp(dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722))*2.0,.25,1.6);diffuseColor.rgb*=mix(1.0,grain,grainContrast);}else{diffuseColor*=mix(vec4(1.0),sampledDiffuseColor,grainContrast);}
      #endif`);
    };
    return m;
  }
  function updateMaterials(data){for(const m of materials.values())m.dispose();materials.clear();for(const [key,def] of Object.entries(data.materials))materials.set(key,makeMaterial(def));}
  function clearParts(){for(const mesh of parts){group.remove(mesh);mesh.geometry.dispose();}parts=[];}
  function clearDimensions(){while(dimensionGroup.children.length){const child=dimensionGroup.children[0];dimensionGroup.remove(child);child.geometry?.dispose();child.material?.dispose();}}
  function updateDimensions() {
    clearDimensions();if(!sceneData)return;
    const {length:L,width:W,height:H}=sceneData.dimensions;
    const lineMaterial=new THREE.LineBasicMaterial({color:'#d4dbbd',transparent:true,opacity:.8,depthTest:false});
    const points=[];
    function dim(a,b,tick){points.push(...a,...b);for(const p of [a,b])points.push(p[0]-tick[0],p[1]-tick[1],p[2]-tick[2],p[0]+tick[0],p[1]+tick[1],p[2]+tick[2]);}
    dim([-L/2,.02,W/2+.22],[L/2,.02,W/2+.22],[0,0,.035]);
    if(sceneData.shape!=='round')dim([L/2+.17,.02,-W/2],[L/2+.17,.02,W/2],[.035,0,0]);
    dim([-L/2-.14,0,W/2],[-L/2-.14,H,W/2],[.035,0,0]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));dimensionGroup.add(new THREE.LineSegments(g,lineMaterial));
    dimensionGroup.visible=mode==='Dimensions';
  }
  function fit(nextMode=mode,instant=false) {
    if(!sceneData)return;mode=nextMode;
    const {length:L,width:W,height:H}=sceneData.dimensions;
    let target=new THREE.Vector3(0,H*.5,0),direction=new THREE.Vector3(-1.15,.78,1.55),padding=.89;
    if(sceneData.camera){const yaw=THREE.MathUtils.degToRad(sceneData.camera.yaw),elevation=THREE.MathUtils.degToRad(sceneData.camera.elevation);direction.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));}
    if(mode==='Dimensions'){direction.set(-.9,1.7,1.6);target.y=H*.35;padding=.69;}
    if(mode==='Construction'){target.y=H*.63;direction.set(-1.15,1.1,1.55);padding=.77;}
    if(mode==='Detail'){target.set(-L*.38,H*.86,W*.37);direction.set(-1,.7,1);}
    direction.normalize();const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=0;
    const points=[];
    if(sceneData.shape==='round'&&mode!=='Dimensions'){for(const part of sceneData.parts)for(const point of part.mesh.positions)points.push(point.map((v,i)=>v+(mode==='Construction'?(part.explode?.[i]||0):0)));}
    else{for(const x of [-L/2,L/2])for(const y of [0,H+(mode==='Construction'?.3:0)])for(const z of [-W/2,W/2])points.push([x,y,z]);}
    for(const point of points){const p=new THREE.Vector3(...point).sub(target),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tan*camera.aspect*padding),depth+Math.abs(p.dot(up))/(tan*padding));}
    if(mode==='Studio')distance*=sceneData.camera?.distance??1;
    if(mode==='Detail')distance=.8;
    const position=target.clone().add(direction.multiplyScalar(distance));
    transition={start:performance.now(),from:camera.position.clone(),to:position,oldTarget:controls.target.clone(),target,duration:instant||reduced?0:850};
    targetSeparation=mode==='Construction'?1:0;dimensionGroup.visible=mode==='Dimensions';requestRender();
  }
  function projected(point){const v=new THREE.Vector3(...point).project(camera);return {x:(v.x*.5+.5)*canvas.clientWidth,y:(-.5*v.y+.5)*canvas.clientHeight,visible:v.z<1};}
  function labels(){if(!sceneData||mode!=='Dimensions'){onLabels?.([]);return;}const {length:L,width:W,height:H}=sceneData.dimensions;const c=sceneData.config;const list=[{id:'length',text:(sceneData.shape==='round'?'Ø ':'')+c.length+' in',...projected([0,.02,W/2+.22])},{id:'height',text:c.height+' in',...projected([-L/2-.14,H*.5,W/2])}];if(sceneData.shape!=='round')list.push({id:'width',text:c.width+' in',...projected([L/2+.17,.02,0])});onLabels?.(list);}
  function render(now) {
    frame=0;if(disposed)return;let moving=false;
    if(transition){const t=transition.duration?Math.min(1,(now-transition.start)/transition.duration):1;camera.position.lerpVectors(transition.from,transition.to,ease(t));controls.target.lerpVectors(transition.oldTarget,transition.target,ease(t));if(t===1)transition=null;else moving=true;}
    const d=targetSeparation-separation;if(Math.abs(d)>.0008){separation=reduced?targetSeparation:separation+d*.13;moving=true;}else separation=targetSeparation;
    for(const mesh of parts)mesh.position.fromArray(mesh.userData.explode).multiplyScalar(separation);
    controls.update();renderer.render(scene,camera);labels();if(moving)requestRender();
  }
  function requestRender(){if(!frame&&!disposed)frame=requestAnimationFrame(render);}
  controls.addEventListener('change',requestRender);
  controls.addEventListener('start',()=>{transition=null;});
  const observer=new ResizeObserver(()=>{const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fit(mode,true);});observer.observe(canvas);
  return {
    update(data){const old=sceneData;sceneData=data;
      const changed=!old||old.productId!==data.productId||old.geometryKey!==data.geometryKey||JSON.stringify(old.dimensions)!==JSON.stringify(data.dimensions);
      updateMaterials(data);
      if(changed){clearParts();for(const part of data.parts){const mesh=new THREE.Mesh(meshGeometry(part.mesh),materials.get(part.material));mesh.name=part.id;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.explode=part.explode;mesh.userData.materialKey=part.material;group.add(mesh);parts.push(mesh);}contact.scale.set(data.dimensions.length*1.5,data.dimensions.width*1.9,1);updateDimensions();fit(mode,!old);}
      else{for(const mesh of parts)mesh.material=materials.get(mesh.userData.materialKey);if(JSON.stringify(old.camera)!==JSON.stringify(data.camera))fit(mode);}
      requestRender();
    },
    view(next){fit(next);},
    reset(){fit(mode);},
    rotate(direction=1){if(!sceneData)return;transition=null;const delta=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),direction*Math.PI/8);camera.position.copy(controls.target).add(delta);requestRender();},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();clearParts();clearDimensions();for(const material of materials.values())material.dispose();for(const map of maps.values())map.dispose();floor.geometry.dispose();floor.material.dispose();contact.geometry.dispose();contact.material.dispose();contactMap.dispose();environment.dispose();renderer.dispose();},
  };
}
