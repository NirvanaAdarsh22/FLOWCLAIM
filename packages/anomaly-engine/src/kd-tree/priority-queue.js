/**
 * Bounded Max-Heap Priority Queue for k-nearest neighbor search.
 * Maintains up to `maxSize` elements with the smallest distances.
 * The root is always the element with the largest distance in the heap.
 */
export class BoundedMaxHeap {
  /**
   * @param {number} maxSize
   */
  constructor(maxSize) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be greater than 0');
    }
    this.maxSize = maxSize;
    /** @type {Array<{ id: any, distance: number }>} */
    this.heap = [];
  }

  /**
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * Returns the maximum distance currently in the heap.
   * If heap is not full, returns Infinity.
   * @returns {number}
   */
  maxDistance() {
    if (this.heap.length < this.maxSize) {
      return Infinity;
    }
    return this.heap[0].distance;
  }

  /**
   * Inserts an element or replaces the maximum if distance is smaller.
   * @param {any} id
   * @param {number} distance
   */
  insert(id, distance) {
    const item = { id, distance };

    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._siftUp(this.heap.length - 1);
    } else if (distance < this.heap[0].distance) {
      this.heap[0] = item;
      this._siftDown(0);
    }
  }

  /**
   * Returns all items sorted in ascending order of distance.
   * @returns {Array<{ id: any, distance: number }>}
   */
  toSortedArray() {
    return [...this.heap].sort((a, b) => a.distance - b.distance);
  }

  /**
   * @private
   * @param {number} index
   */
  _siftUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.heap[current].distance > this.heap[parent].distance) {
        this._swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  /**
   * @private
   * @param {number} index
   */
  _siftDown(index) {
    let current = index;
    const length = this.heap.length;

    while (true) {
      let largest = current;
      const left = 2 * current + 1;
      const right = 2 * current + 2;

      if (left < length && this.heap[left].distance > this.heap[largest].distance) {
        largest = left;
      }

      if (right < length && this.heap[right].distance > this.heap[largest].distance) {
        largest = right;
      }

      if (largest !== current) {
        this._swap(current, largest);
        current = largest;
      } else {
        break;
      }
    }
  }

  /**
   * @private
   */
  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
