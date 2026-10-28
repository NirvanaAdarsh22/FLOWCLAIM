import { euclideanDistance } from '../distance/euclidean.js';
import { BoundedMaxHeap } from './priority-queue.js';

/**
 * Node in a k-dimensional tree.
 */
class KDTreeNode {
  /**
   * @param {number[]} point
   * @param {any} id
   * @param {number} axis
   */
  constructor(point, id, axis) {
    this.point = point;
    this.id = id;
    this.axis = axis;
    /** @type {KDTreeNode | null} */
    this.left = null;
    /** @type {KDTreeNode | null} */
    this.right = null;
  }
}

/**
 * Multi-dimensional space partitioning tree for exact k-nearest neighbor search.
 */
export class KDTree {
  /**
   * @param {KDTreeNode | null} root
   * @param {number} dimensions
   */
  constructor(root, dimensions) {
    this.root = root;
    this.dimensions = dimensions;
  }

  /**
   * Finds the k nearest neighbors to a query point in ascending order of distance.
   * @param {number[]} queryPoint
   * @param {number} k
   * @returns {Array<{ id: any, distance: number }>}
   */
  nearest(queryPoint, k) {
    if (!this.root || k <= 0) {
      return [];
    }

    if (queryPoint.length !== this.dimensions) {
      throw new Error(`Query point dimension (${queryPoint.length}) does not match tree dimension (${this.dimensions})`);
    }

    const heap = new BoundedMaxHeap(k);
    this._searchNode(this.root, queryPoint, heap);
    return heap.toSortedArray();
  }

  /**
   * @private
   * @param {KDTreeNode | null} node
   * @param {number[]} queryPoint
   * @param {BoundedMaxHeap} heap
   */
  _searchNode(node, queryPoint, heap) {
    if (!node) {
      return;
    }

    // 1. Calculate distance from query point to current node
    const distance = euclideanDistance(queryPoint, node.point);
    heap.insert(node.id, distance);

    const axis = node.axis;
    const diff = queryPoint[axis] - node.point[axis];

    // 2. Decide search order: near branch first, then far branch if needed
    const nearChild = diff < 0 ? node.left : node.right;
    const farChild = diff < 0 ? node.right : node.left;

    this._searchNode(nearChild, queryPoint, heap);

    // 3. Pruning: only explore the far child if the hyperplane intersects the search hypersphere
    const distanceToHyperplane = Math.abs(diff);
    if (distanceToHyperplane < heap.maxDistance()) {
      this._searchNode(farChild, queryPoint, heap);
    }
  }
}

/**
 * Builds a balanced KD-Tree from an array of multi-dimensional points and corresponding IDs.
 * @param {number[][]} points - Array of numeric coordinate vectors
 * @param {any[]} ids - Array of identifiers for each point
 * @returns {KDTree}
 */
export function buildKDTree(points, ids) {
  if (!points || !ids) {
    throw new Error('Points and IDs must be provided');
  }

  if (points.length !== ids.length) {
    throw new Error(`Length mismatch: points (${points.length}) and ids (${ids.length}) must match`);
  }

  if (points.length === 0) {
    return new KDTree(null, 0);
  }

  const dimensions = points[0].length;
  for (let i = 0; i < points.length; i++) {
    if (points[i].length !== dimensions) {
      throw new Error(`Inconsistent point dimensions at index ${i}: expected ${dimensions}, got ${points[i].length}`);
    }
  }

  // Combine items to keep point and id together during sorting
  const items = points.map((point, index) => ({
    point,
    id: ids[index]
  }));

  function buildSubtree(elements, depth) {
    if (elements.length === 0) {
      return null;
    }

    const axis = depth % dimensions;

    // Sort by current axis
    elements.sort((a, b) => a.point[axis] - b.point[axis]);

    // Choose median
    const medianIndex = Math.floor(elements.length / 2);
    const medianItem = elements[medianIndex];

    const node = new KDTreeNode(medianItem.point, medianItem.id, axis);
    node.left = buildSubtree(elements.slice(0, medianIndex), depth + 1);
    node.right = buildSubtree(elements.slice(medianIndex + 1), depth + 1);

    return node;
  }

  const root = buildSubtree(items, 0);
  return new KDTree(root, dimensions);
}
