import World from './World.js';

export default class ArrowHead {
  #age;
  #destination;
  #id;
  #path;
  #source;
  constructor(source, destination, path, age) {
    this.#id = World.instance.idGenerator++;
    this.#age = age;
    this.#source = source;
    this.#destination = destination;
    this.#path = path;
  }

  get age() {
    return this.#age;
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

  set path(newPath) {
    this.#path = newPath;
  }

  get source() {
    return this.#source;
  }
}
