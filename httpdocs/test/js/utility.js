import World from './World.js';

function computeDistance(x1, y1, x2, y2) {
  const norm = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  let distance = norm * World.instance.pixelToMeterRatio / 1000;
  return parseFloat(distance.toFixed(3));
}

export {computeDistance};
