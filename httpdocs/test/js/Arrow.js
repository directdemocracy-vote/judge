import World from './World.js';

export default class Arrow {
  #arrowHead1;
  #arrowHead2;
  #id
  #idPoint1;
  #idPoint2;
  #line;
  constructor(id, idPoint1, idPoint2) {
    this.#id = id;
    this.#idPoint1 = idPoint1;
    this.#idPoint2 = idPoint2;

    this.#line = new Path2D();
    const coords1 = World.instance.citizens.get(idPoint1).coords;
    const coords2 = World.instance.citizens.get(idPoint2).coords;
    const [x1, y1] = this.intersection(coords1, coords2);
    const [x2, y2] = this.intersection(coords2, coords1);

    this.#line.moveTo(x1, y1);
    this.#line.lineTo(x2, y2);
    World.instance.ctx.stroke(this.#line);

    this.#arrowHead1 = this.canvasArrow(x1, y1, x2, y2, World.instance.arrowSize);
    World.instance.ctx.fillStyle = "black";
    World.instance.ctx.fill(this.#arrowHead1)
  }

  get arrowHead1() {
    return this.#arrowHead1;
  }

  get line() {
    return this.#line;
  }

  canvasArrow(fromx, fromy, tox, toy, r){
    const path = new Path2D();

    let angle = Math.atan2(toy-fromy,tox-fromx)
    let x = r*Math.cos(angle) + tox;
    let y = r*Math.sin(angle) + toy;

    path.moveTo(x, y);

    angle += (1/3)*(2*Math.PI)
    x = r*Math.cos(angle) + tox;
    y = r*Math.sin(angle) + toy;

    path.lineTo(x, y);

    angle += (1/3)*(2*Math.PI)
    x = r*Math.cos(angle) + tox;
    y = r*Math.sin(angle) + toy;

    path.lineTo(x, y);

    path.closePath();

    return path
  }

  intersection(coords1, coords2, arrow){
    const x1 = coords1[0];
    const y1 = coords1[1];
    const x2 = coords2[0];
    const y2 = coords2[1];

    // line equation = y = ax + b
    const a = (y2 - y1) / (x2 - x1);
    const b = y1 - a * x1;

    const A = Math.pow(a,2) + 1;
    const B = 2*((a*b) - (a*y1) -  x1);
    const C = Math.pow(y1,2) - Math.pow(World.instance.basePointSize + World.instance.arrowSize,2) + Math.pow(x1,2) - (2*b*y1) + Math.pow(b,2);
    const y3 = a * ((-B + Math.sqrt(Math.pow(B,2) - 4 * A*C)) / (2 * A)) + b;
    const x3 = (y3 - b) / a;
    const y4 = a * ((-B - Math.sqrt(Math.pow(B,2) - 4 * A*C)) / (2 * A)) + b;
    const x4 = (y4 - b) / a;

    const norm1 = Math.sqrt(Math.pow(x2 - x3, 2) + Math.pow(y2 - y3, 2));
    const norm2 = Math.sqrt(Math.pow(x2 - x4, 2) + Math.pow(y2 - y4, 2));

    return norm1 < norm2 ? [x3, y3] : [x4, y4];
  }
}
