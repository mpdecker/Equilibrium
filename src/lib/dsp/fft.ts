/**
 * FFT helpers for spectral analysis (deterministic, no WASM dependency).
 */

export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return Math.max(p, 2);
}

export function hannWindowSample(i: number, length: number): number {
  if (length <= 1) return 1;
  return 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
}

/** Radix-2 Cooley–Tukey (recursive). Length must be a power of 2; imaginary input assumed zero. */
export function fftComplex(realInput: Float32Array): { re: Float32Array; im: Float32Array } {
  const n = realInput.length;
  if (n < 1 || (n & (n - 1)) !== 0) {
    throw new Error("FFT length must be a positive power of 2");
  }
  if (n === 1) {
    return { re: Float32Array.from([realInput[0]]), im: new Float32Array(1) };
  }

  const half = n / 2;
  const ev = new Float32Array(half);
  const od = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    ev[i] = realInput[i * 2];
    od[i] = realInput[i * 2 + 1];
  }

  const E = fftComplex(ev);
  const O = fftComplex(od);
  const re = new Float32Array(n);
  const im = new Float32Array(n);

  for (let k = 0; k < half; k++) {
    const theta = (-2 * Math.PI * k) / n;
    const wr = Math.cos(theta);
    const wi = Math.sin(theta);
    const or = O.re[k];
    const oi = O.im[k];
    const tr = or * wr - oi * wi;
    const ti = or * wi + oi * wr;
    re[k] = E.re[k] + tr;
    im[k] = E.im[k] + ti;
    re[k + half] = E.re[k] - tr;
    im[k + half] = E.im[k] - ti;
  }

  return { re, im };
}

export function magnitudeSpectrum(realSignalWindowed: Float32Array): Float32Array {
  const n = realSignalWindowed.length;
  const { re, im } = fftComplex(realSignalWindowed);
  const mags = new Float32Array(n / 2 + 1);
  for (let k = 0; k <= n / 2; k++) {
    mags[k] = Math.hypot(re[k], im[k]);
  }
  return mags;
}

/** Hann-window + pad/crop to `fftSize`, then magnitude bins 0..fftSize/2 */
export function magnitudeSpectrumFromReal(realIn: Float32Array, fftSize: number): Float32Array {
  const buf = new Float32Array(fftSize);
  const len = Math.min(realIn.length, fftSize);
  for (let i = 0; i < len; i++) {
    buf[i] = realIn[i] * hannWindowSample(i, fftSize);
  }
  return magnitudeSpectrum(buf);
}

/** Spectral centroid (Hz); skips DC and Nyquist bins */
export function spectralCentroidFromMagnitudes(
  mags: Float32Array,
  sampleRate: number,
  fftSize: number,
): number {
  let num = 0;
  let den = 0;
  const last = mags.length - 1;
  for (let k = 1; k < last; k++) {
    const f = (k * sampleRate) / fftSize;
    const p = mags[k] * mags[k];
    num += f * p;
    den += p;
  }
  return den > 1e-24 ? num / den : 0;
}
