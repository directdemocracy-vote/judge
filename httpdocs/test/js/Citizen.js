import World from './World.js';

export default class Citizen {
  #coords;
  #endorsed;
  #endorsedBy;
  #endorse;
  #id;
  #path
  #reputation
  constructor(id, path, coords) {
    this.#id = id;
    this.#path = path;
    this.#coords = coords;
    this.#reputation = 0;
    this.#endorsedBy = new Set();
    this.#endorse = new Set();
  }

  get id() {
    return this.#id;
  }

  get endorsed() {
    return this.#endorsed;
  }

  set endorsed(newEndorsed) {
    this.#endorsed = newEndorsed;
  }

  get endorse() {
    return this.#endorse;
  }

  get endorsedBy() {
    return this.#endorsedBy;
  }

  get path() {
    return this.#path;
  }

  set path(newPath) {
    this.#path = newPath;
  }

  get coords() {
    return this.#coords;
  }

  set coords(newCoords) {
    this.#coords = newCoords;
  }

  get reputation() {
    return this.#reputation;
  }

  set reputation(newReputation) {
    this.#reputation = newReputation;
  }

  prepareDelete() {
    for (const id of this.#endorsedBy)
      World.instance.citizens.get(id).endorse.delete(this.#id);

    for (const id of this.#endorse)
      World.instance.citizens.get(id).endorsedBy.delete(this.#id);
  }

  toJson(){
    return { id: this.#id, coords: this.#coords};
  }
}
