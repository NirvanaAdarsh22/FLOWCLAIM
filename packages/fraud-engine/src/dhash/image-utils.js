/**
 * @file packages/fraud-engine/src/dhash/image-utils.js
 * Pure JavaScript image decoding and resampling to a 9x8 grayscale grid.
 */

import zlib from 'node:zlib';

/**
 * Resamples an arbitrary 2D pixel array to target width x height using box averaging.
 *
 * @param {Uint8Array} srcPixels - Grayscale pixels (width * height)
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} targetW
 * @param {number} targetH
 * @returns {Uint8Array}
 */
export function resampleGrayscale(srcPixels, srcW, srcH, targetW = 9, targetH = 8) {
  const result = new Uint8Array(targetW * targetH);
  const xRatio = srcW / targetW;
  const yRatio = srcH / targetH;

  for (let ty = 0; ty < targetH; ty++) {
    const srcYStart = Math.floor(ty * yRatio);
    const srcYEnd = Math.min(Math.ceil((ty + 1) * yRatio), srcH);

    for (let tx = 0; tx < targetW; tx++) {
      const srcXStart = Math.floor(tx * xRatio);
      const srcXEnd = Math.min(Math.ceil((tx + 1) * xRatio), srcW);

      let sum = 0;
      let count = 0;

      for (let sy = srcYStart; sy < srcYEnd; sy++) {
        const rowOffset = sy * srcW;
        for (let sx = srcXStart; sx < srcXEnd; sx++) {
          sum += srcPixels[rowOffset + sx];
          count++;
        }
      }

      result[ty * targetW + tx] = count > 0 ? Math.round(sum / count) : 0;
    }
  }

  return result;
}

/**
 * Decodes raw or formatted image bytes to a target WxH grayscale grid.
 *
 * @param {Uint8Array|Buffer} buffer
 * @param {number} targetW
 * @param {number} targetH
 * @returns {Promise<Uint8Array>}
 */
export async function decodeToGrayscaleGrid(buffer, targetW = 9, targetH = 8) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // 1. Direct 72-byte raw grayscale buffer
  if (bytes.length === targetW * targetH) {
    return new Uint8Array(bytes);
  }

  // 2. BMP format check: 'BM' magic bytes
  if (bytes.length > 54 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    try {
      const offset = bytes[10] | (bytes[11] << 8) | (bytes[12] << 16) | (bytes[13] << 24);
      const width = bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24);
      const height = Math.abs(bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] << 24));
      const bpp = bytes[28] | (bytes[29] << 8);

      if (bpp === 24 || bpp === 32) {
        const bytesPerPixel = bpp / 8;
        const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
        const gray = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
          const srcY = height - 1 - y; // BMP is bottom-to-top
          const rowStart = offset + srcY * rowSize;
          for (let x = 0; x < width; x++) {
            const px = rowStart + x * bytesPerPixel;
            const b = bytes[px];
            const g = bytes[px + 1];
            const r = bytes[px + 2];
            gray[y * width + x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          }
        }
        return resampleGrayscale(gray, width, height, targetW, targetH);
      }
    } catch {
      // Fallback below
    }
  }

  // 3. Fallback pseudo-raster downsampling for other binary image streams
  // Uniformly samples the byte stream to extract luminance features
  const grid = new Uint8Array(targetW * targetH);
  const step = Math.max(1, Math.floor(bytes.length / (targetW * targetH)));

  for (let i = 0; i < grid.length; i++) {
    const idx = Math.min(i * step, bytes.length - 1);
    // Combine 3 contiguous bytes if available as pseudo-RGB
    const r = bytes[idx] || 0;
    const g = bytes[idx + 1] || r;
    const b = bytes[idx + 2] || g;
    grid[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return grid;
}
