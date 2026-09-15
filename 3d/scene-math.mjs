import {Matrix4,Vector3} from 'three';
export const modulo=(value,total)=>((value%total)+total)%total;
// Widescreen keeps the full height of the authored 16:10 composition.
export const verticalFov=(horizontalFov,aspect)=>2*Math.atan(Math.tan(horizontalFov/2)/Math.min(aspect,1.6))*180/Math.PI;
export function portalMatrix(world){
  const p=world.portal;
  if(p.matrix)return new Matrix4().set(...p.matrix.flat());
  return new Matrix4().makeTranslation(...p.position)
    .multiply(new Matrix4().makeRotationZ(p.rotation))
    .multiply(new Matrix4().makeScale(p.scale,p.scale,p.scale));
}
export function locate(data,time,mobile=false){
  const phase=modulo(time,data.total);
  const timing=w=>mobile&&w.mobile_timing?w.mobile_timing:w;
  let index=data.worlds.findLastIndex(w=>phase>=timing(w).start);
  index=Math.max(0,index);
  const world=timing(data.worlds[index]),local=phase-world.start;
  return {phase,index,local,transition:Math.max(0,Math.min(1,local/world.duration))};
}
export function sample(world,transition,mobile){
  const mode=mobile?'mobile':'desktop',track=world.path[mode];
  const progress=world.path_progress?.[mode];
  let time=transition*(track.length-1);
  if(progress){
    // Travel equal visual distances per scroll increment along the same path.
    let lo=0,hi=progress.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(progress[mid]<=transition)lo=mid;else hi=mid;}
    time=lo+(transition-progress[lo])/(progress[hi]-progress[lo]);
  }
  const j=Math.min(track.length-2,Math.floor(time)),u=time-j;
  return {position:new Vector3(...track[j].position).lerp(new Vector3(...track[j+1].position),u),target:new Vector3(...track[j].target).lerp(new Vector3(...track[j+1].target),u),up:new Vector3(...(track[j].up||[0,0,1])).lerp(new Vector3(...(track[j+1].up||[0,0,1])),u).normalize()};
}
export function nestedTransforms(worlds,index){
  const n=worlds.length,prev=(index+n-1)%n,next=(index+1)%n,after=(index+2)%n;
  const first=portalMatrix(worlds[index]);
  return new Map([[prev,portalMatrix(worlds[prev]).invert()],[index,new Matrix4()],[next,first],[after,first.clone().multiply(portalMatrix(worlds[next]))]]);
}
