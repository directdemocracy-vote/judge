import ArrowHead from './ArrowHead.js';
import World from './World.js';
import {computeDistance} from './utility.js';

export default class Arrow {
  #arrowHead1;
  #arrowHead2;
  #distance;
  #id;
  #idPoint1;
  #idPoint2;
  #line;
  #x1;
  #x2;
  #y1;
  #y2;
  constructor(id, idPoint1, idPoint2, simpleLine) {
    this.#id = id;
    this.#idPoint1 = idPoint1;
    this.#idPoint2 = idPoint2;
    const coords1 = World.instance.citizens.get(idPoint1).coords;
    const coords2 = World.instance.citizens.get(idPoint2).coords;
    this.#distance = computeDistance(coords1[0], coords1[1], coords2[0], coords2[1]);
    this.buildLine();
    if (!simpleLine)
      this.buildArrow(idPoint1, idPoint2);
  }

  get arrowHead1() {
    return this.#arrowHead1;
  }

  set arrowHead1(newArrowHead1) {
    this.#arrowHead1 = newArrowHead1;
  }

  get arrowHead2() {
    return this.#arrowHead2;
  }

  set arrowHead2(newArrowHead2) {
    this.#arrowHead2 = newArrowHead2;
  }

  get distance() {
    return this.#distance;
  }

  get id() {
    return this.#id;
  }

  get idPoint1() {
    return this.#idPoint1;
  }

  get idPoint2() {
    return this.#idPoint2;
  }

  buildLine(showDistance, arrow) {
    this.#line = new Path2D();
    let coords1 = World.instance.citizens.get(this.#idPoint1).coords;
    coords1 = [coords1[0] / Math.pow(2, World.instance.maxZoomLevel - World.instance.zoomLevel), coords1[1] /
      Math.pow(2, World.instance.maxZoomLevel - World.instance.zoomLevel)];
    let coords2 = World.instance.citizens.get(this.#idPoint2).coords;
    coords2 = [coords2[0] / Math.pow(2, World.instance.maxZoomLevel - World.instance.zoomLevel), coords2[1] /
      Math.pow(2, World.instance.maxZoomLevel - World.instance.zoomLevel)];

    const [x1, y1] = this.#intersection(coords1, coords2, arrow);
    const [x2, y2] = this.#intersection(coords2, coords1, arrow);

    this.#x1 = x1;
    this.#x2 = x2;
    this.#y1 = y1;
    this.#y2 = y2;

    this.#line.moveTo(this.#x1, this.#y1);
    this.#line.lineTo(this.#x2, this.#y2);
    World.instance.ctx.stroke(this.#line);

    const centerX = (this.#x1 + this.#x2) / 2;
    const centerY = (this.#y1 + this.#y2) / 2;

    if (showDistance) {
      World.instance.ctx.font = '12px serif';
      World.instance.ctx.fillText(this.#distance, centerX, centerY);
    }
  }

  buildArrow(source, destination) {
    const path = source === this.idPoint1 ? this.#pathArrow(this.#x1, this.#y1, this.#x2, this.#y2)
      : this.#pathArrow(this.#x2, this.#y2, this.#x1, this.#y1);

    if (typeof this.#arrowHead1 === 'undefined')
      this.#arrowHead1 = new ArrowHead(World.instance.idGenerator++, source, destination, World.instance.date, this, path);
    else
      this.#arrowHead2 = new ArrowHead(World.instance.idGenerator++, source, destination, World.instance.date, this, path);

    World.instance.ctx.fillStyle = 'black';
    World.instance.ctx.fill(path);
  }

  rebuildArrowHead(arrowHead) {
    const path = arrowHead.source === this.idPoint1 ? this.#pathArrow(this.#x1, this.#y1, this.#x2, this.#y2)
      : this.#pathArrow(this.#x2, this.#y2, this.#x1, this.#y1);

    arrowHead.path = path;

    World.instance.ctx.fill(path);
  }

  #pathArrow(fromx, fromy, tox, toy) {
    const r = Math.ceil(World.instance.zoomLevel / 2);
    const path = new Path2D();

    let angle = Math.atan2(toy - fromy, tox - fromx);
    let x = r * Math.cos(angle) + tox;
    let y = r * Math.sin(angle) + toy;

    path.moveTo(x, y);

    angle += (1 / 3) * (2 * Math.PI);
    x = r * Math.cos(angle) + tox;
    y = r * Math.sin(angle) + toy;

    path.lineTo(x, y);

    angle += (1 / 3) * (2 * Math.PI);
    x = r * Math.cos(angle) + tox;
    y = r * Math.sin(angle) + toy;

    path.lineTo(x, y);

    path.closePath();

    return path;
  }

  #intersection(coords1, coords2, arrow) {
    const x1 = coords1[0];
    const y1 = coords1[1];
    const x2 = coords2[0];
    const y2 = coords2[1];

    // line equation = y = ax + b
    const a = (y2 - y1) / (x2 - x1);
    const b = y1 - a * x1;

    const A = Math.pow(a, 2) + 1;
    const B = 2 * ((a * b) - (a * y1) - x1);
    let base = !arrow ? Math.ceil(25 - (24 / (1 + Math.exp(0.9 * (World.instance.zoomLevel - 20)))) + 2) +
      Math.ceil(World.instance.zoomLevel / 2) : Math.ceil(World.instance.zoomLevel / 2);
    const C = Math.pow(y1, 2) - Math.pow(base, 2) + Math.pow(x1, 2) - (2 * b * y1) + Math.pow(b, 2);
    const y3 = a * ((-B + Math.sqrt(Math.pow(B, 2) - 4 * A * C)) / (2 * A)) + b;
    const x3 = (y3 - b) / a;
    const y4 = a * ((-B - Math.sqrt(Math.pow(B, 2) - 4 * A * C)) / (2 * A)) + b;
    const x4 = (y4 - b) / a;

    const norm1 = Math.sqrt(Math.pow(x2 - x3, 2) + Math.pow(y2 - y3, 2));
    const norm2 = Math.sqrt(Math.pow(x2 - x4, 2) + Math.pow(y2 - y4, 2));

    return norm1 < norm2 ? [x3, y3] : [x4, y4];
  }

  toJson() {
    return {id: this.#id,
      idPoint1: this.#idPoint1,
      idPoint2: this.#idPoint2,
      arrowHead1: this.#arrowHead1?.toJson(),
      arrowHead2: this.#arrowHead2?.toJson()};
  }
}
