import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {locate,sample,nestedTransforms,modulo,verticalFov} from './scene-math.mjs';
import {wheelDistance,touchDistance,keyDistance} from './forward-input.mjs';

const $=id=>document.getElementById(id);
const loading=$('loading'),canvas=$('world');
const mobileQuery=matchMedia('(max-width: 700px)');
const pixelsPerUnit=850;
let renderer,data,models=[],cursor=0,ready=false,animationRequest=0;
let state,pointerId=null,previousY=0,press=null,dragged=false;
const activePointers=new Set();
const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe7dc');
scene.fog=new THREE.Fog(scene.background,10,20);
const camera=new THREE.PerspectiveCamera();camera.up.set(0,0,1);
const sun=new THREE.DirectionalLight(0xffefda,3.0);
const fill=new THREE.DirectionalLight(0xd1e8ff,1.7);
const ambient=new THREE.HemisphereLight(0xe6f1df,0x637463,2.0);ambient.position.set(0,0,1);
scene.add(sun,fill,ambient);
const sunPosition=new THREE.Vector3(-3,-6,7),fillPosition=new THREE.Vector3(5,-2,4);
const raycaster=new THREE.Raycaster(),lightRotation=new THREE.Matrix3();

function requestDraw(){if(ready&&!animationRequest)animationRequest=requestAnimationFrame(draw);}
function advance(distance){
  if(!ready||!Number.isFinite(distance)||distance===0)return;
  // No time-based easing: the camera stops when the input stops.
  cursor=modulo(cursor+distance/pixelsPerUnit,data.total);
  requestDraw();
}
function optimizedWorld(gltf){
  // Merge static geometry by material to avoid hundreds of draw calls on phones.
  // Interactive text and responsive titles retain their own meshes.
  const flat=new THREE.Group(),buckets=new Map();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(obj=>{
    if(!obj.isMesh)return;
    const geo=obj.geometry.clone().applyMatrix4(obj.matrixWorld);
    if(obj.userData.contact_link||obj.userData.mobile_scale){
      const mesh=new THREE.Mesh(geo,obj.material);mesh.userData={...obj.userData};flat.add(mesh);return;
    }
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    const groups=Array.isArray(obj.material)?geo.groups:[{start:0,count:geo.index?geo.index.count:geo.attributes.position.count,materialIndex:0}];
    for(const group of groups){
      const part=geo.clone();part.clearGroups();
      if(geo.index)part.setIndex(Array.from(geo.index.array.slice(group.start,group.start+group.count)));
      else if(groups.length>1){
        for(const [name,attribute] of Object.entries(geo.attributes)){
          part.setAttribute(name,new THREE.BufferAttribute(attribute.array.slice(group.start*attribute.itemSize,(group.start+group.count)*attribute.itemSize),attribute.itemSize,attribute.normalized));
        }
      }
      const material=materials[group.materialIndex];
      const key=material.uuid+':'+Object.keys(part.attributes).sort().join(',');
      if(!buckets.has(key))buckets.set(key,{material,geometries:[]});
      buckets.get(key).geometries.push(part);
    }
    geo.dispose();
  });
  for(const {material,geometries} of buckets.values()){
    const merged=mergeGeometries(geometries,false);
    if(merged){flat.add(new THREE.Mesh(merged,material));geometries.forEach(g=>g.dispose());}
    else geometries.forEach(g=>flat.add(new THREE.Mesh(g,material)));
  }
  flat.rotation.x=Math.PI/2; // glTF Y-up → authored Blender Z-up.
  const root=new THREE.Group();root.matrixAutoUpdate=false;root.add(flat);
  return root;
}

function resize(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobileQuery.matches?1.5:1.75));
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;
  camera.fov=verticalFov(data.horizontal_fov,camera.aspect);
  camera.near=.00001;camera.far=1500;camera.updateProjectionMatrix();
  requestDraw();
}

