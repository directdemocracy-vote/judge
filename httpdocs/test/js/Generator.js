import World from './World.js';

export default class Generator {
  #generator;
  constructor() {
    this.#generator = document.createElement('div');
    this.#generator.className = 'generator';

    this.#inputFacilitator('Number of Citizens', 'generator-citizens')
    this.#inputFacilitator('Radius (km)', 'generator-radius');
    this.#inputFacilitator('Center X', 'generator-x');
    this.#inputFacilitator('centerY', 'generator-y');

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
    const radius = document.getElementById('generator-radius').value;
    const centerX = document.getElementById('generator-x').value;
    const centerY = document.getElementById('generator-y').value;
    if (reset)
      World.instance.resetWorld();
    for (let i = 0; i < nbrCitizens; i++) {

    }
  }
}
