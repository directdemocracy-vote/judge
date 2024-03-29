import Arrow from './Arrow.js';
import ArrowHead from './ArrowHead.js';
import Citizen from './Citizen.js';
import Generator from './Generator.js';
import IncrementalGenerator from './IncrementalGenerator.js';
import {computeDistance} from './utility.js';

export default class World {
  #borders;
  #canvas;
  #citizens;
  #csvs;
  #ctx;
  #date;
  #displayArrow;
  #displayDensity;
  #displayDistance;
  #displayId;
  #displayReputation;
  #endorsements;
  #height;
  #idGenerator;
  #idPlaceholder;
  #incrementalGenerator;
  #jsons;
  #maximumReputation;
  #maxZoomLevel;
  #minimumReputation;
  #mouseDown;
  #nbrCitizensEndorsed;
  #privateSpace;
  #pixelToMeterRatio;
  #reputationButton;
  #selection;
  #selectedArrow;
  #selectedBoost;
  #selectedWorld;
  #showArrowButton;
  #showDensityButton;
  #showDistanceButton;
  #showIdButton;
  #showReputationButton;
  #startDragOffset;
  #testIndex;
  #testList;
  #testListSoluce;
  #threshold;
  #totalReputation;
  #translatePosition;
  #width;
  #zoomLevel;
  constructor() {
    // Seed the random generator: https://github.com/davidbau/seedrandom
    this.rng = new Math.seedrandom('seed');
    this.#canvas = document.getElementById('worldMap');
    this.#width = document.body.clientWidth;
    this.#height = document.body.clientHeight;
    const size = (this.#width < this.#height ? this.#height : this.#width); // Need to be a square
    this.#ctx = this.#canvas.getContext('2d');
    this.#ctx.canvas.width = size;
    this.#ctx.canvas.height = size;
    this.#citizens = new Map();
    this.#endorsements = new Map();

    this.#idGenerator = 1;
    this.#date = 1704063600000; // 2024/01/01 00:00,  0 = 1970-01-01 00:00:00.000

    this.#nbrCitizensEndorsed = 0;

    this.#startDragOffset = {};
    this.#mouseDown = false;
    this.#translatePosition = {
      x: -256,
      y: 0
    };
    this.#zoomLevel = 21;
    this.#maxZoomLevel = 21;
    this.#privateSpace = 0.0021; // to be able to see the arrows
    this.#pixelToMeterRatio = 0.0325 * 512 / size;
    this.#totalReputation = 0;
    this.#minimumReputation = 0;
    this.#maximumReputation = 0;

    this.#borders = [];
    this.#borders.push([0, 0], [0, Math.pow(2.0, this.#maxZoomLevel) * 256 - 1], [Math.pow(2, this.#maxZoomLevel) * 256 - 1,
      Math.pow(2, this.#maxZoomLevel) * 256 - 1], [Math.pow(2, this.#maxZoomLevel) * 256 - 1, 0]);
    this.#idPlaceholder = document.getElementById('idPlaceholder');
    this.#reputationButton = document.getElementById('reputation');
    this.#reputationButton.onclick = () => {
      this.computeReputation();
      this.draw();
    };

    // Initialize buttons
    if (document.getElementById('statsButton'))
      document.getElementById('statsButton').onclick = () => this.#toggleStatsTab();

    if (document.getElementById('buttonsButton'))
      document.getElementById('buttonsButton').onclick = () => this.#toggleButtonsTab();

    const yearButton = document.getElementById('year');
    yearButton.onclick = () => {
      this.#date += 31536000000;
      this.computeReputation();
      this.draw();
    };

    const monthButton = document.getElementById('month');
    monthButton.onclick = () => {
      this.#date += 2628000000;
      this.computeReputation();
      this.draw();
    };

    const dayButton = document.getElementById('day');
    dayButton.onclick = () => {
      this.#date += 86400000;
      this.computeReputation();
      this.draw();
    };

    this.#showReputationButton = document.getElementById('show-reputation');
    this.#showReputationButton.onclick = () => this.#showReputation();

    this.#showDistanceButton = document.getElementById('show-distance');
    this.#showDistanceButton.onclick = () => this.#showDistance();

    this.#showIdButton = document.getElementById('show-id');
    this.#showIdButton.onclick = () => this.#showId();

    this.#showDensityButton = document.getElementById('show-density');
    this.#showDensityButton.onclick = () => this.#showDensity();
    this.#displayDensity = true;

    this.#showArrowButton = document.getElementById('show-arrow');
    this.#showArrowButton.onclick = () => this.#showArrow();
    this.#displayArrow = true;

    // Initialize mouse listener
    this.#canvas.addEventListener('mousedown', event => {
      if (event.buttons === 1)
        this.#getCursorPosition(event);
      else if (event.buttons === 2)
        this.#initializeTranslationOfViewpoint(event);
    });

    this.#canvas.addEventListener('mousemove', event => this.#translateViewpoint(event));

    const saveButton = document.getElementById('save-world');
    saveButton.onclick = () => this.#saveWorld();

    const openLoadButton = document.getElementById('load-world');
    openLoadButton.onclick = () => this.#openWorldsPanel();

    const cancelButton = document.getElementById('cancel');
    cancelButton.onclick = () => this.#closeWorldsPanel();

    const loadButton = document.getElementById('load');
    loadButton.onclick = () => this.#loadWorld();

    const cancelComplexButton = document.getElementById('cancel-complex');
    cancelComplexButton.onclick = () => this.#closeComplexWorldsPanel();

    const boostButton = document.getElementById('json-complex');
    boostButton.onclick = () => this.#switchFileType();

    const loadComplexButton = document.getElementById('load-complex');
    loadComplexButton.onclick = () => this.#loadComplexWorld();

    const openCoefButton = document.getElementById('show-coef');
    openCoefButton.onclick = () => document.getElementById('coef-menu').style.display = 'block';

    const applyCoefButton = document.getElementById('apply-coef');
    applyCoefButton.onclick = () => this.#applyCoef();

    const cancelCoefButton = document.getElementById('cancel-coef');
    cancelCoefButton.onclick = () => this.#closeCoefPanel();

    const generateButton = document.getElementById('generate-world');
    generateButton.onclick = () => {
      document.getElementById('generator').style.display = 'block';
    };

    const cancelDelete = document.getElementById('cancel-delete');
    cancelDelete.onclick = () => {
      this.#selectedWorld = undefined;
      document.getElementById('password-menu').style.display = 'none';
    };

    const sendDelete = document.getElementById('send-delete');
    sendDelete.onclick = () => this.#sendDelete();

    const complexLoadButton = document.getElementById('incremental-load');
    complexLoadButton.onclick = () => this.#openComplexWorldsPanel();

    // prevent context menu to open
    this.#canvas.oncontextmenu = () => { return false; };

    this.#canvas.addEventListener('wheel', event => {
      if (event.deltaY < 0) {
        this.#zoomLevel += 1;
        if (this.#zoomLevel <= this.#maxZoomLevel) {
          this.#translatePosition.x = this.#translatePosition.x * 2 - 256;
          this.#translatePosition.y = this.#translatePosition.y * 2 - 256;
        }
      } else {
        this.#zoomLevel -= 1;
        if (this.#zoomLevel >= 1) {
          const centralCoordinateX = 256 - this.#translatePosition.x;
          const centralCoordinateY = 256 - this.#translatePosition.y;
          this.#translatePosition.x += centralCoordinateX / 2;
          this.#translatePosition.y += centralCoordinateY / 2;
        }
      }

      if (this.#zoomLevel <= 0)
        this.#zoomLevel = 1;
      else if (this.#zoomLevel > this.#maxZoomLevel)
        this.#zoomLevel = this.#maxZoomLevel;

      this.draw();
    });

    this.#canvas.addEventListener('mouseup', () => { this.#mouseDown = false; });
    this.#canvas.addEventListener('mouseover', () => { this.#mouseDown = false; });
    this.#canvas.addEventListener('mouseout', () => { this.#mouseDown = false; });
    document.getElementById('seedInput').onchange = () => {
      this.rng = new Math.seedrandom(document.getElementById('seedInput').value);
    };

    this.#drawScaleIndicator();
    this.generator = new Generator();

    this.#testList = [
      '20Citizen1km.json',
      '100Citizen2km.json',
      '1000Citizen2km.json'
    ];

    this.#testListSoluce = [
      '20Citizen1km_soluce.json',
      '100Citizen2km_soluce.json',
      '1000Citizen2km_soluce.json'
    ];
    this.#testIndex = 0;
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

  get pixelToMeterRatio() {
    return this.#pixelToMeterRatio;
  }

  get privateSpace() {
    return this.#privateSpace;
  }

  get selectedWorld() {
    return this.#selectedWorld;
  }

  set selectedWorld(newSelectedWorld) {
    this.#selectedWorld = newSelectedWorld;
  }

  get date() {
    return this.#date;
  }

  set date(newDate) {
    this.#date = newDate;
  }

  get zoomLevel() {
    return this.#zoomLevel;
  }

  static init() {
    World.instance = new World();
  }

  #arrowSize() {
    const r = Math.ceil(World.instance.zoomLevel / 2);
    let angle = 0;
    const x1 = r * Math.cos(angle);
    const y1 = r * Math.sin(angle);

    angle += (1 / 3) * (2 * Math.PI);
    const x2 = r * Math.cos(angle);
    const y2 = r * Math.sin(angle);

    angle += (1 / 3) * (2 * Math.PI);
    const x3 = r * Math.cos(angle);
    const y3 = r * Math.sin(angle);

    const x4 = (x1 + x2) / 2;
    const y4 = (y1 + y2) / 2;
    return Math.sqrt(Math.pow(x3 - x4, 2) + Math.pow(y3 - y4, 2));
  }

  #askPassword(name) {
    document.getElementById('load-menu').style.display = 'none';
    document.getElementById('password-menu').style.display = 'block';
  }

  #clear() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  #closeWorldsPanel() {
    document.getElementById('load-menu').style.display = 'none';
    this.#selectedWorld = undefined;
  }

  #closeComplexWorldsPanel() {
    document.getElementById('load-complex-menu').style.display = 'none';
    this.#selectedWorld = undefined;
    this.#selectedBoost = undefined;
    this.#jsons = undefined;
    this.#csvs = undefined;
  }

  #closeCoefPanel() {
    document.getElementById('coef-menu').style.display = 'none';
  }

  computeReputation(numberOfIteration) {
    this.#threshold = 0.5;
    if (typeof numberOfIteration === 'undefined')
      numberOfIteration = 15;
    for (let i = 0; i < numberOfIteration; i++) {
      let newTotalReputation = 0;
      this.#maximumReputation = 0;
      this.#minimumReputation = 1;
      this.#nbrCitizensEndorsed = 0;

      for (const citizen of this.#citizens.values()) {
        let sum = 0;
        for (const link of citizen.endorsementsLinks) {
          const source = link.source;
          const age = this.#date - link.age;
          const reputation = this.#citizens.get(source).reputation;
          const distanceFactor = this.#distanceFunction(link.distance());
          const timeFactor = this.#timeFunction(age);
          sum += reputation * distanceFactor * timeFactor;
        }

        citizen.reputation = this.#reputationFunction(2 / (1 + Math.sqrt(this.#totalReputation / this.citizens.size)) + sum);
        if (citizen.reputation < this.#minimumReputation)
          this.#minimumReputation = citizen.reputation;
        if (citizen.reputation > this.#maximumReputation)
          this.#maximumReputation = citizen.reputation;

        citizen.endorsed = citizen.reputation > this.#threshold;
        if (citizen.endorsed)
          this.#nbrCitizensEndorsed++;

        newTotalReputation += citizen.reputation;
      }

      this.#totalReputation = newTotalReputation;
    }
  }

  #reputationFunction(x) {
    if (x < 3)
      return Math.pow(x, 2) / 18;
    else
      return 1 - (0.75 / (x - 1.5));
  }

  #distanceFunction(x) {
    if (x < 1)
      x = 1;
    if (x < 10)
      return 1 - (1 / (1 + Math.exp((10 - x) / 2)));
    else if (x < 100)
      return (0.5 / 0.9) * (1 - 0.01 * x);
    else
      return 0;
  }

  #timeFunction(x) {
    // 1 year = 31536000000
    return 1 - (1 / (1 + Math.exp((63072000000 - x) / 8000000000)));
  }

  #computeStatistics() {
    const statisticsPlaceholder = document.getElementById('statisticsPlaceholder');
    statisticsPlaceholder.innerHTML = '';

    const dateDiv = document.createElement('div');
    dateDiv.textContent = 'Date: ' + new Date(this.#date).toLocaleString();
    statisticsPlaceholder.appendChild(dateDiv);

    const nbrCitizensDiv = document.createElement('div');
    nbrCitizensDiv.textContent = 'Number of citizens: ' + this.#citizens.size;
    statisticsPlaceholder.appendChild(nbrCitizensDiv);

    const nbrCitizensEndorsedDiv = document.createElement('div');
    nbrCitizensEndorsedDiv.textContent = 'Number of endorsed citizens: ' + this.#nbrCitizensEndorsed;
    statisticsPlaceholder.appendChild(nbrCitizensEndorsedDiv);

    const nbrEndorsementsDiv = document.createElement('div');
    let nbrEndorsements = 0;
    let doubleEndorsements = 0;
    let totalDistance = 0;
    let distanceList = [];
    for (const endorsement of this.#endorsements.values()) {
      if (typeof endorsement.arrowHead1 !== 'undefined' && typeof endorsement.arrowHead2 !== 'undefined') {
        nbrEndorsements += 2;
        doubleEndorsements++;
        totalDistance += 2 * endorsement.distance;
        distanceList.push(endorsement.distance);
        distanceList.push(endorsement.distance);
      } else {
        nbrEndorsements++;
        totalDistance += endorsement.distance;
        distanceList.push(endorsement.distance);
      }
    }
    nbrEndorsementsDiv.textContent = 'Number of endorsements: ' + nbrEndorsements;
    statisticsPlaceholder.appendChild(nbrEndorsementsDiv);

    const averageReputationDiv = document.createElement('div');
    averageReputationDiv.textContent = 'Average reputation: ' + (this.#totalReputation / this.#citizens.size).toFixed(3);
    statisticsPlaceholder.appendChild(averageReputationDiv);

    const minimumReputationDiv = document.createElement('div');
    minimumReputationDiv.textContent = 'Minimum reputation: ' + this.#minimumReputation.toFixed(3);
    statisticsPlaceholder.appendChild(minimumReputationDiv);

    const maximumReputationDiv = document.createElement('div');
    maximumReputationDiv.textContent = 'Maximum reputation: ' + this.#maximumReputation.toFixed(3);
    statisticsPlaceholder.appendChild(maximumReputationDiv);

    if (nbrEndorsements > 0) {
      const nbrDoubleEndorsementsDiv = document.createElement('div');
      const percent = doubleEndorsements / this.#endorsements.size * 100;
      nbrDoubleEndorsementsDiv.textContent = 'Number of mutual endorsements: ' + doubleEndorsements +
        ' (' + percent.toFixed(2) + '%)';
      statisticsPlaceholder.appendChild(nbrDoubleEndorsementsDiv);

      if (typeof this.#threshold !== 'undefined') {
        const thresholdDiv = document.createElement('div');
        thresholdDiv.textContent = 'Threshold: ' + this.#threshold;
        statisticsPlaceholder.appendChild(thresholdDiv);
      }

      const averageDistanceDiv = document.createElement('div');
      const averageDistance = (totalDistance / nbrEndorsements).toFixed(3);
      averageDistanceDiv.textContent = 'Average distance of endorsements: ' + averageDistance + 'km';
      statisticsPlaceholder.appendChild(averageDistanceDiv);

      const medianDistanceDiv = document.createElement('div');
      distanceList.sort(this.#sort);
      const medianDistance = distanceList.length % 2 === 0
        ? ((distanceList[distanceList.length / 2 - 1] + distanceList[distanceList.length / 2]) / 2)
        : distanceList[(distanceList.length + 1) / 2 - 1];
      medianDistanceDiv.textContent = 'Median distance of endorsements: ' + medianDistance + 'km';
      statisticsPlaceholder.appendChild(medianDistanceDiv);
    }
  }

  draw() {
    this.#clear();
    this.#ctx.save();
    this.#ctx.translate(this.#translatePosition.x, this.#translatePosition.y);

    // Represent the density map
    if (typeof this.#incrementalGenerator !== 'undefined' && this.#displayDensity) {
      let d = 0;
      for (const tile of this.#incrementalGenerator.densityTiles) {
        const coordX = tile.xPixel / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
        const coordY = tile.yPixel / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
        const size = (100 / this.#pixelToMeterRatio) / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
        const density = tile.density;
        if (density > d)
          d = density;
        this.#ctx.beginPath();
        if (density > 120)
          this.#ctx.fillStyle = '#bd0026';
        else if (density > 40)
          this.#ctx.fillStyle = '#f03b20';
        else if (density > 15)
          this.#ctx.fillStyle = '#fd8d3c';
        else if (density > 6)
          this.#ctx.fillStyle = '#feb243';
        else if (density > 3)
          this.#ctx.fillStyle = '#fdd976';
        else
          this.#ctx.fillStyle = '#ffffb2';

        this.#ctx.rect(coordX, coordY, size, size);
        this.#ctx.fill();
        this.#ctx.closePath();
      }
    }

    for (const citizen of this.#citizens.values()) {
      const path = new Path2D();
      const coordX = citizen.coords[0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
      const coordY = citizen.coords[1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
      if (this.#selection === citizen.id)
        path.arc(coordX, coordY, Math.ceil(25 - (24 / (1 + Math.exp(0.9 * (this.#zoomLevel - 20))))) + 2, 0, 2 * Math.PI);
      else
        path.arc(coordX, coordY, Math.ceil(25 - (24 / (1 + Math.exp(0.9 * (this.#zoomLevel - 20))))), 0, 2 * Math.PI);
      citizen.path = path;

      if (citizen.endorsed)
        this.#ctx.fillStyle = 'green';
      else
        this.#ctx.fillStyle = 'grey';

      this.#ctx.fill(path);

      if (this.#displayReputation) {
        this.#ctx.font = '12px serif';
        this.#ctx.fillText(citizen.reputation.toFixed(3), coordX - 11, coordY - 12);
      }

      if (this.#displayId) {
        this.#ctx.font = '13px serif';
        this.#ctx.fillText(citizen.id, coordX - 10, coordY - 12);
      }
    }

    if ((this.#displayArrow && this.#zoomLevel > 16) || typeof this.#selection !== 'undefined') {
      const showOnlySelectedCitizenArrow = !(this.#displayArrow && this.#zoomLevel > 16);

      for (const endorsement of this.#endorsements.values()) {
        if (showOnlySelectedCitizenArrow &&
          !(endorsement.idPoint1 === this.#selection || endorsement.idPoint2 === this.#selection))
          continue;

        this.#ctx.fillStyle = 'black';
        let arrowSize = this.#arrowSize();
        // Number of pixels between the two points
        let availablePixels = endorsement.distance / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) /
          this.#pixelToMeterRatio * 1000;
        // substract the radius and the arrows
        availablePixels -= 2 * Math.ceil(25 - (24 / (1 + Math.exp(0.9 * (this.#zoomLevel - 20)))) + 2) + 2 * arrowSize;

        if (availablePixels > 0) {
          endorsement.buildLine(this.#displayDistance);
          if (typeof endorsement.arrowHead1 !== 'undefined') {
            if (endorsement.arrowHead1.id === this.#selectedArrow)
              this.#ctx.fillStyle = 'red';
            else
              this.#ctx.fillStyle = 'black';
            endorsement.rebuildArrowHead(endorsement.arrowHead1);
          }
          if (typeof endorsement.arrowHead2 !== 'undefined') {
            if (endorsement.arrowHead2.id === this.#selectedArrow)
              this.#ctx.fillStyle = 'red';
            else
              this.#ctx.fillStyle = 'black';
            endorsement.rebuildArrowHead(endorsement.arrowHead2);
          }
        } else if (availablePixels > -2 * arrowSize)
          endorsement.buildLine(this.#displayDistance, true);
      }
    }

    this.#ctx.beginPath();
    this.#ctx.moveTo(this.#borders[0][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5, this.#borders[0][1] /
      Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5);
    this.#ctx.lineTo(this.#borders[1][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5, this.#borders[1][1] /
      Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5);
    this.#ctx.lineTo(this.#borders[2][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5, this.#borders[2][1] /
      Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5);
    this.#ctx.lineTo(this.#borders[3][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5, this.#borders[3][1] /
      Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5);
    this.#ctx.closePath();
    this.#ctx.lineWidth = 10;
    this.#ctx.stroke();

    this.#ctx.restore();

    this.#drawScaleIndicator();

    this.#computeStatistics();
  }

  #drawEndorsement(id1, id2) {
    for (const endorsement of this.#endorsements.values()) {
      if ((id1 === endorsement.idPoint1 || id1 === endorsement.idPoint2) && (id2 === endorsement.idPoint1 ||
          id2 === endorsement.idPoint2)) {
        // The endorsement already exists
        if ((typeof endorsement.arrowHead1 !== 'undefined' && endorsement.arrowHead1.source === id1 &&
          endorsement.arrowHead1.destination === id2) || (typeof endorsement.arrowHead2 !== 'undefined' &&
          endorsement.arrowHead2.source === id1 && endorsement.arrowHead2.destination === id2)) {
          this.#resetSelection();
          return;
        }

        // Reverse endorsement already exists
        endorsement.buildArrow(id1, id2);
        this.#resetSelection();
        return;
      }
    }

    const id = this.#idGenerator++;
    const arrow = new Arrow(id, id1, id2);
    this.#endorsements.set(id, arrow);
    this.#resetSelection();
  }

  #drawScaleIndicator() {
    const height = this.#height * 0.9375;
    const width = this.#width * 0.9375 - 380;
    this.#ctx.beginPath();
    this.#ctx.moveTo(width - 90, height);
    this.#ctx.lineTo(width, height);
    this.#ctx.lineWidth = 1;
    this.#ctx.stroke();

    this.#ctx.beginPath();
    this.#ctx.moveTo(width - 90, height - 5);
    this.#ctx.lineTo(width - 90, height + 5);
    this.#ctx.lineWidth = 1;
    this.#ctx.stroke();

    this.#ctx.beginPath();
    this.#ctx.moveTo(width, height - 5);
    this.#ctx.lineTo(width, height + 5);
    this.#ctx.lineWidth = 1;
    this.#ctx.stroke();

    this.#ctx.font = '11px serif';
    const distance = (90 * Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) * this.#pixelToMeterRatio / 1000).toFixed(3);
    this.#ctx.fillText(distance + 'km', width - 54, height - 2);
  }

  #drawPoint(x, y) {
    const coordX = (x - this.#translatePosition.x) * Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
    const coordY = (y - this.#translatePosition.y) * Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
    for (const neighbour of this.#citizens.values()) {
      const coords = neighbour.coords;
      const distance = computeDistance(coordX, coordY, coords[0], coords[1]);
      if (distance < this.#privateSpace)
        return;
    }
    const id = this.#idGenerator++;
    const citizen = new Citizen(id, undefined, [coordX, coordY]);
    this.#citizens.set(id, citizen);
    this.draw();
  }

  #getCursorPosition(event) {
    const rect = this.#canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xTranslated = x - this.#translatePosition.x;
    const yTranslated = y - this.#translatePosition.y;

    const id = this.#isOnPoint(xTranslated, yTranslated);
    if (typeof id === 'undefined') {
      if (typeof this.#selection !== 'undefined' || typeof this.#selectedArrow !== 'undefined')
        this.#resetSelection();
      else
        this.#drawPoint(x, y);
    } else {
      if (this.#citizens.has(id)) {
        if (typeof this.#selection === 'undefined' || this.#selection === id) {
          this.#selection = id;
          this.#selectedArrow = undefined;
          this.draw();
          const citizen = this.#citizens.get(id);
          this.#idPlaceholder.innerHTML = '';
          const idDiv = document.createElement('div');
          idDiv.textContent = 'ID: ' + id;
          this.#idPlaceholder.appendChild(idDiv);
          const reputationDiv = document.createElement('div');
          reputationDiv.textContent = 'Reputation: ' + citizen.reputation;
          this.#idPlaceholder.appendChild(reputationDiv);
          const coordsDiv = document.createElement('div');
          coordsDiv.textContent = 'Coordinates: ' + citizen.coords[0] + ', ' + citizen.coords[1];
          this.#idPlaceholder.appendChild(coordsDiv);
          const endorseDiv = document.createElement('div');
          let string = '';
          citizen.endorse.forEach(value => { string += value + ' '; });
          endorseDiv.textContent = 'endorse: ' + string;
          this.#idPlaceholder.appendChild(endorseDiv);
          const endorsedByDiv = document.createElement('div');
          string = '';
          citizen.endorsedBy.forEach(value => { string += value + ' '; });
          endorsedByDiv.textContent = 'endorsedBy: ' + string;
          this.#idPlaceholder.appendChild(endorsedByDiv);
          const endorsementToGetDiv = document.createElement('div');
          endorsementToGetDiv.textContent = 'Endorsement to get: ' + citizen.endorsementToGet;
          this.#idPlaceholder.appendChild(endorsementToGetDiv);
          this.#revokeButton(id);
        } else
          this.#drawEndorsement(this.#selection, id);
      } else {
        let line;
        let head;
        for (const endorsement of this.#endorsements.values()) {
          if (endorsement.arrowHead1 && endorsement.arrowHead1.id === id) {
            line = endorsement;
            head = 1;
            break;
          } else if (endorsement.arrowHead2 && endorsement.arrowHead2.id === id) {
            line = endorsement;
            head = 2;
            break;
          }
        }

        this.#selectedArrow = id;
        this.#idPlaceholder.innerHTML = '';
        const idDiv = document.createElement('div');
        idDiv.textContent = 'ID: ' + id;
        this.#idPlaceholder.appendChild(idDiv);
        const distanceDiv = document.createElement('div');
        distanceDiv.textContent = 'Distance: ' + line.distance + 'km';
        this.#idPlaceholder.appendChild(distanceDiv);
        const ageDiv = document.createElement('div');
        const age = head === 1 ? line.arrowHead1.age : line.arrowHead2.age;
        ageDiv.textContent = 'Date: ' + age;
        this.#idPlaceholder.appendChild(ageDiv);

        const weightDiv = document.createElement('div');
        const duration = this.#date - age;
        const distanceFactor = this.#distanceFunction(line.distance);
        const timeFactor = this.#timeFunction(duration);

        weightDiv.textContent = 'Weight (distance * age): ' + (distanceFactor * timeFactor);
        this.#idPlaceholder.appendChild(weightDiv);
        this.#revokeButton(id);
        this.draw();
      }
    }
  }

  #initializeTranslationOfViewpoint(event) {
    this.#mouseDown = true;
    this.#startDragOffset.x = event.clientX - this.#translatePosition.x;
    this.#startDragOffset.y = event.clientY - this.#translatePosition.y;
  }

  #isOnPoint(x, y) {
    for (const entry of this.#endorsements.entries()) {
      if (typeof entry[1].arrowHead1 !== 'undefined' && typeof entry[1].arrowHead1.path !== 'undefined' &&
        this.#ctx.isPointInPath(entry[1].arrowHead1.path, x, y))
        return entry[1].arrowHead1.id;
      if (typeof entry[1].arrowHead2 !== 'undefined' && typeof entry[1].arrowHead2.path !== 'undefined' &&
        this.#ctx.isPointInPath(entry[1].arrowHead2.path, x, y))
        return entry[1].arrowHead2.id;
    }

    for (const entry of this.#citizens.entries()) {
      if (this.#ctx.isPointInPath(entry[1].path, x, y))
        return entry[0];
    }
  }

  #loadWorld(test) {
    if (typeof this.#selectedWorld === 'undefined')
      return;

    let url = 'https://judge.directdemocracy.vote/test/';
    if (test)
      url += 'tests/';
    else
      url += 'storage/';

    return fetch(url + this.#selectedWorld)
      .then(response => response.json())
      .then(response => {
        this.#closeWorldsPanel();
        this.resetWorld();

        for (const citizen of response.citizens) {
          if (citizen.id >= this.#idGenerator)
            this.#idGenerator = citizen.id + 1;
          this.#citizens.set(citizen.id, new Citizen(citizen.id, undefined, citizen.coords));
        }

        for (const endorsement of response.endorsements) {
          if (endorsement.id >= this.#idGenerator)
            this.#idGenerator = endorsement.id + 1;

          let newEndorsement = new Arrow(endorsement.id, endorsement.idPoint1, endorsement.idPoint2, true);

          if (typeof endorsement.arrowHead1 !== 'undefined') {
            if (endorsement.arrowHead1.id >= this.#idGenerator)
              this.#idGenerator = endorsement.arrowHead1.id + 1;
            if (endorsement.arrowHead1.age >= this.#date)
              this.#date = endorsement.arrowHead1.age;
            newEndorsement.arrowHead1 = new ArrowHead(endorsement.arrowHead1.id, endorsement.arrowHead1.source,
              endorsement.arrowHead1.destination, endorsement.arrowHead1.age, newEndorsement);
          }

          if (typeof endorsement.arrowHead2 !== 'undefined') {
            if (endorsement.arrowHead2.id >= this.#idGenerator)
              this.#idGenerator = endorsement.arrowHead2.id + 1;
            if (endorsement.arrowHead2.age >= this.#date)
              this.#date = endorsement.arrowHead2.age;
            newEndorsement.arrowHead2 = new ArrowHead(endorsement.arrowHead2.id, endorsement.arrowHead2.source,
              endorsement.arrowHead2.destination, endorsement.arrowHead2.age, newEndorsement);
          }

          this.#endorsements.set(newEndorsement.id, newEndorsement);
        }

        this.draw();
      });
  }

  #loadComplexWorld() {
    if (typeof this.#selectedWorld === 'undefined')
      return;

    const world = this.#selectedWorld;
    const json = this.#selectedBoost;
    this.#closeComplexWorldsPanel();
    this.resetWorld();
    this.#incrementalGenerator = new IncrementalGenerator(world, json, this.parameters);
    this.draw();
  }

  #openWorldsPanel() {
    document.getElementById('load-menu').style.display = 'block';
    const menu = document.getElementById('world-menu');
    menu.innerHTML = '';
    fetch('/test/ajax/list.php')
      .then(response => response.json())
      .then(response => {
        this.#jsons = [];
        this.#csvs = [];
        for (const name of response) {
          if (name === '.gitignore' || name === '.htaccess')
            continue;
          else {
            const div = document.createElement('div');
            div.className = 'world';
            div.textContent = name;
            div.onclick = () => {
              this.#selectedWorld = name;
              const worlds = document.getElementsByClassName('world');
              for (const world of worlds)
                world.parentNode.style.background = 'transparent';

              div.parentNode.style.background = 'dodgerblue';
            };
            const deleteButton = document.createElement('button');
            deleteButton.className = 'trash';
            deleteButton.onclick = () => {
              this.#selectedWorld = name;
              this.#askPassword();
            };
            const container = document.createElement('div');
            container.className = 'container';
            container.appendChild(div);
            container.appendChild(deleteButton);
            menu.appendChild(container);
          }
        }
      });
  }

  #openComplexWorldsPanel() {
    document.getElementById('load-complex-menu').style.display = 'block';
    const menu = document.getElementById('world-complex-menu');
    menu.style.display = 'block';
    menu.innerHTML = '';
    this.#csvs = [];
    this.#jsons = [];
    fetch('/test/ajax/list_complex.php')
      .then(response => response.json())
      .then(response => {
        for (const name of response) {
          if (name === '.gitignore' || name === '.htaccess')
            continue;
          else {
            if (name.endsWith('.csv')) {
              this.#csvs.push(name);
              const div = document.createElement('div');
              div.className = 'world';
              div.textContent = name;
              div.onclick = () => {
                this.#selectedWorld = name;
                const worlds = document.getElementsByClassName('world');
                for (const world of worlds)
                  world.parentNode.style.background = 'transparent';

                div.parentNode.style.background = 'dodgerblue';
              };
              const container = document.createElement('div');
              container.className = 'container';
              container.appendChild(div);
              menu.appendChild(container);
            } else
              this.#jsons.push(name);
          }
        }
      });
  }

  #switchFileType() {
    const menu = document.getElementById('world-complex-menu');
    menu.innerHTML = '';
    if (document.getElementById('json-complex').innerText === 'Boost') {
      document.getElementById('json-complex').innerText = 'Worlds';
      for (const name of this.#jsons) {
        const div = document.createElement('div');
        div.className = 'world';
        div.textContent = name;
        div.onclick = () => {
          this.#selectedBoost = name;
          const worlds = document.getElementsByClassName('world');
          for (const world of worlds)
            world.parentNode.style.background = 'transparent';

          div.parentNode.style.background = 'dodgerblue';
        };
        const container = document.createElement('div');
        container.className = 'container';
        container.appendChild(div);
        menu.appendChild(container);
      }
    } else {
      document.getElementById('json-complex').innerText = 'Boost';
      for (const name of this.#csvs) {
        const div = document.createElement('div');
        div.className = 'world';
        div.textContent = name;
        div.onclick = () => {
          this.#selectedWorld = name;
          const worlds = document.getElementsByClassName('world');
          for (const world of worlds)
            world.parentNode.style.background = 'transparent';

          div.parentNode.style.background = 'dodgerblue';
        };
        const container = document.createElement('div');
        container.className = 'container';
        container.appendChild(div);
        menu.appendChild(container);
      }
    }
  }

  #resetSelection() {
    this.#selection = undefined;
    this.#selectedArrow = undefined;
    this.#idPlaceholder.innerHTML = '';
    this.draw();
  }

  resetWorld() {
    this.#citizens = new Map();
    this.#endorsements = new Map();

    this.#idGenerator = 1;
    this.#date = 1704063600000; // 2024/01/01 00:00,  0 = 1970-01-01 00:00:00.000

    this.#startDragOffset = {};
    this.#mouseDown = false;
    this.#translatePosition = {
      x: 0,
      y: 0
    };
    this.#zoomLevel = 20;
    this.#maxZoomLevel = 20;
    this.#pixelToMeterRatio = 0.075;
    this.#incrementalGenerator = undefined;
  }

  #revokeButton(id) {
    const button = document.createElement('button');
    button.textContent = 'Revoke';
    button.className = 'revoke-button';
    button.onclick = () => {
      if (this.#citizens.has(id)) {
        this.#citizens.get(id).prepareDelete();
        this.#citizens.delete(id);
        for (const endorsement of this.#endorsements.values()) {
          if (endorsement.idPoint1 === id || endorsement.idPoint2 === id)
            this.#endorsements.delete(endorsement.id);
        }
      } else {
        for (const endorsement of this.#endorsements.values()) {
          if (typeof endorsement.arrowHead1 !== 'undefined' && endorsement.arrowHead1.id === id) {
            endorsement.arrowHead1.prepareDelete();
            if (typeof endorsement.arrowHead2 !== 'undefined')
              endorsement.arrowHead1 = undefined;
            else
              this.#endorsements.delete(endorsement.id);
          } else if (typeof endorsement.arrowHead2 !== 'undefined' && endorsement.arrowHead2.id === id) {
            endorsement.arrowHead2.prepareDelete();
            if (typeof endorsement.arrowHead1 !== 'undefined')
              endorsement.arrowHead2 = undefined;
            else
              this.#endorsements.delete(endorsement.id);
          }
        }
      }
      this.#selection = undefined;
      this.#selectedArrow = undefined;
      this.draw();
    };
    this.#idPlaceholder.appendChild(button);
  }

  #applyCoef() {
    this.parameters = {};
    this.parameters.threshold = parseFloat(document.getElementById('input-threshold').value);
    this.parameters.thresholdBoosted = parseFloat(document.getElementById('input-thresholdBoosted').value);
    this.parameters.daysToSimulate = parseInt(document.getElementById('input-daysToSimulate').value);
    this.parameters.reciprocity = parseFloat(document.getElementById('input-reciprocity').value);
    this.parameters.refuseToDownload = parseFloat(document.getElementById('input-refuseToDownload').value);
    this.parameters.refuseToDownloadBoosted = parseFloat(document.getElementById('input-refuseToDownloadBoosted').value);
    this.parameters.redrawBoosted = parseInt(document.getElementById('input-redrawBoosted').value);
    this.parameters.noSpontaneousCitizen = parseFloat(document.getElementById('input-noSpontaneousCitizen').value);

    if (typeof this.#incrementalGenerator !== 'undefined')
      this.#incrementalGenerator.setParameters(this.parameters);

    this.#closeCoefPanel();
  }

  nextIndex() {
    if (this.#testIndex < this.#testList.length)
      this.#testIndex++;
  }

  prevIndex() {
    if (this.#testIndex > 0)
      this.#testIndex--;
  }

  loadTestWorld() {
    this.testResultDiv = document.getElementById('test-result');
    this.testResultDiv.innerHTML = '';
    this.#selectedWorld = this.#testList[this.#testIndex];
    this.#loadWorld(true)
      .then(() => this.#runTest());
  }

  #runTest() {
    this.computeReputation();
    this.draw();
    fetch('https://judge.directdemocracy.vote/test/tests/' + this.#testListSoluce[this.#testIndex])
      .then(response => response.json())
      .then(response => {
        let bug = false;

        this.testResultDiv.innerHTML += '<p>Testing given assermented citizens:</p>';
        for (const assermentedID of response.assermented) {
          if (!this.#citizens.get(assermentedID).endorsed) {
            bug = true;
            this.testResultDiv.innerHTML += '<p class=result-wrong>' + assermentedID + ' should be assermented but is not.</p>';
          }
        }

        if (!bug)
          this.testResultDiv.innerHTML += '<p class=result-ok>OK</p>';

        bug = false;
        this.testResultDiv.innerHTML += '<p>Testing given non-assermented citizens:</p>';
        for (const assermentedID of response.nonAssermented) {
          if (this.#citizens.get(assermentedID).endorsed) {
            bug = true;
            this.testResultDiv.innerHTML += '<p class=result-wrong>' + assermentedID + ' should not be assermented but is.</p>';
          }
        }

        if (!bug)
          this.testResultDiv.innerHTML += '<p class=result-ok>OK</p>';

        let oldReputation = this.#commonTest();

        bug = false;
        this.testResultDiv.innerHTML += '<p>Testing that reputation has converged:</p>';

        this.computeReputation(1);
        for (let i = 0; i > this.#citizens.size; i++) {
          if (this.#citizens.values()[i].reputation !== oldReputation[i]) {
            bug = true;
            this.testResultDiv.innerHTML += '<p class=result-wrong> Reputation of ' + this.#citizens.values()[i] + ' has changed: ' + this.#citizens.values()[i].reputation + ' not egal to ' + oldReputation[i] + '</p>';
          }
        }

        if (!bug)
          this.testResultDiv.innerHTML += '<p class=result-ok>OK</p>';

        this.generator.generateWorld(false, 10, response.radius, response.center[0], response.center[1]);
        this.computeReputation(15);

        oldReputation = this.#commonTest();
        bug = false;
        this.testResultDiv.innerHTML += '<p>Testing that reputation is still stable after adding 10 random citizens:</p>';
        this.computeReputation(1);
        for (let i = 0; i > this.#citizens.size; i++) {
          if (this.#citizens.values()[i].reputation !== oldReputation[i]) {
            bug = true;
            this.testResultDiv.innerHTML += '<p class=result-wrong>Reputation of ' + this.#citizens.values()[i] + ' has changed: ' + this.#citizens.values()[i].reputation + ' not egal to ' + oldReputation[i] + '</p>';
          }
        }
        if (!bug)
          this.testResultDiv.innerHTML += '<p class=result-ok>OK</p>';

        bug = false;

        console.log('Test finished');
      });
  }

  #commonTest() {
    const oldReputation = [];
    let bug = false;
    this.testResultDiv.innerHTML += '<p>Testing that no node is assermented but has less than three endorsements and</p>';
    this.testResultDiv.innerHTML += '<p>that no node is not assermented but has at least five assermented citizens endorsing him</p>';

    for (const citizen of this.#citizens.values()) {
      oldReputation.push(citizen.reputation);
      if (citizen.endorsed && citizen.endorsedBy.size < 3) {
        bug = true;
        this.testResultDiv.innerHTML += '<p class=result-wrong>' + citizen.id + ' is assermented but less than three citizen endorsed him.</p>';
      } else if (!citizen.endorsed && citizen.endorsedBy.size > 5) {
        let endorserEndorsed = 0;
        for (const endorserId of citizen.endorsedBy) {
          if (this.#citizens.get(endorserId).endorsed)
            endorserEndorsed++;
        }
        if (endorserEndorsed > 4) {
          bug = true;
          this.testResultDiv.innerHTML += '<p class=result-wrong>' + citizen.id + ' is not assermented but at least 5 assermented citizens endorsed him.</p>';
        }
      }
    }

    if (!bug)
      this.testResultDiv.innerHTML += '<p class=result-ok>OK</p>';

    return oldReputation;
  }

  #saveWorld() {
    const name = document.getElementById('world-name').value;
    const citizens = [];
    for (const citizen of this.#citizens.values())
      citizens.push(citizen.toJson());

    const endorsements = [];
    for (const endorsement of this.#endorsements.values())
      endorsements.push(endorsement.toJson());

    fetch('/test/ajax/save.php', { method: 'post',
      body: JSON.stringify({ name: name, citizens: citizens, endorsements: endorsements})})
      .then(response => response.text())
      .then(response => {
        if (response !== '')
          console.error(response);
      });
  }

  #sendDelete() {
    fetch('/test/ajax/delete.php', { method: 'post',
      body: JSON.stringify({ name: this.#selectedWorld, password: document.getElementById('password').value})});

    this.#selectedWorld = undefined;
    document.getElementById('password-menu').style.display = 'none';
  }

  #showDistance() {
    if (this.#displayDistance)
      this.#showDistanceButton.textContent = 'Show distance (km)';
    else
      this.#showDistanceButton.textContent = 'Hide distance (km)';

    this.#displayDistance = !this.#displayDistance;
    this.draw();
  }

  #showArrow() {
    if (this.#displayArrow)
      this.#showArrowButton.textContent = 'Show arrows';
    else
      this.#showArrowButton.textContent = 'Hide arrows';

    this.#displayArrow = !this.#displayArrow;
    this.draw();
  }

  #showId() {
    if (this.#displayId)
      this.#showIdButton.textContent = 'Show id';
    else
      this.#showIdButton.textContent = 'Hide id';

    this.#displayId = !this.#displayId;
    this.draw();
  }

  #showDensity() {
    if (this.#displayDensity)
      this.#showDensityButton.textContent = 'Show density';
    else
      this.#showDensityButton.textContent = 'Hide density';

    this.#displayDensity = !this.#displayDensity;
    this.draw();
  }

  #showReputation() {
    if (this.#displayReputation)
      this.#showReputationButton.textContent = 'Show reputation';
    else
      this.#showReputationButton.textContent = 'Hide reputation';

    this.#displayReputation = !this.#displayReputation;
    this.draw();
  }

  #sort(a, b) {
    if (a > b)
      return 1;
    else if (a === b)
      return 0;
    return -1;
  }

  #translateViewpoint(event) {
    if (this.#mouseDown) {
      this.#translatePosition.x = event.clientX - this.#startDragOffset.x;
      this.#translatePosition.y = event.clientY - this.#startDragOffset.y;
      this.draw();
    }
  }

  #toggleStatsTab() {
    let arrow = document.getElementById('stats-arrow');
    if (arrow) {
      const stats = document.getElementById('statisticsPlaceholder');
      const idInfo = document.getElementById('idPlaceholder');
      const arrowButton = document.getElementById('statsButton');

      if (arrow.className === 'arrow-right') {
        arrow.className = 'arrow-left';
        stats.style.display = 'none';
        idInfo.style.display = 'none';
        arrowButton.style.right = '0px';
      } else if (arrow.className === 'arrow-left') {
        arrow.className = 'arrow-right';
        stats.style.display = '';
        idInfo.style.display = '';
        arrowButton.style.right = '380px';
      }
    }
  }

  #toggleButtonsTab() {
    let arrow = document.getElementById('buttons-arrow');
    if (arrow) {
      const buttons = document.getElementById('buttons');
      const arrowButton = document.getElementById('buttonsButton');

      if (arrow.className === 'arrow-left') {
        arrow.className = 'arrow-right';
        buttons.style.display = 'none';
        arrowButton.style.left = '0px';
      } else if (arrow.className === 'arrow-right') {
        arrow.className = 'arrow-left';
        buttons.style.display = '';
        arrowButton.style.left = '240px';
      }
    }
  }
}
