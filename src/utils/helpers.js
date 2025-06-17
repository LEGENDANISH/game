export function createStickman(scene, x, y, color = 0x2563eb) {
  // Create a container instead of a group for visual transformations
  const container = scene.add.container(x, y);
  
  // Create parts with relative positions (relative to container's origin)
  const head = scene.add.circle(0, -25, 8, color);
  head.setStrokeStyle(2, 0x000000);
  
  const body = scene.add.rectangle(0, -5, 3, 20, color);
  
  const leftArm = scene.add.rectangle(-8, -10, 12, 2, color);
  leftArm.setRotation(-0.3);
  const rightArm = scene.add.rectangle(8, -10, 12, 2, color);
  rightArm.setRotation(0.3);
  
  const leftLeg = scene.add.rectangle(-6, 10, 2, 15, color);
  leftLeg.setRotation(-0.2);
  const rightLeg = scene.add.rectangle(6, 10, 2, 15, color);
  rightLeg.setRotation(0.2);
  
  // Add all parts to the container
  container.add([head, body, leftArm, rightArm, leftLeg, rightLeg]);
  
  return {
    group: container, // Now this is a container that supports setScale, setTint, etc.
    head,
    body,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg
  };
}

export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getHealthColor(health, maxHealth) {
  const ratio = health / maxHealth;
  if (ratio > 0.6) return 0x22c55e;
  if (ratio > 0.3) return 0xeab308;
  return 0xef4444;
}