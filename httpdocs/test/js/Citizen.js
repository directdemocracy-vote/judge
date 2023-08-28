export default class Citizen {
  #coords;
  #endorsed;
  #id;
  #path
  #reputation
  #size;
  constructor(id, path, coords, size) {
    this.#id = id;
    this.#path = path;
    this.#coords = coords;
    this.#size = size;
    this.#reputation = 0;
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

  get size() {
    return this.#size;
  }

  set size(newSize) {
    this.#size = newSize;
  }

  toJson(){
    return { id: this.#id, coords: this.#coords};
  }
}
