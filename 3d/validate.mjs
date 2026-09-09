import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Vector3,PerspectiveCamera} from 'three';
import {portalMatrix,sample,nestedTransforms,locate} from './scene-math.mjs';
const assetRoot=new URL('../assets/3d/',import.meta.url);
const data=JSON.parse(await readFile(new URL('worlds.json',assetRoot),'utf8'));
assert.equal(data.worlds.length,8);assert.equal(data.projects.length,4);
let bytes=0;let maxEndpointError=0;
for(let i=0;i<8;i++){
  const w=data.worlds[i],next=data.worlds[(i+1)%8];
  const buffer=await readFile(new URL(w.file,assetRoot));bytes+=buffer.length;
  assert.equal(buffer.readUInt32LE(0),0x46546c67,`${w.id}: valid GLB`);
  assert.equal(buffer.readUInt32LE(4),2);assert.equal(buffer.readUInt32LE(8),buffer.length);
  const gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString('utf8').trim());
  assert.ok(gltf.meshes.length>10,`${w.id}: geometry present`);
  if(i===6){
    const indices=new Set(gltf.nodes.filter(n=>Number.isInteger(n.extras?.project_index)).map(n=>n.extras.project_index));
    assert.deepEqual([...indices].sort(),[0,1,2,3]);assert.ok(gltf.images.length>=4,'four embedded project covers');
  }
  for(const mobile of [false,true]){
    const end=sample(w,1,mobile);const transform=portalMatrix(w);
    const nextStart=new Vector3(...next[mobile?'mobile_camera':'camera']).applyMatrix4(transform);
    const error=end.position.distanceTo(nextStart);maxEndpointError=Math.max(maxEndpointError,error);
    assert.ok(error<1e-5,`${w.id}: continuous camera into ${next.id}`);
    const old=nestedTransforms(data.worlds,i),rebased=nestedTransforms(data.worlds,(i+1)%8);
    // A visible point in either the containing world or its child projects to the
    // same camera-space position on both sides of the rebase, including 8→1.
    for(const objectIndex of [i,(i+1)%8]){
      const v=new Vector3(.21,-.35,1.9);
      const before=v.clone().applyMatrix4(old.get(objectIndex));
      const after=v.clone().applyMatrix4(rebased.get(objectIndex)).applyMatrix4(transform);
      assert.ok(before.distanceTo(after)<1e-10,`${w.id}: geometry continuity`);
    }
    for(const viewport of [[1440,900],[390,844],[360,640]]){
      const camera=new PerspectiveCamera(2*Math.atan(Math.tan(data.horizontal_fov/2)/(viewport[0]/viewport[1]))*180/Math.PI,viewport[0]/viewport[1],.00001,1500);
      camera.up.set(0,0,1);camera.position.fromArray(w[mobile?'mobile_camera':'camera']);camera.lookAt(new Vector3(...w.target));camera.updateMatrixWorld();
      const projected=new Vector3(...w.target).project(camera);
      assert.ok(Math.abs(projected.x)<1e-8&&Math.abs(projected.y)<1e-8,`${w.id}: centred at ${viewport}`);
    }
  }
}
for(let j=0;j<4;j++){
  const w=data.worlds[6];assert.equal(locate(data,w.start+(j+.5)*(w.hold/4)).project,j);
  await stat(fileURLToPath(new URL('..'+data.projects[j].image,import.meta.url)));
}
assert.equal(locate(data,data.total+1e-5).index,0);
assert.equal(locate(data,-1e-5).index,7);
assert.ok(Math.abs(data.worlds.reduce((sum,w)=>sum+w.portal.rotation,0))<1e-10,'loop restores lighting orientation');
console.log(JSON.stringify({worlds:8,projectCovers:4,glbMegabytes:Number((bytes/1048576).toFixed(2)),maxEndpointError,coordinateRebases:'8/8 continuous',viewports:['1440×900','390×844','360×640'],loop:'forward and reverse'},null,2));
