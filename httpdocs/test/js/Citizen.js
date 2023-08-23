export default class Citizen {
  #coords;
  #id;
  #path
  #size;
  constructor(id, path, coords, size) {
    this.#id = id;
    this.#path = path;
    this.#coords = coords;
    this.#size = size;
  }

  get id() {
    return this.#id;
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

  get size() {
    return this.#size;
  }

  set size(newSize) {
    this.#size = newSize;
  }
}
