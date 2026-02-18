import jpeg from 'jpeg-js';

type QualityResult = {
  brightness: number;
  blurScore: number;
  edgeDensity: number;
};

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Base64 decoder not available');
  }
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJpeg(base64: string) {
  const bytes = base64ToUint8Array(base64);
  return jpeg.decode(bytes, { useTArray: true });
}

export function analyzeFrameBase64(base64: string): QualityResult {
  const decoded = decodeJpeg(base64);
  const { width, height, data } = decoded;

  let sumLuma = 0;
  let count = 0;
  const step = 4 * 4; // sample every 4 pixels (RGBA)

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumLuma += luma;
    count += 1;
  }
  const brightness = count > 0 ? sumLuma / count : 0;

  // Simple blur score: variance of Laplacian on a downsampled grid.
  // We'll sample every 8 pixels for speed.
  const stride = width * 4;
  const sampleStep = 8;
  const laplacians: number[] = [];

  for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
    for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const idxL = (y * width + (x - sampleStep)) * 4;
      const idxR = (y * width + (x + sampleStep)) * 4;
      const idxU = ((y - sampleStep) * width + x) * 4;
      const idxD = ((y + sampleStep) * width + x) * 4;

      const center = data[idx];
      const left = data[idxL];
      const right = data[idxR];
      const up = data[idxU];
      const down = data[idxD];

      const lap = -4 * center + left + right + up + down;
      laplacians.push(lap);
    }
  }

  let mean = 0;
  for (const v of laplacians) {
    mean += v;
  }
  mean = laplacians.length ? mean / laplacians.length : 0;

  let variance = 0;
  for (const v of laplacians) {
    const diff = v - mean;
    variance += diff * diff;
  }
  const blurScore = laplacians.length ? variance / laplacians.length : 0;

  // Basic edge density via gradient magnitude threshold on sampled grid.
  let edgeCount = 0;
  let sampleCount = 0;
  const edgeStep = 6;
  const edgeThreshold = 28;
  for (let y = edgeStep; y < height - edgeStep; y += edgeStep) {
    for (let x = edgeStep; x < width - edgeStep; x += edgeStep) {
      const idx = (y * width + x) * 4;
      const idxR = (y * width + (x + edgeStep)) * 4;
      const idxD = ((y + edgeStep) * width + x) * 4;
      const gx = data[idxR] - data[idx];
      const gy = data[idxD] - data[idx];
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > edgeThreshold) {
        edgeCount += 1;
      }
      sampleCount += 1;
    }
  }
  const edgeDensity = sampleCount ? edgeCount / sampleCount : 0;

  return { brightness, blurScore, edgeDensity };
}
