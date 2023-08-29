import World from './World.js';

export default class ArrowHead {
  #age;
  #destination;
  #id;
  #path;
  #source;
  constructor(id, source, destination, age, path) {
    this.#id = id;
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

  toJson() {
    return {id: this.#id, age: this.#age, source: this.#source, destination: this.#destination};
  }
}
