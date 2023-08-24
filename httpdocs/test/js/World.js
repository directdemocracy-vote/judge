export default class World {
  #arrowSize;
  #basePointSize;
  #ctx;
  #citizens;
  #endorsements;
  #idGenerator;
  #maxZoomLevel;
  #mouseDown;
  #pixelToMeterRatio;
  #selectedPointSize;
  #startDragOffset;
  #translatePosition;
  #zoomLevel
  constructor(ctx, canvas) {
    this.#ctx = ctx;
    this.#citizens = new Map();
    this.#endorsements = new Map();
    this.#idGenerator = 1;
    this.#basePointSize = 5;
    this.#arrowSize = 5;
    this.#selectedPointSize = 12;
    this.#startDragOffset = {};
    this.#mouseDown = false;
    this.#translatePosition = {
        x: 0,
        y: 0
      };
    this.#zoomLevel = 17;
    this.#maxZoomLevel = 17;
    this.#pixelToMeterRatio = 0.6;
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

  get idGenerator() {
    return this.#idGenerator;
  }

  set idGenerator(newId) {
    this.#idGenerator = newId;
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

  get pixelToMeterRatio() {
    return this.#pixelToMeterRatio;
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
