import World from './World.js';
import Arrow from './Arrow.js';
import ArrowHead from './ArrowHead.js';
import Citizen from './Citizen.js';
import {computeDistance, randomNormal} from './utility.js';

export default class Generator {
  #generator;
  constructor() {
    this.#generator = document.createElement('div');
    this.#generator.className = 'generator';
    this.#generator.id = 'generator';

    this.#inputFacilitator('Number of Citizens', 'generator-citizens');
    this.#inputFacilitator('Radius (km)', 'generator-radius');
    this.#inputFacilitator('Center X (km)', 'generator-x');
    this.#inputFacilitator('center Y (km)', 'generator-y');

    document.body.appendChild(this.#generator);

    const cancelButton = document.createElement('button');
    cancelButton.id = 'generator-cancel';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => {
      this.#generator.style.display = 'none';
    };
    this.#generator.appendChild(cancelButton);

    const createButton = document.createElement('button');
    createButton.id = 'generator-create';
    createButton.textContent = 'Create';
    createButton.onclick = () => {
      const nbrCitizens = parseInt(document.getElementById('generator-citizens').value);
      const maxRadius = parseFloat(document.getElementById('generator-radius').value);
      const centerX = parseFloat(document.getElementById('generator-x').value);
      const centerY = parseFloat(document.getElementById('generator-y').value);
      this.generateWorld(true, nbrCitizens, maxRadius, centerX, centerY);
    };
    this.#generator.appendChild(createButton);

    const addButton = document.createElement('button');
    addButton.id = 'generator-add';
    addButton.textContent = 'Add to world';
    addButton.onclick = () => {
      const nbrCitizens = parseInt(document.getElementById('generator-citizens').value);
      const maxRadius = parseFloat(document.getElementById('generator-radius').value);
      const centerX = parseFloat(document.getElementById('generator-x').value);
      const centerY = parseFloat(document.getElementById('generator-y').value);
      this.generateWorld(false, nbrCitizens, maxRadius, centerX, centerY);
    };
    this.#generator.appendChild(addButton);
  }

  #inputFacilitator(text, id) {
    const container = document.createElement('div');
    container.className = 'generator-container';

    const title = document.createElement('div');
    title.className = 'generator-title';
    title.textContent = text;
    container.appendChild(title);

    const input = document.createElement('input');
    input.className = 'generator-input';
    input.id = id;
    input.type = 'number';
    input.min = 0;
    input.value = 0;
    container.appendChild(input);

    this.#generator.appendChild(container);
  }

  generateWorld(reset, nbrCitizens, maxRadius, centerX, centerY) {
    if (reset)
      World.instance.resetWorld();

    const distribution = new Map();
    for (let i = 0; i < 21; i++)
      distribution.set(i, 0);

    let ids = [];
    const initialNumberofCitizen = World.instance.citizens.size;
    let trials = 0;
    while (World.instance.citizens.size < nbrCitizens + initialNumberofCitizen && trials < nbrCitizens * 3) {
      let x, y;
      trials++;
      do {
        const angle = (World.instance.rng() * 2 - 1) * Math.PI;
        const radius = Math.sqrt(World.instance.rng()) * maxRadius;
        x = (centerX + radius * Math.cos(angle)) * 1000 / World.instance.pixelToMeterRatio;
        y = (centerY + radius * Math.sin(angle)) * 1000 / World.instance.pixelToMeterRatio;
      } while (x < 0 || y < 0 || x > 512 * Math.pow(2, World.instance.maxZoomLevel) ||
        y > 512 * Math.pow(2, World.instance.maxZoomLevel));

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
      ids.push(id);
      const citizen = new Citizen(id, undefined, [x, y]);
      citizen.endorsementToGet = this.#setNumberEndorsement();
      distribution.set(citizen.endorsementToGet, distribution.get(citizen.endorsementToGet) + 1);
      World.instance.citizens.set(id, citizen);
      this.#generator.style.display = 'none';
      World.instance.draw();
    }

    for (const id of ids) {
      const citizen = World.instance.citizens.get(id);
      let ranking = [];

      if (citizen.endorsedBy.length >= citizen.endorsementToGet)
        break;

      for (const citizen2 of World.instance.citizens.values()) {
        if (citizen2.id === citizen.id)
          continue;

        let distance = computeDistance(citizen.coords[0], citizen.coords[1], citizen2.coords[0], citizen2.coords[1]);
        if (distance < 1)
          distance = 1;
        const p = World.instance.rng() * 1 / Math.sqrt(distance);
        ranking.push([p, citizen2.id]);
      }

      ranking.sort(this.#sortByProba);
      let i = -1;
      while (citizen.endorsedBy.size < citizen.endorsementToGet) {
        if (i === ranking.length - 1)
          break;
        i++;

        const endorser = World.instance.citizens.get(ranking[i][1]);
        // citizen has endorse endorser but it was not reciprocal
        if (endorser.endorsedBy.has(citizen.id))
          continue;

        const arrow = new Arrow(World.instance.idGenerator++, endorser.id, citizen.id);

        const random = World.instance.rng();

        if (random < 0.9)
          arrow.arrowHead2 = new ArrowHead(World.instance.idGenerator++, citizen.id, endorser.id, World.instance.date, arrow);

        World.instance.endorsements.set(arrow.id, arrow);
      }
    }
    World.instance.draw();
  }

  #setNumberEndorsement() {
    let n = parseInt(randomNormal(-10, 20, 1));

    // Artificially increase the number of 0 and 1 citizens
    if (n < 0) {
      if (n === -1 || n < -4)
        n = 1;
      else if (n === -2 || n === -3 || n === -4)
        n = 0;

      n = this.#setNumberEndorsement();
    }

    return n;
  }

  #sortByProba(a, b) {
    if (a[0] > b[0])
      return -1;
    else if (a[0] === b[0])
      return 0;
    return 1;
  }
}
