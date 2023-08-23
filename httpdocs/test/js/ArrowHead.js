import World from './World.js';

export default class ArrowHead {
  #destination;
  #id;
  #path;
  #source;
  constructor(source, destination, path) {
    this.#id = World.instance.idGenerator++;
    this.#source = source;
    this.#destination = destination;
    this.#path = path;
  }

  get destination() {
    return this.#destination;
  }

  get id() {
    return this.#id;
  }

  get path() {
    return this.#path;
  }

  get source() {
    return this.#source;
  }
}
