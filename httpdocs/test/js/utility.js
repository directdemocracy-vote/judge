import World from './World.js';

function computeDistance(x1, y1, x2, y2) {
  const norm = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  let distance = norm * World.instance.pixelToMeterRatio / 1000;
  return parseFloat(distance.toFixed(3));
}

// https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
function randomNormal(min, max, skew) {
  let u = 0;
  let v = 0;
  while (u === 0)
    u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0)
    v = Math.random();

  let number = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  number = number / 10.0 + 0.5; // Translate to 0 -> 1
  if (number > 1 || number < 0)
    number = randomNormal(min, max, skew); // resample between 0 and 1 if out of range
  else {
    number = Math.pow(number, skew); // Skew
    number *= max - min; // Stretch to fill range
    number += min; // offset to min
  }
  return number;
}

export {computeDistance, randomNormal};
