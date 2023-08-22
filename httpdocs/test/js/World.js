export default class World {
  #arrowSize;
  #basePointSize;
  #ctx;
  #citizens;
  #endorsements;
  #selectedPointSize;
  constructor(ctx) {
    this.#ctx = ctx;
    this.#citizens = new Map();
    this.#endorsements = new Map();
    this.#basePointSize = 8;
    this.#arrowSize = 5;
    this.#selectedPointSize = 12;
  }

  get arrowSize() {
    return this.#arrowSize;
  }

  get basePointSize() {
    return this.#basePointSize;
  }

  get ctx() {
    return this.#ctx;
  }

  get citizens() {
    return this.#citizens;
  }

  get endorsements() {
    return this.#endorsements;
  }

  get selectedPointSize() {
    return this.#selectedPointSize;
  }

  static init(ctx){
    World.instance = new World(ctx);
  }
}