function draw(){
  animationRequest=0;
  if(!ready)return;
  state=locate(data,cursor);
  const world=data.worlds[state.index],transforms=nestedTransforms(data.worlds,state.index);
  for(let j=0;j<models.length;j++){
    const model=models[j];model.visible=transforms.has(j);
    if(model.visible){model.matrix.copy(transforms.get(j));model.matrixWorldNeedsUpdate=true;}
  }
  const position=sample(world,state.transition,mobileQuery.matches);
  camera.position.copy(position.position);camera.up.copy(position.up);camera.lookAt(position.target);
  lightRotation.set(...world.light_rotation.flat());
  sun.position.copy(sunPosition).applyMatrix3(lightRotation);
  fill.position.copy(fillPosition).applyMatrix3(lightRotation);
  ambient.position.set(0,0,1).applyMatrix3(lightRotation);
  const blend=THREE.MathUtils.smoothstep(state.transition,.62,1);
  scene.background.set(world.background).lerp(new THREE.Color(data.worlds[(state.index+1)%data.worlds.length].background),blend);
  // Depth scales with the camera's subject, so distant enclosing worlds blend
  // into the sky continuously, including when the coordinate frame rebases.
  const subjectDistance=position.position.distanceTo(position.target);
  camera.near=subjectDistance*.001;camera.far=subjectDistance*120;camera.updateProjectionMatrix();
  scene.fog.color.copy(scene.background);
  scene.fog.near=subjectDistance*1.15;scene.fog.far=subjectDistance*1.90;
  for(const model of models)model.traverse(obj=>{
    if(!obj.userData.mobile_scale)return;
    const scale=mobileQuery.matches?obj.userData.mobile_scale:1;
    const [x,y,z]=obj.userData.mobile_pivot;
    obj.scale.setScalar(scale);
    obj.position.set(x*(1-scale),z*(1-scale),-y*(1-scale));
  });
  $('contact-link').hidden=world.id!=='ready';
  canvas.style.cursor='default';
  renderer.render(scene,camera);
}

function linkAt(event){
  if(!ready||!state||data.worlds[state.index].id!=='ready')return null;
  raycaster.setFromCamera(new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2),camera);
  const candidates=[];
  models[state.index].traverse(obj=>{
    if(obj.isMesh&&obj.visible&&obj.userData.contact_link)candidates.push(obj);
  });
  const hit=raycaster.intersectObjects(candidates,false)[0];
  if(!hit)return null;
  return 'mailto:davidmarpalez@gmail.com';
}

function bindInput(){
  window.addEventListener('wheel',event=>{
    if(event.ctrlKey)return;
    event.preventDefault();advance(wheelDistance(event.deltaY,event.deltaMode,innerHeight));
  },{passive:false});
  canvas.addEventListener('pointerdown',event=>{
    activePointers.add(event.pointerId);
    if(activePointers.size>1){pointerId=null;dragged=true;return;}
    press={x:event.clientX,y:event.clientY};dragged=false;
    if(event.pointerType==='touch'||event.pointerType==='pen'){
      pointerId=event.pointerId;previousY=event.clientY;canvas.setPointerCapture(event.pointerId);
    }
  });
  canvas.addEventListener('pointermove',event=>{
    if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8)dragged=true;
    if(event.pointerId===pointerId&&activePointers.size===1){
      advance(touchDistance(previousY,event.clientY));previousY=event.clientY;
    }else if(event.pointerType==='mouse')canvas.style.cursor=linkAt(event)?'pointer':'default';
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
    activePointers.delete(event.pointerId);
    if(event.pointerId===pointerId)pointerId=null;
    if(type==='pointercancel')dragged=true;
  });
  canvas.addEventListener('click',event=>{
    if(dragged)return;
    const url=linkAt(event);if(url)location.assign(url);
  });
  window.addEventListener('blur',()=>{activePointers.clear();pointerId=null;press=null;});
  window.addEventListener('keydown',event=>{
    if(event.target.closest('a,input,textarea,button,select,[contenteditable="true"]'))return;
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)){
      event.preventDefault();advance(keyDistance(event.key,event.shiftKey,innerHeight));
    }
  });
}

async function start(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.1;
    const response=await fetch('/assets/3d/worlds.json');
    if(!response.ok)throw new Error(`World manifest: ${response.status}`);
    data=await response.json();
    const loader=new GLTFLoader();
    models=await Promise.all(data.worlds.map(async w=>{
      const gltf=await loader.loadAsync(`/assets/3d/${w.file}`);
      const model=optimizedWorld(gltf);scene.add(model);return model;
    }));
    resize();window.addEventListener('resize',resize,{passive:true});mobileQuery.addEventListener('change',resize);
    bindInput();ready=true;requestDraw();loading.hidden=true;
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();ready=false;loading.hidden=false;
      $('load-message').textContent='The 3D view was interrupted. Reload to continue.';
    });
  }catch(error){
    console.error(error);$('load-message').textContent='The 3D view could not be loaded.';
  }
}
start();
