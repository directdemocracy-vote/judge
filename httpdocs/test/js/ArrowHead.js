import World from './World.js';

export default class ArrowHead {
  #age;
  #destination;
  #id;
  #path;
  #parent;
  #source;
  constructor(id, source, destination, age, parent, path) {
    this.#id = id;
    this.#age = age;
    this.#source = source;
    this.#destination = destination;
    this.#path = path;
    this.#parent = parent;
    World.instance.citizens.get(source).endorse.add(destination);
    const dest = World.instance.citizens.get(destination);
    dest.endorsedBy.add(source);
    dest.endorsementsLinks.push(this);
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

  distance() {
    return this.#parent.distance;
  }

  prepareDelete() {
    World.instance.citizens.get(this.#source).endorse.delete(this.#destination);
    const dest = World.instance.citizens.get(this.#destination);
    dest.endorsedBy.delete(this.#source);
    for (let i = 0; i < dest.endorsementsLinks; i++) {
      if (dest.endorsementsLinks[i].id === this.#id) {
        dest.endorsementsLinks.splice(i, 1);
        break;
      }
    }
  }

  toJson() {
    return {id: this.#id, age: this.#age, source: this.#source, destination: this.#destination};
  }
}
