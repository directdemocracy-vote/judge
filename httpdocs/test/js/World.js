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
  #year;
  #zoomLevel
  constructor(ctx, canvas) {
    this.#ctx = ctx;
    this.#citizens = new Map();
    this.#endorsements = new Map();

    this.#idGenerator = 1;
    this.#year = 2023;

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

  get year() {
    return this.#year;
  }

  set year(newYear) {
    this.#year = newYear;
  }

  get zoomLevel() {
    return this.#zoomLevel;
  }

  set zoomLevel(newZoomLevel) {
    console.log(newZoomLevel)
    this.#zoomLevel = newZoomLevel;
  }

  static init(ctx, canvas){
    World.instance = new World(ctx, canvas);
  }


  computeReputation() {
    // damping parameter
    const d = 0.85;
    const reputationFactor = 3;

    // TODO add the webservices to the count
    const N = this.#citizens.size;
    const threshold = 0.8 / N;
    console.log(threshold)


    for (let i = 0; i < 13; i++) {
      for (const citizen of this.#citizens.values()) {
        let sum = 0;
        const linkedEndorsement = [];
        for (const endorsement of this.#endorsements.values()) {
          if (typeof endorsement.arrowHead1 !== 'undefined' && endorsement.arrowHead1.destination === citizen.id)
            linkedEndorsement.push([endorsement, 1]);
          else if (typeof endorsement.arrowHead2 !== 'undefined' && endorsement.arrowHead2.destination === citizen.id)
            linkedEndorsement.push([endorsement, 2]);
        }

        for (let j = 0; j < linkedEndorsement.length; j++) {
          let link = linkedEndorsement[j][0];
          let headNumber = linkedEndorsement[j][1];

          const source = headNumber === 1 ? link.arrowHead1.source : link.arrowHead2.source;
          const age = headNumber === 1 ? this.#year - link.arrowHead1.age : this.#year - link.arrowHead2.age;
          const reputation = this.#citizens.get(source).reputation;
          sum += reputationFactor * reputation / linkedEndorsement.length / (1 + parseFloat(link.distance)) / (1 + age);
        }
        console.log(citizen.id + " :" + sum)

        const newReputation = (1 - d) / N + (d * sum);
        citizen.reputation = newReputation;
        citizen.endorsed = newReputation > threshold;
      }
    }
  }
}
