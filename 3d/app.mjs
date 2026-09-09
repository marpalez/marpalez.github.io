import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {locate,sample,nestedTransforms,modulo} from './scene-math.mjs';

const $=id=>document.getElementById(id);
const loading=$('loading'),canvas=$('world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery=matchMedia('(max-width: 700px)');
let renderer,data,models=[],cursor=0,target=0,logicalOffset=0,cyclePixels=0;
let width=0,height=0,lastTime=0,previousIndex=-1,previousProject=-1,ready=false;
let animationRequest=0;
function requestDraw(){if(ready&&!animationRequest)animationRequest=requestAnimationFrame(draw);}
const pixelsPerUnit=850;
const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe7dc');
const camera=new THREE.PerspectiveCamera();camera.up.set(0,0,1);
const sun=new THREE.DirectionalLight(0xffefda,3.0);
const fill=new THREE.DirectionalLight(0xd1e8ff,1.7);
const ambient=new THREE.HemisphereLight(0xe6f1df,0x637463,2.0);ambient.position.set(0,0,1);
scene.add(sun,fill,ambient);
const sunPosition=new THREE.Vector3(-3,-6,7),fillPosition=new THREE.Vector3(5,-2,4);
const directionAxis=new THREE.Vector3(0,0,1);

function optimizedWorld(gltf){
  // Merge static geometry by material to avoid hundreds of draw calls on phones.
  // Project covers remain separate so scroll can select them independently.
  const flat=new THREE.Group(),buckets=new Map();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(obj=>{
    if(!obj.isMesh)return;
    const geo=obj.geometry.clone().applyMatrix4(obj.matrixWorld);
    if(Number.isInteger(obj.userData.project_index)){
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
  width=innerWidth;height=innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobileQuery.matches?1.5:1.75));
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  // Preserve horizontal framing, instead of cropping a desktop image on mobile.
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(data.horizontal_fov/2)/camera.aspect));
  camera.near=.00001;camera.far=1500;camera.updateProjectionMatrix();
  camera.setViewOffset(width,height,0,mobileQuery.matches?height*.105:0,width,height);
  $('scroll-space').style.height=`${cyclePixels*3+height}px`;
  requestDraw();
}

function onScroll(){
  if(!ready)return;
  let y=scrollY;
  // Native scrolling is preserved for touch, keyboard and trackpads. Recentring
  // changes only the scroll window, not the continuous logical camera position.
  if(y>cyclePixels*2.5){logicalOffset+=data.total;y-=cyclePixels;scrollTo(0,y);}
  else if(y<cyclePixels*.5){logicalOffset-=data.total;y+=cyclePixels;scrollTo(0,y);}
  target=(y-cyclePixels)/pixelsPerUnit+logicalOffset;
  requestDraw();
}

function seek(phase){
  const currentCycle=Math.floor(cursor/data.total);
  logicalOffset=currentCycle*data.total;
  target=logicalOffset+phase;
  scrollTo(0,cyclePixels+phase*pixelsPerUnit);
  if(reduced.matches)cursor=target;
  requestDraw();
}

function updateReadout(state){
  const {index,project}=state,w=data.worlds[index];
  if(index===previousIndex&&(index!==6||project===previousProject))return;
  document.body.dataset.world=String(index);
  $('chapter-number').textContent=String(index+1).padStart(2,'0');
  $('chapter-type').textContent=index===0?'INTRODUCTION':index<5?'EXPERIENCE':index===5?'ABOUT ME':index===6?'PROJECTS':'NEXT CHAPTER';
  $('chapter-name').textContent=index===7?w.role:w.company;
  $('chapter-role').textContent=index===7?'Let’s build what’s next.':w.role.replaceAll('\n',' ');
  $('chapter-years').textContent=w.years;
  $('project-link').hidden=index!==6;$('contact-link').hidden=index!==7;
  $('scroll-hint').firstChild.textContent=index===6?'SCROLL TO CHANGE PROJECT ':index===7?'SCROLL TO BEGIN AGAIN ':'SCROLL TO EXPLORE ';
  if(index===6){
    const p=data.projects[project];
    $('chapter-name').textContent=p.name;
    $('chapter-role').textContent=`Selected work · ${project+1} of 4`;
    $('chapter-years').textContent='';
    $('project-link').href=p.url;
    $('project-link').firstChild.textContent=`Explore ${p.name} `;
  }
  if(index===5){$('chapter-role').textContent='From Valencia, Spain';$('chapter-years').textContent='Español · Valencià · English';}
  for(const [j,button] of Array.from($('chapter-list').children).entries())button.setAttribute('aria-current',String(j===index));
  previousIndex=index;previousProject=project;
}

