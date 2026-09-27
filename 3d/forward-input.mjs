export function scrollPixelsPerUnit(mobile, viewportHeight = 800) {
  const height = Number.isFinite(viewportHeight) ? viewportHeight : 800;
  return mobile ? Math.max(560, Math.min(1100, height)) * 0.28 : 520;
}
export function wheelDistance(deltaY, deltaMode = 0, viewportHeight = 800) {
  if (!Number.isFinite(deltaY) || deltaY <= 0) return 0;
  return deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? viewportHeight : 1);
}
export function touchDistance(previousY, currentY) {
  return Number.isFinite(previousY) && Number.isFinite(currentY)
    ? Math.max(0, currentY - previousY)
    : 0;
}
export function keyDistance(key, shiftKey = false, viewportHeight = 800) {
  if (key === "ArrowDown") return 55;
  if (key === "PageDown" || (key === " " && !shiftKey))
    return viewportHeight * 0.65;
  return 0;
}

export const SCROLL_STIFFNESS = 8;
export const SCROLL_SETTLED = 0.0005;
export function springTowards(
  position,
  velocity,
  target,
  elapsed,
  stiffness = SCROLL_STIFFNESS,
) {
  if (!Number.isFinite(position) || !Number.isFinite(target))
    return { position: target, velocity: 0 };
  if (!Number.isFinite(elapsed) || elapsed <= 0 || !(stiffness > 0))
    return { position, velocity };
  const h = Math.min(elapsed, 100) / 1000,
    w = stiffness;
  const speed =
    (velocity + h * w * w * (target - position)) /
    (1 + 2 * h * w + h * h * w * w);
  const next = position + h * speed;

  return next >= target
    ? { position: target, velocity: 0 }
    : { position: next, velocity: speed };
}
