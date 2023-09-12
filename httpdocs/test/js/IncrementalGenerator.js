import World from './World.js';
import Citizen from './Citizen.js';
import {computeDistance} from './utility.js';

export default class IncrementalGenerator {
  #csvUrl;
  #bottom;
  #densityTiles;
  #left;
  #right;
  #top;
  #densityGraphicalList;
  constructor() {
    this.#csvUrl = './utils/density.csv';
    this.#top = 1000000;
    this.#left = 2850000;
    this.#right = 2480000;
    this.#bottom = 1300000;
    this.#densityTiles = [];
    this.#load();
  }

  get densityTiles() {
    return this.#densityTiles;
  }

  #load() {
    fetch(this.#csvUrl)
      .then(response => response.text())
      .then(csv => {
        csv = csv.split('\n');
        for (let row of csv) {
          row = row.split(',');
          if (row[0] === 'E_KOORD') // skip first row
            continue;
          const latitude = parseInt(row[0]);
          const longitude = parseInt(row[1]);
          if (latitude > this.#right)
            this.#right = latitude;
          if (latitude < this.#left)
            this.#left = latitude;
          if (longitude > this.#top)
            this.#top = longitude;
          if (longitude < this.#bottom)
            this.#bottom = longitude;
        }

        for (let row of csv) {
          row = row.split(',');
          if (row[0] === 'E_KOORD') // skip first row
            continue;

          if (parseInt(row[2]) === 3)
            row[2] = this.#getRandomNonZeroInt(3);

          const height = this.#top - this.#bottom;
          const xTile = (parseInt(row[0]) - this.#left) / World.instance.pixelToMeterRatio;
          const yTile = (height - (parseInt(row[1]) - this.#bottom)) / World.instance.pixelToMeterRatio;
          const density = parseInt(row[2]);
          this.#densityTiles.push([xTile, yTile, density]);
          console.log("Tile")
          let generatedCitizen = 0;
          while (generatedCitizen < density) { // Can never end if the density is too big (~> 2500)
            const x = xTile + this.#getRandomNonZeroInt(100 / World.instance.pixelToMeterRatio);
            const y = yTile + this.#getRandomNonZeroInt(100 / World.instance.pixelToMeterRatio);

            let tooClose = false;
            for (const neighbour of World.instance.citizens.values()) {
              const coords = neighbour.coords;
              const distance = computeDistance(x, y, coords[0], coords[1]);
              if (distance < World.instance.privateSpace) {
                tooClose = true;
                break;
              }
            }
            if (tooClose)
              continue;

            const id = World.instance.idGenerator++;
            const citizen = new Citizen(id, undefined, [x, y]);
            World.instance.citizens.set(id, citizen);
            generatedCitizen++;
          }
        }
        this.#densityTiles.pop(); // Remove last empty line
      });
  }

  #getRandomNonZeroInt(max) {
    return Math.floor(Math.random() * (max - 1)) + 1;
  }
}
