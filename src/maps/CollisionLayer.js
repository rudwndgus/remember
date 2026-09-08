/** Polygon/line object data -> a merged set of solid Arcade rectangles.
 * A 2px scanline grid preserves diagonal edges and thin fences. Shared/overlapping
 * objects are unioned before merging, avoiding duplicate collision seams.
 * No GPU reads, image segmentation heuristics or extra raster assets at runtime.
 */
export default class CollisionLayer {
  constructor(objects, width, height, cellSize = 2) {
    this.objects = objects;
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.columns = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.solid = new Uint8Array(this.columns * this.rows);
    for (const object of objects) {
      if (object.thickness) this.rasterizeLine(object);
      else this.rasterizePolygon(object.points);
    }
    this.rectangles = this.mergeRows();
  }

  rasterizeLine({ points, thickness }) {
    const radius = thickness / 2;
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      const length = Math.hypot(x2 - x1, y2 - y1);
      if (!length) continue;
      const nx = -(y2 - y1) / length * radius;
      const ny = (x2 - x1) / length * radius;
      this.rasterizePolygon([[x1 + nx,y1 + ny],[x2 + nx,y2 + ny],[x2 - nx,y2 - ny],[x1 - nx,y1 - ny]]);
    }
    // Close segment joins/endcaps, including corners on a diagonal fence.
    for (const [x, y] of points) {
      this.rasterizePolygon([[x-radius,y-radius],[x+radius,y-radius],[x+radius,y+radius],[x-radius,y+radius]]);
    }
  }

  rasterizePolygon(points) {
    const cell = this.cellSize;
    const firstRow = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1])) / cell));
    const lastRow = Math.min(this.rows - 1, Math.ceil(Math.max(...points.map((p) => p[1])) / cell) - 1);
    for (let row = firstRow; row <= lastRow; row++) {
      const y = row * cell + cell / 2;
      const intersections = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[j];
        const [bx, by] = points[i];
        if ((ay > y) !== (by > y)) intersections.push(ax + (y - ay) * (bx - ax) / (by - ay));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const from = Math.max(0, Math.floor(intersections[i] / cell));
        const to = Math.min(this.columns, Math.ceil(intersections[i + 1] / cell));
        this.solid.fill(1, row * this.columns + from, row * this.columns + to);
      }
    }
  }

  mergeRows() {
    const rectangles = [];
    let previous = new Map();
    for (let row = 0; row < this.rows; row++) {
      const current = new Map();
      for (let column = 0; column < this.columns;) {
        if (!this.solid[row * this.columns + column]) { column++; continue; }
        const start = column;
        while (column < this.columns && this.solid[row * this.columns + column]) column++;
        const key = `${start}:${column}`;
        let rectangle = previous.get(key);
        if (rectangle) rectangle.height += this.cellSize;
        else {
          rectangle = { x: start * this.cellSize, y: row * this.cellSize, width: (column - start) * this.cellSize, height: this.cellSize };
          rectangles.push(rectangle);
        }
        current.set(key, rectangle);
      }
      previous = current;
    }
    return rectangles;
  }

  isBlocked(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.solid[Math.floor(y / this.cellSize) * this.columns + Math.floor(x / this.cellSize)] === 1;
  }

  overlaps(x, y, width, height) {
    const cell = this.cellSize;
    for (let row = Math.floor(y / cell); row < Math.ceil((y + height) / cell); row++) {
      for (let col = Math.floor(x / cell); col < Math.ceil((x + width) / cell); col++) {
        if (col < 0 || row < 0 || col >= this.columns || row >= this.rows || this.solid[row * this.columns + col]) return true;
      }
    }
    return false;
  }
}
