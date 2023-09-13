import World from './World.js';
import Citizen from './Citizen.js';
import {computeDistance, randomNormal} from './utility.js';

// A Tile represent an hectare
export default class Tile {
  #density;
  #citizens;
  #xPixel;
  #yPixel;
  #xKm;
  #yKm;
  #firstNumber;
  constructor(x, y, density, firstNumber) {
    this.#xPixel = x / World.instance.pixelToMeterRatio;
    this.#yPixel = y / World.instance.pixelToMeterRatio;
    this.#xKm = x / 1000;
    this.#yKm = y / 1000;
    this.#density = density;
    this.#citizens = [];
    this.#firstNumber = firstNumber;
  }

  get xKm() {
    return this.#xKm;
  }

  get yKm() {
    return this.#yKm;
  }

  get xPixel() {
    return this.#xPixel;
  }

  get yPixel() {
    return this.#yPixel;
  }

  get density() {
    return this.#density;
  }

  get citizens() {
    return this.#citizens;
  }

  hasNumber(number) {
    return number >= this.#firstNumber && number < this.#firstNumber + this.#density;
  }

  insert(x, y, number) {
    for (const neighbour of this.#citizens) {
      const coords = neighbour.coords;
      const distance = computeDistance(x, y, coords[0], coords[1]);
      if (distance < World.instance.privateSpace)
        return false;
    }

    const id = World.instance.idGenerator++;
    const citizen = new Citizen(id, undefined, [x, y], World.instance.date);
    citizen.linksToGet = [randomNormal(0, 8), randomNormal(0, 4), randomNormal(0, 2)];
    citizen.number = number;
    this.#citizens.push(citizen);
    World.instance.citizens.set(id, citizen);
    return citizen;
  }
}
