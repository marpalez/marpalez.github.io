// Only forward gestures advance the continuous camera path.
// A chapter takes about one screen of finger travel on a phone (2–3 short
// swipes), independently of screen height. Desktop wheel travel is shorter too.
export function scrollPixelsPerUnit(mobile,viewportHeight=800){
  const height=Number.isFinite(viewportHeight)?viewportHeight:800;
  return mobile?Math.max(560,Math.min(1100,height))*.28:520;
}
export function wheelDistance(deltaY,deltaMode=0,viewportHeight=800){
  if(!Number.isFinite(deltaY)||deltaY<=0)return 0;
  return deltaY*(deltaMode===1?16:deltaMode===2?viewportHeight:1);
}
export function touchDistance(previousY,currentY){
  return Number.isFinite(previousY)&&Number.isFinite(currentY)?Math.max(0,currentY-previousY):0;
}
export function keyDistance(key,shiftKey=false,viewportHeight=800){
  if(key==='ArrowDown')return 55;
  if(key==='PageDown'||(key===' '&&!shiftKey))return viewportHeight*.65;
  return 0;
}
