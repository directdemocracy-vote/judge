import World from './World.js';
import Tile from './Tile.js';
import Arrow from './Arrow.js';
import ArrowHead from './ArrowHead.js';

export default class IncrementalGenerator {
  #csvUrl;
  #jsonUrl;
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
  #pause;
  #pauseButton;
  #animation;
  #daysToSimulate;
  constructor() {
    this.#csvUrl = './utils/density.csv';
    this.#jsonUrl = './utils/municipality.json';
    this.#top = 1000000;
    this.#left = 2850000;
    this.#right = 2480000;
    this.#bottom = 1300000;
    this.#threshold = 0.97;

    this.#daysToSimulate = 1095;

    this.#totalPopulation = 0;
    this.#daysElapsed = 0;
    this.#densityTiles = [];
    this.#citizensAllSpawned = false;
    this.#availableCitizenNumbers = [];
    this.#uncompleteCitizens = new Set();

    this.#pause = true;

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

        fetch(this.#jsonUrl)
          .then(response => response.json())
          .then(json => {
            for (let row of csv) {
              if (row === '')
                continue; // empty line
              row = row.split(',');
              if (row[0] === 'E_KOORD') // skip first row
                continue;

              if (parseInt(row[2]) === 3)
                row[2] = this.#getRandomNonZeroInt(3);

              const height = this.#top - this.#bottom;
              const rawX = parseInt(row[0]);
              const x = rawX - this.#left;
              const rawY = parseInt(row[1]);
              const y = height - (rawY - this.#bottom);
              const density = parseInt(row[2]);
              const tile = new Tile(x, y, density, this.#totalPopulation);
              let index;
              for (let i = 0; i < json.tile_to_boost.length; i++) {
                const boostedTile = json.tile_to_boost[i];
                if (rawX === boostedTile.x && rawY === boostedTile.y) {
                  tile.boost = true;
                  index = i;
                  break;
                }
              }

              if (typeof index !== 'undefined')
                json.tile_to_boost.splice(index, 1);

              this.#densityTiles.push(tile);
              this.#totalPopulation += density;
            }

            for (let i = 0; i < this.#totalPopulation; i++)
              this.#availableCitizenNumbers.push(i);

            // Create citizen present in the json file
            for (const citizen of json.citizens) {
              const number = this.#getNumberFromCoord(citizen.x, citizen.y);
              this.#spawnCitizen(number, citizen.x, citizen.y);
            }

            for (const tile of this.#densityTiles)
              tile.createKmTileList(this.#densityTiles);

            this.#pauseButton = document.createElement('button');
            this.#pauseButton.textContent = 'Play';
            this.#pauseButton.onclick = () => this.#run();
            document.body.appendChild(this.#pauseButton);

            const stepButton = document.createElement('button');
            stepButton.textContent = 'Step';
            stepButton.onclick = () => this.#step();
            document.body.appendChild(stepButton);
          });
      });
  }

  #run() {
    this.#pause = !this.#pause;
    if (!this.#pause) {
      this.#simulateOneDay();
      this.#pauseButton.textContent = 'Pause';
    } else
      this.#pauseButton.textContent = 'Play';
  }

  #step() {
    this.#simulateOneDay();
  }

  #simulateOneDay() {
    // Citizens create links with other
    for (const citizen of this.#uncompleteCitizens) {
      if ((citizen.linksToGet[0] + citizen.linksToGet[1] + citizen.linksToGet[2]) <= 0)
        this.#uncompleteCitizens.delete(citizen);
      else {
        let totalCreated = 0;
        const days = (World.instance.date - citizen.downloadDate) / 86400000;
        let tile = this.#getTile(citizen.number);
        for (let i = 0; i < citizen.linksToGet[0]; i++) {
          if (this.#shouldCreateANewLink(days)) {
            if (this.#createLink(citizen, tile, 0))
              totalCreated++;
          }
        }
        citizen.linksToGet[0] -= totalCreated;
        totalCreated = 0;
        for (let i = 0; i < citizen.linksToGet[1]; i++) {
          if (this.#shouldCreateANewLink(days)) {
            const neighbourTile = this.#densityTiles[tile.threeKmList[this.#getRandomInt(tile.threeKmList.length - 1)]];
            if (typeof neighbourTile === 'undefined') {
              console.log('Isolated tile');
              totalCreated++;
              continue;
            }
            if (this.#createLink(citizen, neighbourTile, 1))
              totalCreated++;
          }
        }
        citizen.linksToGet[1] -= totalCreated;
        totalCreated = 0;
        for (let i = 0; i < citizen.linksToGet[2]; i++) {
          if (this.#shouldCreateANewLink(days)) {
            const neighbourTile = this.#densityTiles[tile.tenKmList[this.#getRandomInt(tile.tenKmList.length - 1)]];
            if (typeof neighbourTile === 'undefined') {
              console.log('Isolated tile');
              totalCreated++;
              continue;
            }
            if (this.#createLink(citizen, neighbourTile, 2))
              totalCreated++;
          }
        }
        citizen.linksToGet[2] -= totalCreated;
      }
    }

    // Citizens discovers the app by themself
    let numberOfNewCitizens = this.#getRandomInt(Math.floor(Math.sqrt((World.instance.citizens.size + 1) *
        (1 - (World.instance.citizens.size / this.#totalPopulation))))) * this.#getRandomInt(1);

    if (World.instance.citizens.size + numberOfNewCitizens > this.#totalPopulation) {
      numberOfNewCitizens = this.#totalPopulation - World.instance.citizens.size;
      this.#citizensAllSpawned = true;
    }

    for (let i = 0; i < numberOfNewCitizens; i++) {
      const citizenNumber = this.#getValidNewCitizenNumber();
      this.#spawnCitizen(citizenNumber);
    }

    World.instance.date += 86400000; // add one day
    this.#daysElapsed++;
    World.instance.computeReputation();
    World.instance.draw();
    console.log(this.#daysElapsed);
    if (this.#daysElapsed < this.#daysToSimulate && !this.#pause)
      return window.requestAnimationFrame(() => this.#simulateOneDay());
  }

  #getRandomNonZeroInt(max) {
    return Math.floor(Math.random() * (max - 1)) + 2;
  }

  #getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1)); // +1 to include the max
  }

  #getValidNewCitizenNumber() {
    let index = this.#getRandomInt(this.#availableCitizenNumbers.length - 1);
    return this.#availableCitizenNumbers.splice(index, 1)[0];
  }

  #spawnCitizen(number, x, y) {
    const hectare = this.#getTile(number);

    let citizen = false;
    while (!citizen) { // Can never end if the density is too big (~> 2500)
      if (typeof x === 'undefined' && typeof y === 'undefined') {
        const privatePixels = Math.ceil((World.instance.privateSpace / 2 * 1000) / World.instance.pixelToMeterRatio);
        x = hectare.xPixel + privatePixels +
          this.#getRandomNonZeroInt((100 / World.instance.pixelToMeterRatio) - privatePixels);
        y = hectare.yPixel + privatePixels +
          this.#getRandomNonZeroInt((100 / World.instance.pixelToMeterRatio) - privatePixels);
      }
      citizen = hectare.insert(x, y, number);
      if (citizen) {
        this.#uncompleteCitizens.add(citizen);
        return citizen;
      }
      x = undefined;
      y = undefined;
    }
  }

  #shouldCreateANewLink(days) {
    const p = Math.random() * (1 - (0.02 / (1 + Math.exp((10 - days) / 4))));
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
      if (this.#availableCitizenNumbers[i] === number) {
        this.#availableCitizenNumbers.splice(i, 1);
        break;
      }
    }
  }

  #createTarget(number) {
    this.#removeNumberFromList(number);
    return this.#spawnCitizen(number);
  }

  #citizenToCreateArrow(citizen, tile, area, counter) {
    if (typeof counter === 'undefined')
      counter = 0;
    else if (counter === 10 || tile.density === 1) // Prevent infinite recursion
      return;

    let targetNumber = this.#getRandomInt(tile.density - 1) + tile.firstNumber;
    if (targetNumber === citizen.number)
      return this.#citizenToCreateArrow(citizen, tile, area, ++counter);

    let target;
    for (const tileCitizen of tile.citizens) {
      if (tileCitizen.number === targetNumber) {
        target = tileCitizen;
        break;
      }
    }

    if (typeof target === 'undefined') {
      const rand = Math.random();
      if (tile.boost && rand < 0.2)
        return;
      else if (rand < 0.7)
        return;
      target = this.#createTarget(targetNumber);
    }

    if (target.linksToGet[area] <= 0 || citizen.endorsedBy.has(target.id) || citizen.endorse.has(target.id))
      return this.#citizenToCreateArrow(citizen, tile, area, ++counter);

    return target;
  }

  #createLink(citizen, tile, area) {
    const target = this.#citizenToCreateArrow(citizen, tile, area);
    if (typeof target === 'undefined')
      return;
    const arrow = new Arrow(World.instance.idGenerator++, citizen.id, target.id);

    const random = Math.random();
    if (random < 0.9) {
      arrow.arrowHead2 = new ArrowHead(World.instance.idGenerator++, target.id, citizen.id, World.instance.date, arrow);
      target.linksToGet[area]--;
    }

    World.instance.endorsements.set(arrow.id, arrow);
    return true;
  }

  #getNumberFromCoord(x, y) {
    for (const tile of this.#densityTiles) {
      if (x > tile.xPixel && x < tile.xPixel + 100 / World.instance.pixelToMeterRatio &&
        y > tile.yPixel && y < tile.yPixel + 100 / World.instance.pixelToMeterRatio) {
        for (let i = 0; i < tile.density; i++) {
          const number = tile.firstNumber + i;
          for (let j = 0; j < this.#availableCitizenNumbers.length; j++) {
            if (this.#availableCitizenNumbers[j] === number) {
              this.#availableCitizenNumbers.splice(j, 1);
              return number;
            }
          }
        }
      }
    }
  }
}
