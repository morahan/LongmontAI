/** A small periodic optical-depth field, generated once; no per-frame noise or pixel uploads. */
export const NEBULA_TEXTURE_SIZE = 256;
export const NEBULA_WORLD_SIZE = 2048;
export const NEBULA_DRIFT = { x: 1.15, y: -0.38 } as const;
export interface NebulaField { size: number; transmission: Float32Array }
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };
const wrap = (n: number, period: number) => ((n % period) + period) % period;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const noise = (seed: number, x: number, y: number, period: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const hash = (a: number, b: number) => {
        let h = seed ^ Math.imul(wrap(a, period), 374761393)
            ^ Math.imul(wrap(b, period), 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    return mix(mix(hash(ix, iy), hash(ix + 1, iy), smooth(x - ix)),
        mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), smooth(x - ix)), smooth(y - iy));
};

export const createNebulaField = (seed: number): NebulaField => {
    const size = NEBULA_TEXTURE_SIZE;
    const transmission = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const u = x / size;
            const v = y / size;
            // Periodic domain warping breaks the lattice into winding banks and wispy inlets.
            const wx = u + (noise(seed ^ 91, u * 3, v * 3, 3) - 0.5) * 0.24;
            const wy = v + (noise(seed ^ 173, u * 3, v * 3, 3) - 0.5) * 0.24;
            let density = 0;
            for (let octave = 0; octave < 5; octave += 1) {
                const frequency = 8 * 2 ** octave;
                density += noise(seed + octave * 103, wx * frequency, wy * frequency, frequency)
                    * 0.5 ** (octave + 1);
            }
            const column = smooth((density - 0.27) / 0.43);
            transmission[y * size + x] = Math.exp(-3.8 * column);
        }
    }
    return { size, transmission };
};

/** Opaque neutral dust tone; light is exceptional, never a full-field haze.
 * One seeded soft trace per 16×16 texel cell, with radius <= 2 texels.
 * Even bilinear support occupies at most 6×6 / 16×16 (<15%) of a cell.
 * Optical transmission remains independent: black banks still absorb stellar light.
 */
export const NEBULA_MAX_CHARCOAL = 4;
export const getNebulaTexelRgba = (seed: number, x: number, y: number, transmission: number) => {
    const cell = 16;
    const tx = wrap(x, NEBULA_TEXTURE_SIZE);
    const ty = wrap(y, NEBULA_TEXTURE_SIZE);
    let hash = seed ^ Math.imul(Math.floor(tx / cell), 374761393)
        ^ Math.imul(Math.floor(ty / cell), 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
    const cx = 4 + (hash & 7);
    const cy = 4 + ((hash >>> 3) & 7);
    const distance = Math.hypot(tx % cell - cx, ty % cell - cy);
    const tone = Math.round(NEBULA_MAX_CHARCOAL * smooth(1 - distance / 2)
        * smooth((transmission - 0.35) / 0.65));
    return [tone, tone, tone, 255] as const;
};

export const getNebulaOffset = (seconds: number, reducedMotion = false) => {
    const time = reducedMotion ? 0 : Math.max(0, seconds);
    return { x: wrap(time * NEBULA_DRIFT.x, NEBULA_WORLD_SIZE),
        y: wrap(time * NEBULA_DRIFT.y, NEBULA_WORLD_SIZE) };
};

/** Same texel centers, wrap and bilinear interpolation as the rendered cloud texture. */
export const sampleNebulaTransmission = (
    field: NebulaField, x: number, y: number, seconds: number, reducedMotion = false,
) => {
    const offset = getNebulaOffset(seconds, reducedMotion);
    const u = wrap((x - offset.x) / NEBULA_WORLD_SIZE * field.size - 0.5, field.size);
    const v = wrap((y - offset.y) / NEBULA_WORLD_SIZE * field.size - 0.5, field.size);
    const ix = Math.floor(u);
    const iy = Math.floor(v);
    const at = (a: number, b: number) => field.transmission[wrap(b, field.size) * field.size + wrap(a, field.size)];
    return mix(mix(at(ix, iy), at(ix + 1, iy), u - ix),
        mix(at(ix, iy + 1), at(ix + 1, iy + 1), u - ix), v - iy);
};

/** Beer–Lambert extinction through a finite mist slab: near stars are entirely in front. */
export const getNebulaDepthTransmission = (backgroundTransmission: number, normalizedDepth: number) =>
    Math.max(0.001, clamp01(backgroundTransmission)) ** smooth((normalizedDepth - 0.16) / 0.72);

/** Text lifts continuously out of the cloud bank without altering intrinsic twinkle/opacity. */
export const getNebulaTextTransmission = (backgroundTransmission: number, strength: number) =>
    mix(backgroundTransmission, 1, smooth(strength));
