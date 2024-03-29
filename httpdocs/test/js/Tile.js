import World from './World.js';
import Citizen from './Citizen.js';
import {computeDistance, randomNormal} from './utility.js';

// A Tile represent an hectare
export default class Tile {
  #threeKmList;
  #tenKmList;
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
    this.#threeKmList = [];
    this.#tenKmList = [];
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

  get firstNumber() {
    return this.#firstNumber;
  }

  get threeKmList() {
    return this.#threeKmList;
  }

  get tenKmList() {
    return this.#tenKmList;
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
    citizen.linksToGet = [Math.round(parseFloat(randomNormal(0, 8, 1))), Math.round(parseFloat(randomNormal(0, 4, 1))),
      Math.round(parseFloat(randomNormal(0, 2, 1)))];
    citizen.number = number;
    this.#citizens.push(citizen);
    World.instance.citizens.set(id, citizen);
    return citizen;
  }

  createKmTileList(tilesList) {
    const topLimit = this.yKm - 3;
    const bottomLimit = this.yKm + 3;
    const leftLimit = this.xKm - 3;
    const rightLimit = this.xKm + 3;

    const topTenLimit = this.yKm - 10;
    const bottomTenLimit = this.yKm + 10;
    const leftTenLimit = this.xKm - 10;
    const rightTenLimit = this.xKm + 10;

    for (let i = 0; i < tilesList.length; i++) {
      if (tilesList[i].xKm > leftLimit && tilesList[i].xKm < rightLimit && tilesList[i].yKm < bottomLimit &&
          tilesList[i].yKm > topLimit && tilesList[i].firstNumber !== this.#firstNumber)
        this.#threeKmList.push(i);

      if (tilesList[i].xKm > leftTenLimit && tilesList[i].xKm < rightTenLimit && tilesList[i].yKm < bottomTenLimit &&
          tilesList[i].yKm > topTenLimit && tilesList[i].firstNumber !== this.#firstNumber && (tilesList[i].xKm <= leftLimit ||
          tilesList[i].xKm >= rightLimit || tilesList[i].yKm >= bottomLimit || tilesList[i].yKm <= topLimit))
        this.#tenKmList.push(i);
    }
  }
}
