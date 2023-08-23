export default class World {
  #arrowSize;
  #basePointSize;
  #ctx;
  #citizens;
  #endorsements;
  #maxZoomLevel;
  #mouseDown;
  #selectedPointSize;
  #startDragOffset;
  #translatePosition;
  #zoomLevel
  constructor(ctx, canvas) {
    this.#ctx = ctx;
    this.#citizens = new Map();
    this.#endorsements = new Map();
    this.#basePointSize = 5;
    this.#arrowSize = 8;
    this.#selectedPointSize = 12;
    this.#startDragOffset = {};
    this.#mouseDown = false;
    this.#translatePosition = {
        x: 0,
        y: 0
      };
    this.#zoomLevel = 14;
    this.#maxZoomLevel = 15;
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

  get maxZoomLevel() {
    return this.#maxZoomLevel;
  }

  get mouseDown() {
    return this.#mouseDown;
  }

  set mouseDown(newMouseDown) {
    this.#mouseDown = newMouseDown;
  }

  get selectedPointSize() {
    return this.#selectedPointSize;
  }

  get startDragOffset() {
    return this.#startDragOffset;
  }

  get translatePosition() {
    return this.#translatePosition;
  }

  get zoomLevel() {
    return this.#zoomLevel;
  }

  set zoomLevel(newZoomLevel) {
    this.#zoomLevel = newZoomLevel;
  }

  static init(ctx, canvas){
    World.instance = new World(ctx, canvas);
  }
}
