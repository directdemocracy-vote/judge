import World from './World.js';
import Arrow from './Arrow.js';
import ArrowHead from './ArrowHead.js';
import Citizen from './Citizen.js';

export default class Generator {
  #generator;
  constructor() {
    this.#generator = document.createElement('div');
    this.#generator.className = 'generator';
    this.#generator.id = 'generator';

    this.#inputFacilitator('Number of Citizens', 'generator-citizens')
    this.#inputFacilitator('Radius (km)', 'generator-radius');
    this.#inputFacilitator('Center X (km)', 'generator-x');
    this.#inputFacilitator('center Y (km)', 'generator-y');

    document.body.appendChild(this.#generator);

    const cancelButton = document.createElement('button');
    cancelButton.id = "generator-cancel";
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => this.#generator.style.display = 'none';
    this.#generator.appendChild(cancelButton);

    const createButton = document.createElement('button');
    createButton.id = "generator-create";
    createButton.textContent = 'Create';
    createButton.onclick = () => this.#generateWorld(true);
    this.#generator.appendChild(createButton);

    const addButton = document.createElement('button');
    addButton.id = "generator-add";
    addButton.textContent = 'Add to world';
    addButton.onclick = () => this.#generateWorld(false);
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

  #generateWorld(reset) {
    const nbrCitizens = document.getElementById('generator-citizens').value;
    const maxRadius = document.getElementById('generator-radius').value;
    const centerX = parseFloat(document.getElementById('generator-x').value);
    const centerY = parseFloat(document.getElementById('generator-y').value);
    if (reset)
      World.instance.resetWorld();

    const distribution = new Map()
    for (let i = 0; i < 21; i++)
      distribution.set(i, 0);

    let ids = []
    for (let i = 0; i < nbrCitizens; i++) {
      let x, y;
      do {
        const angle = (Math.random() * 2 - 1) * Math.PI;
        const radius = Math.sqrt(Math.random()) * maxRadius;
        x = (centerX + radius * Math.cos(angle)) * 1000 / 0.6;
        y= (centerY + radius * Math.sin(angle)) * 1000 / 0.6;
      } while (x < 0 || y < 0 || x > 512*Math.pow(2, World.instance.maxZoomLevel) || y > 512*Math.pow(2, World.instance.maxZoomLevel))

      const id = World.instance.idGenerator++;
      ids.push(id);
      const citizen = new Citizen(id, undefined, [x, y], World.instance.basePointSize)
      citizen.endorsementToGet = this.#setNumberEndorsement();
      distribution.set(citizen.endorsementToGet, distribution.get(citizen.endorsementToGet) + 1);
      World.instance.citizens.set(id, citizen);
      this.#generator.style.display = 'none';
      World.instance.draw();
    }
    console.log(distribution);

    for (const citizen of World.instance.citizens.values()) {
      ids = this.#shuffle(ids);
      let ranking = [];

      // TODO Check number of existing endorsements (induced by reciprocal ones)
      let endorsements = 0;
      if (endorsements >= citizen.endorsementToGet)
        break;

      for (const id of ids ) {
        if (id === citizen.id)
          continue;

        const citizen2 = World.instance.citizens.get(id);
        let distance = Arrow.computeDistance(citizen.id, id);
        if (distance < 1)
          distance = 1;
        const p = Math.random() * 1 / Math.sqrt(this.minDistance);
        ranking.push([p, id]);
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

        const random = Math.random();

        if (random < 0.9)
          arrow.arrowHead2 = new ArrowHead(World.instance.idGenerator++, citizen.id, endorser.id, World.instance.year, undefined);

        World.instance.endorsements.set(arrow.id, arrow);
      }
    }
    World.instance.draw();
  }

  #setNumberEndorsement() {
    let n = parseInt(this.#randomNormal(-10, 20, 1));
    if (n < 0)
      n = this.#setNumberEndorsement();

    return n;
  }

  #sortByProba(a, b) {
    if (a[0] > b[0])
      return 1;
    else if (a[0] == b[0])
      return 0;
    return -1
  }

  // https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
  #randomNormal(min, max, skew) {
    let u = 0;
    let v = 0;
    while(u === 0)
      u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0)
      v = Math.random();

    let number = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    number = number / 10.0 + 0.5; // Translate to 0 -> 1
    if (number > 1 || number < 0)
      number = this.#randomNormal(min, max, skew); // resample between 0 and 1 if out of range

    else{
      number = Math.pow(number, skew); // Skew
      number *= max - min; // Stretch to fill range
      number += min; // offset to min
    }
    return number;
  }

  #shuffle(array) {
    let currentIndex = array.length;
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {

      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
  }
}
