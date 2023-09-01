import Arrow from './Arrow.js';
import ArrowHead from './ArrowHead.js';
import Citizen from './Citizen.js';
import Generator from './Generator.js';

export default class World {
  #ageButton;
  #arrowSize;
  #basePointSize;
  #borders;
  #canvas;
  #ctx;
  #citizens;
  #displayDistance;
  #displayReputation;
  #endorsements;
  #idGenerator;
  #idPlaceholder;
  #maxZoomLevel;
  #mouseDown;
  #pixelToMeterRatio;
  #reputationButton;
  #selection;
  #selectedPointSize;
  #selectedWorld;
  #showDistanceButton;
  #showReputationButton;
  #startDragOffset;
  #threshold;
  #translatePosition;
  #year;
  #zoomLevel;
  constructor() {
    this.#canvas = document.getElementById('worldMap');
    this.#ctx = this.#canvas.getContext('2d');

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
        x: -256,
        y: 0
      };
    this.#zoomLevel = 17;
    this.#maxZoomLevel = 17;
    this.#pixelToMeterRatio = 0.6;

    this.#displayReputation = false;

    this.#borders = [];
    this.#borders.push([0,0], [0, Math.pow(2.0, this.#maxZoomLevel) * 256 -1], [Math.pow(2, this.#maxZoomLevel) * 256 -1, Math.pow(2, this.#maxZoomLevel)  * 256 -1], [Math.pow(2, this.#maxZoomLevel)  * 256 -1, 0]);
    this.#idPlaceholder = document.getElementById('idPlaceholder');
    this.#reputationButton = document.getElementById('reputation');
    this.#reputationButton.onclick = () => {
      this.#computeReputation();
      this.draw()
    }

    // Initialize buttons
    this.#ageButton = document.getElementById('age');
    this.#ageButton.onclick = () => this.#year++;

    this.#showReputationButton = document.getElementById('show-reputation');
    this.#showReputationButton.onclick = () => this.#showReputation();

    this.#showDistanceButton = document.getElementById('show-distance');
    this.#showDistanceButton.onclick = () => this.#showDistance();

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

    const generateButton = document.getElementById('generate-world');
    generateButton.onclick = () => document.getElementById('generator').style.display = 'block';

    const cancelDelete = document.getElementById('cancel-delete');
    cancelDelete.onclick = () => {
      this.#selectedWorld = undefined;
      document.getElementById('password-menu').style.display = 'none';
    }

    const sendDelete = document.getElementById('send-delete');
    sendDelete.onclick = () => this.#sendDelete();

    // prevent context menu to open
    this.#canvas.oncontextmenu = () => {return false;}

    this.#canvas.addEventListener('wheel', event => {
      if (event.deltaY < 0) {
        this.#zoomLevel += 1;
        if (this.#zoomLevel <= this.#maxZoomLevel) {
          this.#translatePosition.x = this.#translatePosition.x * 2 - 256;
          this.#translatePosition.y = this.#translatePosition.y * 2 - 256;
        }
      } else {
        this.#zoomLevel -=1;
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

    this.#canvas.addEventListener('mouseup', () => this.#mouseDown = false);
    this.#canvas.addEventListener('mouseover', () => this.#mouseDown = false);
    this.#canvas.addEventListener('mouseout', () => this.#mouseDown = false);

    this.#drawScaleIndicator();
    new Generator();
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

  get pixelToMeterRatio() {
    return this.#pixelToMeterRatio;
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

  static init(){
    World.instance = new World();
  }

  #askPassword(name) {
    document.getElementById('load-menu').style.display = 'none';
    document.getElementById('password-menu').style.display = 'block';
  }


  #changePointSize(id, newSize) {
    if (typeof id === 'undefined')
      return;

    const citizen = this.#citizens.get(id);
    const coords = citizen.coords;
    const path = new Path2D();
    path.arc(coords[0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel), coords[1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel), newSize, 0, 2 * Math.PI);
    citizen.path = path;
    citizen.size = newSize;
    this.draw();
  }

  #clear() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  #closeWorldsPanel() {
    document.getElementById('load-menu').style.display = 'none';
    this.#selectedWorld = undefined;
  }

  #computeReputation() {
    // damping parameter
    const d = 0.85;

    // TODO add the webservices to the count
    const N = this.#citizens.size;
    // this.#threshold = 0.8 / N;
    this.#threshold = 0.5;

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
          // sum += reputation / linkedEndorsement.length;
          sum += reputation;
        }
        const newReputation = 1 / (1 + Math.exp(-sum + 3));
        // const newReputation = (1 - d) / N + (d * sum);
        citizen.reputation = newReputation;
        citizen.endorsed = newReputation > this.#threshold;
      }
    }
  }

  #computeStatistics() {
    const statisticsPlaceholder = document.getElementById('statisticsPlaceholder');
    statisticsPlaceholder.innerHTML = '';

    const nbrCitizensDiv = document.createElement('div');
    nbrCitizensDiv.textContent = 'Number of citizens: ' + this.#citizens.size;
    statisticsPlaceholder.appendChild(nbrCitizensDiv);

    const nbrCitizensEndorsedDiv = document.createElement('div');
    let endorsed = 0;
    for (const citizen of this.#citizens.values()) {
      if (citizen.endorsed)
        endorsed++;
    }

    nbrCitizensEndorsedDiv.textContent = 'Number of endorsed citizens: ' + endorsed;
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

    if (nbrEndorsements > 0) {
      const nbrDoubleEndorsementsDiv = document.createElement('div');
      const percent = doubleEndorsements / this.#endorsements.size * 100;
      nbrDoubleEndorsementsDiv.textContent = 'Number of mutual endorsements: ' + doubleEndorsements + ' (' + percent.toFixed(2) + '%)';
      statisticsPlaceholder.appendChild(nbrDoubleEndorsementsDiv);

      if (typeof this.#threshold !== 'undefined') {
        const thresholdDiv = document.createElement('div');
        thresholdDiv.textContent = "Threshold: " + this.#threshold;
        statisticsPlaceholder.appendChild(thresholdDiv);
      }

      const averageDistanceDiv = document.createElement('div');
      const averageDistance = (totalDistance / nbrEndorsements).toFixed(3);
      averageDistanceDiv.textContent = 'Average distance of endorsements: ' + averageDistance + 'km';
      statisticsPlaceholder.appendChild(averageDistanceDiv);

      const medianDistanceDiv = document.createElement('div');
      distanceList.sort(this.#sort);
      const medianDistance = distanceList.length % 2 === 0 ? ((distanceList[distanceList.length / 2 - 1] + distanceList[distanceList.length / 2]) / 2) : distanceList[(distanceList.length + 1) / 2 - 1];
      medianDistanceDiv.textContent = 'Median distance of endorsements: ' + medianDistance + 'km';
      statisticsPlaceholder.appendChild(medianDistanceDiv);90
    }
  }

  draw() {
    this.#clear();
    this.#ctx.save();
    this.#ctx.translate(this.#translatePosition.x, this.#translatePosition.y);

    for (const citizen of this.#citizens.values()) {
      const path = new Path2D();
      const coordX = citizen.coords[0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
      const coordY = citizen.coords[1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
      path.arc(coordX, coordY, citizen.size, 0, 2 * Math.PI);
      citizen.path = path;

      if (citizen.endorsed)
        this.#ctx.fillStyle = 'green';
      else
        this.#ctx.fillStyle = 'red';

      this.#ctx.fill(path);

      if (this.#displayReputation) {
        this.#ctx.font = '10px serif';
        this.#ctx.fillText(citizen.reputation.toFixed(3), coordX - 11, coordY - 7);
      }
    }

    for (const endorsement of this.#endorsements.values()) {
      this.#ctx.fillStyle = 'black';
      endorsement.buildLine(this.#displayDistance);
      if (endorsement.arrowHead1)
        endorsement.rebuildArrowHead(endorsement.arrowHead1);
      if (endorsement.arrowHead2)
        endorsement.rebuildArrowHead(endorsement.arrowHead2);
    }

    this.#ctx.beginPath();
    this.#ctx.moveTo(this.#borders[0][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5, this.#borders[0][1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5);
    this.#ctx.lineTo(this.#borders[1][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5, this.#borders[1][1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5);
    this.#ctx.lineTo(this.#borders[2][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5, this.#borders[2][1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5);
    this.#ctx.lineTo(this.#borders[3][0] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) + 5, this.#borders[3][1] / Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) - 5);
    this.#ctx.closePath();
    this.#ctx.lineWidth = 10;
    this.#ctx.stroke();

    this.#ctx.restore();

    this.#drawScaleIndicator();

    this.#computeStatistics();
  }

  #drawEndorsement(id1, id2) {
    for (const endorsement of this.#endorsements.values()) {
      if ((id1 === endorsement.idPoint1 || id1 === endorsement.idPoint2) && (id2 === endorsement.idPoint1 || id2 === endorsement.idPoint2)) {

        // The endorsement already exists
        if ((typeof endorsement.arrowHead1 !== 'undefined' && endorsement.arrowHead1.source === id1 && endorsement.arrowHead1.destination === id2) ||
            (typeof endorsement.arrowHead2 !== 'undefined' && endorsement.arrowHead2.source === id1 && endorsement.arrowHead2.destination === id2)) {
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
    this.#ctx.beginPath();
    this.#ctx.moveTo(425, 480);
    this.#ctx.lineTo(480, 480);
    this.#ctx.lineWidth = 1;
    this.#ctx.stroke();

    this.#ctx.beginPath();
    this.#ctx.moveTo(425, 475);
    this.#ctx.lineTo(425, 485);
    this.#ctx.lineWidth = 1;
    this.#ctx.stroke();

    this.#ctx.beginPath();
    this.#ctx.moveTo(480, 475);
    this.#ctx.lineTo(480, 485);
    this.#ctx.lineWidth = 1;
    this.#ctx.stroke();

    this.#ctx.font = '11px serif';
    const distance = (55 * Math.pow(2, this.#maxZoomLevel - this.#zoomLevel) * this.#pixelToMeterRatio / 1000).toFixed(2);
    this.#ctx.fillText(distance + 'km', 428, 478);
  }

  #drawPoint(x, y) {
    const point = new Path2D();
    const coordX = (x - this.#translatePosition.x) * Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
    const coordY = (y - this.#translatePosition.y) * Math.pow(2, this.#maxZoomLevel - this.#zoomLevel);
    point.arc(x, y, this.#basePointSize, 0, 2 * Math.PI);

    const id = this.#idGenerator++
    const citizen = new Citizen(id, point, [coordX, coordY], this.#basePointSize);
    this.#citizens.set(id, citizen);
    this.draw();
  }

  #getCursorPosition(event) {
    const rect = this.#canvas.getBoundingClientRect()
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xTranslated = x - this.#translatePosition.x;
    const yTranslated = y - this.#translatePosition.y;

    const id = this.#isOnPoint(xTranslated, yTranslated);
    if (typeof id === 'undefined') {
      if (typeof this.#selection !== 'undefined') {
        this.#resetSelection()
      } else
        this.#drawPoint(x, y);
    } else {
      if (this.#citizens.has(id)) {
        if (typeof this.#selection === 'undefined' || this.#selection === id) {
          this.#changePointSize(id, this.#selectedPointSize)
          this.#selection = id;

          const citizen = this.#citizens.get(id)
          this.#idPlaceholder.innerHTML = '';
          const idDiv = document.createElement('div');
          idDiv.textContent = 'ID: ' + id;
          this.#idPlaceholder.appendChild(idDiv);
          const reputationDiv = document.createElement('div');
          reputationDiv.textContent = 'Reputation: ' + citizen.reputation;
          this.#idPlaceholder.appendChild(reputationDiv);
          const coordsDiv = document.createElement('div');
          coordsDiv.textContent = "Coordinates: " + citizen.coords[0] + ", " + citizen.coords[1];
          this.#idPlaceholder.appendChild(coordsDiv);
          const endorsedByDiv = document.createElement('div');
          let string = "";
          citizen.endorsedBy.forEach(value => string += value + " ");
          endorsedByDiv.textContent = "endorsedBy: " + string;
          this.#idPlaceholder.appendChild(endorsedByDiv);
          const endorsementToGetDiv = document.createElement('div');
          endorsementToGetDiv.textContent = "Endorsement to get: " + citizen.endorsementToGet;
          this.#idPlaceholder.appendChild(endorsementToGetDiv);
          this.#revokeButton(id);
        } else {
          this.#drawEndorsement(this.#selection, id)
        }
      } else {
        let line;
        let head;
        for (const endorsement of this.#endorsements.values()) {
          if (endorsement.arrowHead1 && endorsement.arrowHead1.id === id) {
            line =  endorsement;
            head = 1
            break;
          } else if(endorsement.arrowHead2 && endorsement.arrowHead2.id === id) {
            line =  endorsement;
            head = 2
            break;
          }
        }

        this.#idPlaceholder.innerHTML = '';
        const idDiv = document.createElement('div');
        idDiv.textContent = 'ID: ' + id;
        this.#idPlaceholder.appendChild(idDiv);
        const distanceDiv = document.createElement('div');
        distanceDiv.textContent = 'Distance: ' + line.distance + 'km';
        this.#idPlaceholder.appendChild(distanceDiv);
        const ageDiv = document.createElement('div');
        const age = head === 1 ? line.arrowHead1.age : line.arrowHead2.age;
        ageDiv.textContent = 'Year: ' + age;
        this.#idPlaceholder.appendChild(ageDiv);
        this.#revokeButton(id);
      }
    }
  }

  #initializeTranslationOfViewpoint(event) {
    this.#mouseDown = true;
    this.#startDragOffset.x = event.clientX - this.#translatePosition.x;
    this.#startDragOffset.y = event.clientY - this.#translatePosition.y;
  }

  #isOnPoint(x, y) {
    for (const entry of this.#citizens.entries()) {
      if (this.#ctx.isPointInPath(entry[1].path, x, y))
        return entry[0];
    }

    for (const entry of this.#endorsements.entries()) {
      if (typeof entry[1].arrowHead1 !== 'undefined' && this.#ctx.isPointInPath(entry[1].arrowHead1.path, x, y))
        return entry[1].arrowHead1.id;
      if (typeof entry[1].arrowHead2 !== 'undefined' && this.#ctx.isPointInPath(entry[1].arrowHead2.path, x, y))
        return entry[1].arrowHead2.id;
    }
  }

  #loadWorld() {
    if (typeof this.#selectedWorld === 'undefined')
      return;

    fetch('/test/storage/' + this.#selectedWorld)
      .then(response => response.json())
      .then(response => {
        this.resetWorld();

        for (const citizen of response.citizens) {
          if (citizen.id >= this.#idGenerator)
            this.#idGenerator = citizen.id + 1;
          this.#citizens.set(citizen.id, new Citizen(citizen.id, undefined, citizen.coords, this.#basePointSize));
        }

        for (const endorsement of response.endorsements) {
          if (endorsement.id >= this.#idGenerator)
            this.#idGenerator = endorsement.id + 1;

          let newEndorsement = new Arrow(endorsement.id, endorsement.idPoint1, endorsement.idPoint2);
          if (typeof endorsement.arrowHead1 !== 'undefined'){
            if (endorsement.arrowHead1.id >= this.#idGenerator)
              this.#idGenerator = endorsement.arrowHead1.id + 1;
            if (endorsement.arrowHead1.age >= this.#year)
              this.#year = endorsement.arrowHead1.age;
            newEndorsement.arrowHead1 = new ArrowHead(endorsement.arrowHead1.id, endorsement.arrowHead1.source, endorsement.arrowHead1.destination, endorsement.arrowHead1.age)
          }

          if (typeof endorsement.arrowHead2 !== 'undefined'){
            if (endorsement.arrowHead2.id >= this.#idGenerator)
              this.#idGenerator = endorsement.arrowHead2.id + 1;
            if (endorsement.arrowHead2.age >= this.#year)
              this.#year = endorsement.arrowHead2.age;
            newEndorsement.arrowHead2 = new ArrowHead(endorsement.arrowHead2.id, endorsement.arrowHead2.source, endorsement.arrowHead2.destination, endorsement.arrowHead2.age)
          }

          this.#endorsements.set(newEndorsement.id, newEndorsement);
        }

        this.draw();
      });

    this.#closeWorldsPanel();
  }

  #openWorldsPanel() {
    document.getElementById('load-menu').style.display = 'block'
    const menu = document.getElementById('world-menu');
    menu.innerHTML = '';
    fetch('/test/ajax/list.php')
      .then(response => response.json())
      .then(response => {
        for (const name of response) {
          if (name === '.gitignore')
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
            }
            const deleteButton = document.createElement('button');
            deleteButton.className = 'trash';
            deleteButton.onclick = () => {
              this.#selectedWorld = name;
              this.#askPassword();
            }
            const container = document.createElement('div');
            container.className = 'container';
            container.appendChild(div);
            container.appendChild(deleteButton);
            menu.appendChild(container);
          }
        }
      });
  }

  #resetSelection() {
    this.#changePointSize(this.#selection, this.#basePointSize);
    this.#selection = undefined;
    this.#idPlaceholder.innerHTML = '';
  }

  resetWorld() {
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

  #revokeButton(id) {
    const button = document.createElement('button')
    button.textContent = 'Revoke';
    button.onclick = () => {
      if (this.#citizens.has(id)) {
        this.#citizens.delete(id);
        for (const endorsement of this.#endorsements.values()) {
          if (endorsement.idPoint1 === id || endorsement.idPoint2 === id)
            this.#endorsements.delete(endorsement.id);
        }
      } else {
        for (const endorsement of this.#endorsements.values()) {
          if (typeof endorsement.arrowHead1 !== 'undefined' && endorsement.arrowHead1.id === id) {
            if (typeof endorsement.arrowHead2 !== 'undefined')
              endorsement.arrowHead1 = undefined;
            else
              this.#endorsements.delete(endorsement.id);
          } else if(typeof endorsement.arrowHead2 !== 'undefined' && endorsement.arrowHead2.id === id) {
            if (typeof endorsement.arrowHead1 !== 'undefined')
              endorsement.arrowHead2 = undefined;
            else
              this.#endorsements.delete(endorsement.id);
          }
        }
      }
      this.#selection = undefined;
      this.draw();
    }
    this.#idPlaceholder.appendChild(button);
  }

  #saveWorld() {
    const name = document.getElementById('world-name').value;
    const citizens = [];
    for (const citizen of this.#citizens.values())
      citizens.push(citizen.toJson());

    const endorsements = [];
    for (const endorsement of this.#endorsements.values())
      endorsements.push(endorsement.toJson());

    fetch('/test/ajax/save.php', { method: 'post', body: JSON.stringify({ name: name, citizens: citizens, endorsements: endorsements})})
      .then(response => response.text())
      .then(response => {
        if (response !== '')
          console.error(response)
      });
  }

  #sendDelete() {
    fetch('/test/ajax/delete.php', { method: 'post', body: JSON.stringify({ name: this.#selectedWorld, password: document.getElementById('password').value})});

    this.#selectedWorld = undefined;
    document.getElementById('password-menu').style.display = 'none';
  }

  #showDistance() {
    if (this.#displayDistance)
      this.#showDistanceButton.textContent = 'Show distance (km)';
    else
      this.#showDistanceButton.textContent = 'Hide distance (km)';

    this.#displayDistance = !this.#displayDistance;
    this.draw()
  }

  #showReputation() {
    if (this.#displayReputation)
      this.#showReputationButton.textContent = 'Show reputation';
    else
      this.#showReputationButton.textContent = 'Hide reputation';

    this.#displayReputation = !this.#displayReputation;
    this.draw()
  }

  #sort(a, b) {
    if (a > b)
      return 1;
    else if (a == b)
      return 0;
    return -1
  }

  #translateViewpoint(event) {
    if (this.#mouseDown) {
      this.#translatePosition.x = event.clientX - this.#startDragOffset.x;
      this.#translatePosition.y = event.clientY - this.#startDragOffset.y;
      this.draw();
    }
  }
}
