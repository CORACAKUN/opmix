export const CLIPPING_THRESHOLD = 0.98;

export function getPeakLevel(samples) {
  if (!samples?.length) {
    return 0;
  }

  let peak = 0;

  for (const sample of samples) {
    const normalized = Math.abs((sample - 128) / 128);
    peak = Math.max(peak, normalized);
  }

  return Math.min(1, peak);
}

export function isClipping(peak, threshold = CLIPPING_THRESHOLD) {
  return peak >= threshold;
}
