import World from './World.js';
import Tile from './Tile.js';

export default class IncrementalGenerator {
  #csvUrl;
  #bottom;
  #densityTiles;
  #left;
  #right;
  #top;
  #totalPopulation;
  #daysElapsed;
  #citizensAllSpawned;
  #availableCitizenNumbers;
  #uncompleteCitizens;
  #threshold;
  constructor() {
    this.#csvUrl = './utils/density.csv';
    this.#top = 1000000;
    this.#left = 2850000;
    this.#right = 2480000;
    this.#bottom = 1300000;
    this.#threshold = 0.88;

    this.#totalPopulation = 0;
    this.#daysElapsed = 0;
    this.#densityTiles = [];
    this.#citizensAllSpawned = false;
    this.#availableCitizenNumbers = [];
    this.#uncompleteCitizens = new Set();

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
          if (row === '')
            continue; // empty line
          row = row.split(',');
          if (row[0] === 'E_KOORD') // skip first row
            continue;

          if (parseInt(row[2]) === 3)
            row[2] = this.#getRandomNonZeroInt(3);

          const height = this.#top - this.#bottom;
          const x = parseInt(row[0]) - this.#left;
          const y = height - (parseInt(row[1]) - this.#bottom);
          const density = parseInt(row[2]);
          this.#densityTiles.push(new Tile(x, y, density, this.#totalPopulation));
          this.#totalPopulation += density;
        }

        for (let i = 0; i < this.#totalPopulation; i++)
          this.#availableCitizenNumbers.push(i);

        this.#simulateOneDay();
      });
  }

  #simulateOneDay() {
    // Citizens discovers the app by themself
    let numberOfNewCitizens = this.#getRandomInt(Math.floor(Math.pow(World.instance.citizens.size, 2) * (1 / 10000) + 1));
    // Only 80% of the population will eventually adopt the application
    if (World.instance.citizens.size + numberOfNewCitizens > Math.floor(this.#totalPopulation * 0.8)) {
      numberOfNewCitizens = Math.floor(this.#totalPopulation * 0.8) - World.instance.citizens.size;
      this.#citizensAllSpawned = true;
    }

    for (let i = 0; i < numberOfNewCitizens; i++) {
      const citizenNumber = this.#getValidCitizenNumber();
      this.#spawnCitizen(citizenNumber);
    }

    // Citizens create links with other
    for (const citizen of this.#uncompleteCitizens) {
      if ((citizen.linksToGet[0] + citizen.linksToGet[1] + citizen.linksToGet[2]) !== 0)
        this.#uncompleteCitizens.delete(citizen);
      else {
        let totalCreated = 0;
        const days = (World.instance.date - citizen.downloadDate) / 86400000;
        let tile;
        for (let i = 0; i < citizen.linksToGet[0]; i++) {
          if (this.#shouldCreateANewLink(days)) {
            totalCreated++;
            if (typeof tile === 'undefined')
              tile = this.#getTile(citizen.number);

            let targetNumber = this.#getRandomInt(tile.density);
            let target;
            for (const tileCitizen of tile) {
              if (tileCitizen.number === targetNumber) {
                target = tileCitizen;
                break;
              }
            }
            if (typeof target === 'undefined')
              target = this.#createTarget(number);
          }
        }
        citizen.linksToGet[0] -= totalCreated;
      }
    }

    World.instance.date += 86400000; // add one day
    this.#daysElapsed++;
    World.instance.draw();
    if (this.#daysElapsed < 731)
      window.requestAnimationFrame(() => this.#simulateOneDay());
  }

  #getRandomNonZeroInt(max) {
    return Math.floor(Math.random() * (max - 1)) + 2;
  }

  #getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1)); // +1 to include the max
  }

  #getValidCitizenNumber() {
    let index = this.#getRandomInt(this.#availableCitizenNumbers.length - 1);
    // console.log(index)
    return this.#availableCitizenNumbers.splice(index, 1)[0];
  }

  #spawnCitizen(number) {
    const hectare = this.#getTile(number);

    let citizen = false;
    while (!citizen) { // Can never end if the density is too big (~> 2500)
      const privatePixels = (World.instance.privateSpace / 2 * 1000) / World.instance.pixelToMeterRatio;
      const x = hectare.xPixel + privatePixels +
        this.#getRandomNonZeroInt((100 / World.instance.pixelToMeterRatio) - privatePixels);
      const y = hectare.yPixel + privatePixels +
        this.#getRandomNonZeroInt((100 / World.instance.pixelToMeterRatio) - privatePixels);

      citizen = hectare.insert(x, y, number);
      if (citizen) {
        this.#uncompleteCitizens.add(citizen);
        return citizen;
      }
    }
  }

  #shouldCreateANewLink(days) {
    const p = Math.random() * (1 - (0.1 / (1 + Math.exp((25 - days) / 4))));
    return p > this.#threshold;
  }

  #getTile(number) {
    for (const tile of this.#densityTiles) {
      if (tile.hasNumber(number))
        return tile;
    }
  }

  #removeNumberFromList(number) {
    for (let i = 0; i < this.#availableCitizenNumbers.length; i++) {
      if (this.#availableCitizenNumbers[i] === i)
        this.#availableCitizenNumbers.splice(i, 1);
    }
  }

  #createTarget(number) {
    this.#removeNumberFromList();
    return this.#spawnCitizen(number);
  }
}