function draw(now){
  animationRequest=0;
  if(!ready)return;
  const dt=Math.min(.06,(now-lastTime)/1000||1/60);lastTime=now;
  cursor=reduced.matches?target:cursor+(target-cursor)*(1-Math.exp(-dt*9));
  if(Math.abs(cursor-target)<.00002)cursor=target;
  const state=locate(data,cursor),world=data.worlds[state.index];
  const transforms=nestedTransforms(data.worlds,state.index);
  for(let j=0;j<models.length;j++){
    const model=models[j];model.visible=transforms.has(j);
    if(model.visible){model.matrix.copy(transforms.get(j));model.matrixWorldNeedsUpdate=true;}
  }
  const position=sample(world,state.transition,mobileQuery.matches);
  camera.position.copy(position.position);camera.lookAt(position.target);
  // Lights are expressed in the same reference frame as the nested geometry.
  const angle=-data.worlds.slice(0,state.index).reduce((sum,w)=>sum+w.portal.rotation,0);
  sun.position.copy(sunPosition).applyAxisAngle(directionAxis,angle);
  fill.position.copy(fillPosition).applyAxisAngle(directionAxis,angle);
  models[6].traverse(obj=>{
    if(Number.isInteger(obj.userData.project_index))obj.visible=obj.userData.project_index===(state.index===6?state.project:0);
  });
  updateReadout(state);
  const progress=state.phase/data.total*100;
  $('progress').style.setProperty('--progress',`${progress}%`);
  if(document.activeElement!==$('progress'))$('progress').value=String(Math.round(progress*10));
  renderer.render(scene,camera);
  if(Math.abs(cursor-target)>.00002)requestDraw();
}

async function start(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.1;
    const response=await fetch('../assets/3d/worlds.json');
    if(!response.ok)throw new Error(`World manifest: ${response.status}`);
    data=await response.json();cyclePixels=data.total*pixelsPerUnit;
    const loader=new GLTFLoader();let loaded=0;
    models=await Promise.all(data.worlds.map(async w=>{
      const gltf=await loader.loadAsync(`../assets/3d/${w.file}`);
      const model=optimizedWorld(gltf);scene.add(model);
      loaded++;$('load-bar').style.width=`${loaded/8*100}%`;$('load-count').textContent=`${loaded} / 8 worlds`;
      return model;
    }));
    data.worlds.forEach((w,i)=>{
      const button=document.createElement('button');
      const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');
      const label=document.createElement('span');label.textContent=['Introduction','AIDIMME','IMQ TECNOCREA','SGS TECNOS','IMQ IBÉRICA','Valencia & languages','Selected projects','I’m ready, and you?'][i];
      button.append(number,label);button.addEventListener('click',()=>{$('chapters').close();seek(w.start);});$('chapter-list').append(button);
    });
    $('open-chapters').addEventListener('click',()=>$('chapters').showModal());
    $('close-chapters').addEventListener('click',()=>$('chapters').close());
    $('chapters').addEventListener('click',event=>{if(event.target===$('chapters')){const r=$('chapters').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('chapters').close();}});
    $('next').addEventListener('click',()=>{const state=locate(data,cursor);if(state.index===7){logicalOffset=Math.floor(cursor/data.total)*data.total;target=logicalOffset+data.total;scrollTo(0,cyclePixels+data.total*pixelsPerUnit);}else seek(data.worlds[state.index+1].start);});
    $('previous').addEventListener('click',()=>{const state=locate(data,cursor);if(state.index===0){logicalOffset=(Math.floor(cursor/data.total)-1)*data.total;target=logicalOffset+data.worlds[7].start;scrollTo(0,cyclePixels+data.worlds[7].start*pixelsPerUnit);requestDraw();}else seek(data.worlds[state.index-1].start);});
    $('progress').addEventListener('input',event=>seek(Number(event.target.value)/1000*(data.total-.00001)));
    window.addEventListener('keydown',event=>{if(event.target.closest('button,a,input,dialog'))return;if(event.key==='Home'){event.preventDefault();seek(0);}else if(event.key==='End'){event.preventDefault();seek(data.worlds[7].start);}});
    history.scrollRestoration='manual';resize();
    window.addEventListener('resize',resize,{passive:true});
    mobileQuery.addEventListener('change',resize);
    window.addEventListener('scroll',onScroll,{passive:true});
    const initial=data.worlds.find(w=>`#${w.id}`===location.hash)?.start||0;
    scrollTo(0,cyclePixels+initial*pixelsPerUnit);cursor=target=initial;
    ready=true;onScroll();requestDraw();loading.classList.add('loaded');
    setTimeout(()=>loading.hidden=true,400);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;loading.hidden=false;loading.classList.remove('loaded');$('load-message').textContent='The 3D view was interrupted. Reload to continue.';});
  }catch(error){
    console.error(error);$('load-message').textContent='The 3D view could not be loaded.';$('load-count').textContent='You can still explore the full portfolio below.';
  }
}
start();
