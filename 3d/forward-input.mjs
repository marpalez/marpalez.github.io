// Signed distances let the same camera path be followed in either direction.
export function wheelDistance(deltaY,deltaMode=0,viewportHeight=800){
  if(!Number.isFinite(deltaY))return 0;
  return deltaY*(deltaMode===1?16:deltaMode===2?viewportHeight:1);
}
export function touchDistance(previousY,currentY){
  return Number.isFinite(previousY)&&Number.isFinite(currentY)?currentY-previousY:0;
}
export function keyDistance(key,shiftKey=false,viewportHeight=800){
  if(key==='ArrowDown')return 55;
  if(key==='ArrowUp')return -55;
  if(key==='PageUp'||(key===' '&&shiftKey))return -viewportHeight*.65;
  if(key==='PageDown'||(key===' '&&!shiftKey))return viewportHeight*.65;
  return 0;
}
