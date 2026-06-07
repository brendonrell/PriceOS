/*
 * Natal Chart — PD platform trait. Every Output is "born" at its mint moment;
 * we read the sky over Montreal at that instant and surface the Output's
 * astrological Sun, Moon, and Rising (Ascendant) signs. (Atlas: Output Page /
 * Celestial layer / Natal Chart — birthplace fixed to Montreal for all Outputs.)
 *
 * Unlike Fate (seeded from the Output's identity), the Natal Chart is a pure
 * function of the MINT TIMESTAMP — so it must be computed wherever that
 * timestamp is known (the mint event), not from (slug, tokenId) alone.
 *
 * Math: low-precision astronomy (Paul Schlyter's "Computing planetary
 * positions"), accurate to a fraction of a degree — far inside the 30°-wide
 * zodiac signs. Sun + Moon ecliptic longitudes and the Ascendant are derived
 * from the same epoch day-count `d`, so they stay mutually consistent. This is
 * a flavour trait, not an ephemeris product — sign-level accuracy is the bar.
 */

/* Montreal — the fixed birthplace for every Output's chart. */
const LAT = 45.5019;
const LON = -73.5674; // east-positive (Montreal is west → negative)

export const ZODIAC: readonly string[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export interface NatalChart {
  sun: string;
  moon: string;
  rising: string;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;
const sind = (x: number) => Math.sin(x * D2R);
const cosd = (x: number) => Math.cos(x * D2R);
const tand = (x: number) => Math.tan(x * D2R);
const signOf = (lonDeg: number) => ZODIAC[Math.floor(norm360(lonDeg) / 30)];

/** Julian Day (incl. fractional UT) from a Unix epoch in milliseconds. */
function julianDay(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/**
 * Compute the Sun, Moon, and Rising signs for a mint timestamp (ms since
 * epoch). All three share Schlyter's day-count `d = JD − 2451543.5`.
 */
export function natalChart(ms: number): NatalChart {
  const jd = julianDay(ms);
  const d = jd - 2451543.5; // Schlyter epoch: 1999-12-31 00:00 UT
  const ut =
    (((ms % 86400000) + 86400000) % 86400000) / 3600000; // UT hours of day

  const oblecl = 23.4393 - 3.563e-7 * d;

  // ── Sun ──────────────────────────────────────────────────────────────
  const ws = 282.9404 + 4.70935e-5 * d; // longitude of perihelion
  const es = 0.016709 - 1.151e-9 * d; // eccentricity
  const Ms = norm360(356.047 + 0.9856002585 * d); // mean anomaly
  const Ls = norm360(ws + Ms); // sun's mean longitude
  const Esun = Ms + es * R2D * sind(Ms) * (1 + es * cosd(Ms));
  const xs = cosd(Esun) - es;
  const ys = Math.sqrt(1 - es * es) * sind(Esun);
  const vsun = Math.atan2(ys, xs) * R2D;
  const sunLon = norm360(vsun + ws);

  // ── Moon ─────────────────────────────────────────────────────────────
  const Nm = 125.1228 - 0.0529538083 * d; // ascending node
  const im = 5.1454; // inclination
  const wm = 318.0634 + 0.1643573223 * d; // arg of perigee
  const am = 60.2666; // mean distance (Earth radii)
  const em = 0.0549; // eccentricity
  const Mm = norm360(115.3654 + 13.0649929509 * d); // mean anomaly
  // Eccentric anomaly (two iterations is plenty at this precision).
  let Em = Mm + em * R2D * sind(Mm) * (1 + em * cosd(Mm));
  Em = Em - (Em - em * R2D * sind(Em) - Mm) / (1 - em * cosd(Em));
  const xm = am * (cosd(Em) - em);
  const ym = am * Math.sqrt(1 - em * em) * sind(Em);
  const rm = Math.sqrt(xm * xm + ym * ym);
  const vm = Math.atan2(ym, xm) * R2D;
  // Ecliptic longitude of the Moon (geocentric, before perturbations).
  const xec = rm * (cosd(Nm) * cosd(vm + wm) - sind(Nm) * sind(vm + wm) * cosd(im));
  const yec = rm * (sind(Nm) * cosd(vm + wm) + cosd(Nm) * sind(vm + wm) * cosd(im));
  let moonLon = Math.atan2(yec, xec) * R2D;
  // Perturbations (Schlyter's principal terms — the ones that matter for signs).
  const Lm = norm360(Nm + wm + Mm); // Moon's mean longitude
  const Dm = norm360(Lm - Ls); // mean elongation
  const Fm = norm360(Lm - Nm); // argument of latitude
  moonLon +=
    -1.274 * sind(Mm - 2 * Dm) +
    0.658 * sind(2 * Dm) +
    -0.186 * sind(Ms) +
    -0.059 * sind(2 * Mm - 2 * Dm) +
    -0.057 * sind(Mm - 2 * Dm + Ms) +
    0.053 * sind(Mm + 2 * Dm) +
    0.046 * sind(2 * Dm - Ms) +
    0.041 * sind(Mm - Ms) +
    -0.035 * sind(Dm) +
    -0.031 * sind(Mm + Ms) +
    -0.015 * sind(2 * Fm - 2 * Dm) +
    0.011 * sind(Mm - 4 * Dm);
  moonLon = norm360(moonLon);

  // ── Rising (Ascendant) ───────────────────────────────────────────────
  // Local sidereal time → RAMC, then the ecliptic longitude rising over the
  // eastern horizon at Montreal's latitude.
  const gmst0 = norm360(Ls + 180); // Schlyter: sidereal time at 0h
  const lst = norm360(gmst0 + ut * 15.0410686 + LON);
  const ramc = lst * D2R;
  const eps = oblecl * D2R;
  const lat = LAT * D2R;
  let asc =
    Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps)),
    ) * R2D;
  asc = norm360(asc);

  return { sun: signOf(sunLon), moon: signOf(moonLon), rising: signOf(asc) };
}
