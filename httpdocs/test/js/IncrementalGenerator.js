import World from './World.js';

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
          this.#densityTiles.push([(parseInt(row[0]) - this.#left) / World.instance.pixelToMeterRatio,
            ((parseInt(row[1]) - this.#bottom + (this.#top - this.#bottom)) % (this.#top - this.#bottom)) /
             World.instance.pixelToMeterRatio, parseInt(row[2])]);
        }
        this.#densityTiles.pop(); // Remove last empty line
      });
  }

  #getRandomNonZeroInt(max) {
    return Math.floor(Math.random() * (max - 1)) + 1;
  }
}
