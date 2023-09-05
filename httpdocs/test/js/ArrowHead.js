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
    World.instance.citizens.get(source).endorse.add(destination);
    World.instance.citizens.get(destination).endorsedBy.add(source);
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
    if (typeof newPath === 'undefined')
      this.#path = newPath;
  }

  get source() {
    return this.#source;
  }

  prepareDelete() {
    World.instance.citizens.get(this.#source).endorse.delete(this.#destination);
    World.instance.citizens.get(this.#destination).endorsedBy.delete(this.#source);
  }

  toJson() {
    return {id: this.#id, age: this.#age, source: this.#source, destination: this.#destination};
  }
}
