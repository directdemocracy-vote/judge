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
  #thresholdBoosted;
  #pause;
  #pauseButton;
  #animation;
  #daysToSimulate;
  #totalBoostedCitizens;
  constructor(csvLink, jsonLink) {
    this.#csvUrl = csvLink;
    this.#jsonUrl = jsonLink;
    this.#top = 1000000;
    this.#left = 2850000;
    this.#right = 2480000;
    this.#bottom = 1300000;
    this.#threshold = 0.97;
    this.#thresholdBoosted = 0.5;

    this.#daysToSimulate = 1095;

    this.#totalPopulation = 0;
    this.#daysElapsed = 0;
    this.#densityTiles = [];
    this.#citizensAllSpawned = false;
    this.#availableCitizenNumbers = [];
    this.#uncompleteCitizens = new Set();
    this.#totalBoostedCitizens = 0;

    this.#pause = true;

    this.#load();
  }

  get densityTiles() {
    return this.#densityTiles;
  }

  #load() {
    const url = 'https://judge.directdemocracy.vote/test/storage/complex/';
    fetch(url + this.#csvUrl)
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

        if (typeof this.#jsonUrl !== 'undefined') {
          fetch(url + this.#jsonUrl)
            .then(response => response.json())
            .then(json => {
              this.#initialize(csv, json);
            });
        } else
          this.#initialize(csv);
      });
  }

  #initialize(csv, json) {
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
      if (typeof json !== 'undefined') {
        let index;
        for (let i = 0; i < json.tile_to_boost.length; i++) {
          const boostedTile = json.tile_to_boost[i];
          if (rawX === boostedTile.x && rawY === boostedTile.y) {
            tile.boost = true;
            this.#totalBoostedCitizens += tile.density;
            index = i;
            break;
          }
        }

        if (typeof index !== 'undefined')
          json.tile_to_boost.splice(index, 1);
      }

      this.#densityTiles.push(tile);
      this.#totalPopulation += density;
    }

    for (let i = 0; i < this.#totalPopulation; i++)
      this.#availableCitizenNumbers.push(i);

    if (typeof json !== 'undefined') {
      // Create citizen present in the json file
      for (const citizen of json.citizens)
        this.#spawnCitizen(citizen.number);
    }

    for (const tile of this.#densityTiles)
      tile.createKmTileList(this.#densityTiles);

    this.#pauseButton = document.getElementById('play');
    this.#pauseButton.onclick = () => this.#run();

    const stepButton = document.getElementById('step');
    stepButton.textContent = 'Step';
    stepButton.onclick = () => this.#step();
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
        const boost = tile.boost;
        for (let i = 0; i < citizen.linksToGet[0]; i++) {
          if (this.#shouldCreateANewLink(days, boost)) {
            if (this.#createLink(citizen, tile, 0))
              totalCreated++;
          }
        }
        citizen.linksToGet[0] -= totalCreated;
        totalCreated = 0;
        for (let i = 0; i < citizen.linksToGet[1]; i++) {
          if (this.#shouldCreateANewLink(days, boost)) {
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

    // Compute stat for boosted area
    if (typeof this.#jsonUrl !== 'undefined') {
      console.log('Total citizens: ' + this.#totalBoostedCitizens);
      let totalCitizens = 0;
      let totalEndorsed = 0;
      for (const tile of this.#densityTiles) {
        if (tile.boost) {
          totalCitizens += tile.citizens.length;
          for (const citizen of tile.citizens) {
            if (citizen.endorsed)
              totalEndorsed++;
          }
        }
      }
      console.log('Total citizens with the app: ' + totalCitizens);
      console.log('Total citizens endorsed: ' + totalEndorsed);
    }

    if (this.#daysElapsed < this.#daysToSimulate && !this.#pause)
      return window.requestAnimationFrame(() => this.#simulateOneDay());
  }

  #getRandomNonZeroInt(max) {
    return Math.floor(World.instance.rng() * (max - 1)) + 2;
  }

  #getRandomInt(max) {
    return Math.floor(World.instance.rng() * (max + 1)); // +1 to include the max
  }

  #getValidNewCitizenNumber() {
    let index;
    let counter = typeof this.#jsonUrl === 'undefined' ? 2 : 0;
    do {
      index = this.#getRandomInt(this.#availableCitizenNumbers.length - 1);
      counter++;
      if (this.#getTile(index).boost)
        counter = 2;
    } while (counter < 2);
    return this.#availableCitizenNumbers.splice(index, 1)[0];
  }

  #spawnCitizen(number) {
    const hectare = this.#getTile(number);

    let citizen = false;
    while (!citizen) { // Can never end if the density is too big (~> 2500)
      const privatePixels = Math.ceil((World.instance.privateSpace / 2 * 1000) / World.instance.pixelToMeterRatio);
      const x = hectare.xPixel + privatePixels +
        this.#getRandomNonZeroInt((100 / World.instance.pixelToMeterRatio) - privatePixels);
      const y = hectare.yPixel + privatePixels +
        this.#getRandomNonZeroInt((100 / World.instance.pixelToMeterRatio) - privatePixels);

      if (hectare) {
        citizen = hectare.insert(x, y, number);
        if (citizen) {
          this.#uncompleteCitizens.add(citizen);
          return citizen;
        }
      }
    }
  }

  #shouldCreateANewLink(days, boost) {
    const p = World.instance.rng() * (1 - (0.02 / (1 + Math.exp((10 - days) / 4))));
    return typeof boost !== 'undefined' ? p > this.#thresholdBoosted : p > this.#threshold;
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
    else if (counter === 10 || (tile.density === 1 && counter !== 0)) // Prevent infinite recursion
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
      const rand = World.instance.rng();
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

    const random = World.instance.rng();
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
