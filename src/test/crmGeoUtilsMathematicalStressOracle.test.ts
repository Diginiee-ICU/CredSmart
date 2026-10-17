import { describe, it, expect } from "vitest";
import {
  EARTH_RADIUS_METERS,
  calculateHaversineDistance,
  isWithinGeofence,
  isValidCoordinate,
} from "@/utils/crmGeoUtils";

/**
 * ============================================================================
 * INDEPENDENT MATHEMATICAL ORACLES
 * ============================================================================
 */

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Oracle 1: Spherical Vincenty Formula
 * Special case of Vincenty's formula for a sphere (ellipsoid with a = b = R).
 * Widely considered the most numerically stable formulation for spherical geodesics,
 * accurate at all distances from 0 to antipodes.
 */
function vincentyDistanceOracle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    (lat1 === lat2 && lon1 === lon2) ||
    (Math.abs(lat1) === 90 && lat1 === lat2)
  ) {
    return 0;
  }

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const cosPhi1 = Math.cos(phi1);
  const sinPhi1 = Math.sin(phi1);
  const cosPhi2 = Math.cos(phi2);
  const sinPhi2 = Math.sin(phi2);
  const cosDeltaLambda = Math.cos(deltaLambda);
  const sinDeltaLambda = Math.sin(deltaLambda);

  const term1 = cosPhi2 * sinDeltaLambda;
  const term2 = cosPhi1 * sinPhi2 - sinPhi1 * cosPhi2 * cosDeltaLambda;
  const numerator = Math.sqrt(term1 * term1 + term2 * term2);
  const denominator = sinPhi1 * sinPhi2 + cosPhi1 * cosPhi2 * cosDeltaLambda;

  const deltaSigma = Math.atan2(numerator, denominator);
  return EARTH_RADIUS_METERS * deltaSigma;
}

/**
 * Oracle 2: 3D Cartesian Vector Chord-to-Arc Oracle
 * Converts spherical coordinates to 3D unit Euclidean vectors:
 * v = (cos(phi)*cos(lambda), cos(phi)*sin(lambda), sin(phi))
 * Chord length k = ||v2 - v1||
 * Central angle deltaSigma = 2 * asin(clamp(k / 2, 0, 1))
 */
function chordVectorDistanceOracle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    (lat1 === lat2 && lon1 === lon2) ||
    (Math.abs(lat1) === 90 && lat1 === lat2)
  ) {
    return 0;
  }

  const phi1 = toRad(lat1);
  const lam1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const lam2 = toRad(lon2);

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const chord = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const halfChord = Math.min(1, Math.max(0, chord / 2));
  const deltaSigma = 2 * Math.asin(halfChord);

  return EARTH_RADIUS_METERS * deltaSigma;
}

/**
 * Oracle 3: Vector Dot & Cross Product Angle Oracle
 * deltaSigma = atan2(||v1 x v2||, v1 . v2)
 */
function vectorCrossDotOracle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    (lat1 === lat2 && lon1 === lon2) ||
    (Math.abs(lat1) === 90 && lat1 === lat2)
  ) {
    return 0;
  }

  const phi1 = toRad(lat1);
  const lam1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const lam2 = toRad(lon2);

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dot = x1 * x2 + y1 * y2 + z1 * z2;
  const crossX = y1 * z2 - z1 * y2;
  const crossY = z1 * x2 - x1 * z2;
  const crossZ = x1 * y2 - y1 * x2;
  const crossNorm = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);

  const deltaSigma = Math.atan2(crossNorm, dot);
  return EARTH_RADIUS_METERS * deltaSigma;
}

describe("Empirical Challenger M2: Geo Location Calculation Engine Stress & Oracle Suite", () => {
  const PI = Math.PI;
  const HALF_EARTH_CIRCUMFERENCE = EARTH_RADIUS_METERS * PI; // ~20,015,086.796 m
  const QUARTER_EARTH_CIRCUMFERENCE = (EARTH_RADIUS_METERS * PI) / 2; // ~10,007,543.398 m

  // ==========================================================================
  // 1. EXTREME EDGE CASES
  // ==========================================================================
  describe("Task 1: Extreme Edge Cases Stress-Testing", () => {
    describe("1.1 Antipodal Points (Opposite Sides of Earth)", () => {
      it("accurately computes North Pole to South Pole as exact half circumference", () => {
        // (90, 0) to (-90, 0)
        const d1 = calculateHaversineDistance(90, 0, -90, 0);
        expect(d1).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);
        expect(Number.isNaN(d1)).toBe(false);

        // North pole at arbitrary lon to South pole at arbitrary lon
        const d2 = calculateHaversineDistance(90, 137.5, -90, -42.5);
        expect(d2).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);

        const d3 = calculateHaversineDistance(90, -180, -90, 180);
        expect(d3).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);
      });

      it("accurately computes Equator antipodal points", () => {
        // (0, 0) to (0, 180)
        const d1 = calculateHaversineDistance(0, 0, 0, 180);
        expect(d1).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);

        // (0, 0) to (0, -180)
        const d2 = calculateHaversineDistance(0, 0, 0, -180);
        expect(d2).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);

        // (0, 45) to (0, -135)
        const d3 = calculateHaversineDistance(0, 45, 0, -135);
        expect(d3).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);

        // (0, -90) to (0, 90)
        const d4 = calculateHaversineDistance(0, -90, 0, 90);
        expect(d4).toBeCloseTo(HALF_EARTH_CIRCUMFERENCE, 3);
      });

      it("accurately computes arbitrary non-trivial antipodal coordinates across multiple latitudes", () => {
        const testAntipodes: [number, number][] = [
          [45, 60], // Antipode: (-45, -120)
          [-30, 150], // Antipode: (30, -30)
          [70, -170], // Antipode: (-70, 10)
          [12.9716, 77.5946], // Bangalore antipode: (-12.9716, -102.4054)
          [40.7128, -74.006], // NYC antipode: (-40.7128, 105.994)
          [-33.8688, 151.2093], // Sydney antipode: (33.8688, -28.7907)
        ];

        for (const [lat, lon] of testAntipodes) {
          const antiLat = -lat;
          let antiLon = lon > 0 ? lon - 180 : lon + 180;
          if (antiLon === -180) antiLon = 180;

          const distance = calculateHaversineDistance(lat, lon, antiLat, antiLon);
          expect(Number.isNaN(distance)).toBe(false);
          // IEEE 754 precision limit: near a = 1, d(sqrt(1-a))/da -> infty, so sqrt(eps) ~ 1e-8 rad ~ 0.14m on Earth
          expect(Math.abs(distance - HALF_EARTH_CIRCUMFERENCE)).toBeLessThan(0.2);

          // Verify with independent Vincenty oracle (within 0.2 meters)
          const oracleDist = vincentyDistanceOracle(lat, lon, antiLat, antiLon);
          expect(Math.abs(distance - oracleDist)).toBeLessThan(0.2);
        }
      });
    });

    describe("1.2 Identical Points", () => {
      it("returns exact 0 meters for identical points across diverse coordinates", () => {
        const points: [number, number][] = [
          [0, 0],
          [12.9716, 77.5946],
          [-33.8688, 151.2093],
          [51.5074, -0.1278],
          [89.999999, 179.999999],
          [-89.999999, -179.999999],
        ];

        for (const [lat, lon] of points) {
          expect(calculateHaversineDistance(lat, lon, lat, lon)).toBe(0);
        }
      });

      it("returns exact 0 meters for all polar longitude convergence points", () => {
        // At North Pole (lat = 90), any longitude is the exact same point
        expect(calculateHaversineDistance(90, 0, 90, 180)).toBe(0);
        expect(calculateHaversineDistance(90, -180, 90, 180)).toBe(0);
        expect(calculateHaversineDistance(90, -45, 90, 120)).toBe(0);

        // At South Pole (lat = -90), any longitude is the exact same point
        expect(calculateHaversineDistance(-90, 0, -90, 180)).toBe(0);
        expect(calculateHaversineDistance(-90, -180, -90, 180)).toBe(0);
        expect(calculateHaversineDistance(-90, -60, -90, 75)).toBe(0);
      });

      it("does not return 0 when comparing North Pole to South Pole", () => {
        expect(calculateHaversineDistance(90, 0, -90, 0)).toBeCloseTo(
          HALF_EARTH_CIRCUMFERENCE,
          3
        );
        expect(calculateHaversineDistance(90, 45, -90, 45)).toBeCloseTo(
          HALF_EARTH_CIRCUMFERENCE,
          3
        );
      });
    });

    describe("1.3 Equator to Pole", () => {
      it("accurately computes Equator to Pole as exact quarter circumference", () => {
        // (0, 0) to (90, 0)
        const d1 = calculateHaversineDistance(0, 0, 90, 0);
        expect(d1).toBeCloseTo(QUARTER_EARTH_CIRCUMFERENCE, 3);

        // (0, 90) to (90, 0) - longitude at pole does not affect distance
        const d2 = calculateHaversineDistance(0, 90, 90, 0);
        expect(d2).toBeCloseTo(QUARTER_EARTH_CIRCUMFERENCE, 3);

        // (0, -180) to (-90, 0) - Equator to South Pole
        const d3 = calculateHaversineDistance(0, -180, -90, 0);
        expect(d3).toBeCloseTo(QUARTER_EARTH_CIRCUMFERENCE, 3);

        // (0, 123.456) to (90, -45.678)
        const d4 = calculateHaversineDistance(0, 123.456, 90, -45.678);
        expect(d4).toBeCloseTo(QUARTER_EARTH_CIRCUMFERENCE, 3);
      });
    });

    describe("1.4 Crossing Antimeridian (179° to -179°)", () => {
      it("computes the shortest great circle arc across the 180° meridian (179 to -179)", () => {
        // Equator: (0, 179) to (0, -179) -> 2 degrees separation
        const dEquator = calculateHaversineDistance(0, 179, 0, -179);
        const expected2Deg = 2 * ((EARTH_RADIUS_METERS * Math.PI) / 180); // ~222,389.85 m
        expect(dEquator).toBeCloseTo(expected2Deg, 2);

        // Reverse direction: (0, -179) to (0, 179)
        const dEquatorRev = calculateHaversineDistance(0, -179, 0, 179);
        expect(dEquatorRev).toBeCloseTo(expected2Deg, 2);
      });

      it("handles micro-separation across the 180° meridian (179.9999° to -179.9999°)", () => {
        // Delta lon = 0.0002 degrees = ~22.24 meters
        const dMicro = calculateHaversineDistance(0, 179.9999, 0, -179.9999);
        const expectedMicro = 0.0002 * ((EARTH_RADIUS_METERS * Math.PI) / 180);
        expect(dMicro).toBeCloseTo(expectedMicro, 3);
      });

      it("handles exact meridian boundary points (+180 and -180 are identical longitude)", () => {
        // Point at (0, 180) and (0, -180) are physically the same point on Earth
        const dBoundary = calculateHaversineDistance(0, 180, 0, -180);
        expect(dBoundary).toBeCloseTo(0, 4);
      });

      it("handles antimeridian crossing with high latitude and diagonal components", () => {
        // (60°N, 179°E) to (60°N, -179°W)
        const dHighLat = calculateHaversineDistance(60, 179, 60, -179);
        const oracleHighLat = vincentyDistanceOracle(60, 179, 60, -179);
        expect(dHighLat).toBeCloseTo(oracleHighLat, 2);

        // Diagonal crossing: (10°N, 179°E) to (-15°S, -178°W)
        const dDiag = calculateHaversineDistance(10, 179, -15, -178);
        const oracleDiag = vincentyDistanceOracle(10, 179, -15, -178);
        expect(dDiag).toBeCloseTo(oracleDiag, 2);
      });
    });
  });

  // ==========================================================================
  // 2. INDEPENDENT MATHEMATICAL ORACLE VALIDATION
  // ==========================================================================
  describe("Task 2: Independent Mathematical Oracle Calculations", () => {
    it("matches Vincenty Oracle, Chord Vector Oracle, and Cross-Dot Oracle across 1,000 pseudo-random coordinate pairs", () => {
      // Deterministic PRNG (Linear Congruential Generator) for reproducible pseudo-random numbers
      let seed = 123456789;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      let maxDifferenceMeters = 0;

      for (let i = 0; i < 1000; i++) {
        // Generate uniform lat in [-90, 90] and lon in [-180, 180]
        const lat1 = rnd() * 180 - 90;
        const lon1 = rnd() * 360 - 180;
        const lat2 = rnd() * 180 - 90;
        const lon2 = rnd() * 360 - 180;

        const dHaversine = calculateHaversineDistance(lat1, lon1, lat2, lon2);
        const dVincenty = vincentyDistanceOracle(lat1, lon1, lat2, lon2);
        const dChord = chordVectorDistanceOracle(lat1, lon1, lat2, lon2);
        const dCrossDot = vectorCrossDotOracle(lat1, lon1, lat2, lon2);

        // Compare Haversine vs Vincenty Oracle
        const diffVincenty = Math.abs(dHaversine - dVincenty);
        const diffChord = Math.abs(dHaversine - dChord);
        const diffCrossDot = Math.abs(dHaversine - dCrossDot);

        if (diffVincenty > maxDifferenceMeters) {
          maxDifferenceMeters = diffVincenty;
        }

        // Must agree within 0.01 meters (1 centimeter) across global distances up to 20,000 km!
        expect(diffVincenty).toBeLessThan(0.01);
        expect(diffChord).toBeLessThan(0.01);
        expect(diffCrossDot).toBeLessThan(0.01);
      }

      // Max discrepancy observed over 1,000 random points across the globe is sub-millimeter
      expect(maxDifferenceMeters).toBeLessThan(0.005);
    });

    it("matches all oracles on major intercontinental city pairs", () => {
      const cityPairs: {
        name: string;
        lat1: number;
        lon1: number;
        lat2: number;
        lon2: number;
      }[] = [
        {
          name: "London to Paris",
          lat1: 51.5074,
          lon1: -0.1278,
          lat2: 48.8566,
          lon2: 2.3522,
        },
        {
          name: "Tokyo to Sydney",
          lat1: 35.6762,
          lon1: 139.6503,
          lat2: -33.8688,
          lon2: 151.2093,
        },
        {
          name: "New York to Singapore",
          lat1: 40.7128,
          lon1: -74.006,
          lat2: 1.3521,
          lon2: 103.8198,
        },
        {
          name: "San Francisco to Honolulu",
          lat1: 37.7749,
          lon1: -122.4194,
          lat2: 21.3069,
          lon2: -157.8583,
        },
        {
          name: "Bangalore to New York",
          lat1: 12.9716,
          lon1: 77.5946,
          lat2: 40.7128,
          lon2: -74.006,
        },
      ];

      for (const pair of cityPairs) {
        const dHaversine = calculateHaversineDistance(
          pair.lat1,
          pair.lon1,
          pair.lat2,
          pair.lon2
        );
        const dVincenty = vincentyDistanceOracle(
          pair.lat1,
          pair.lon1,
          pair.lat2,
          pair.lon2
        );
        const dChord = chordVectorDistanceOracle(
          pair.lat1,
          pair.lon1,
          pair.lat2,
          pair.lon2
        );

        expect(Math.abs(dHaversine - dVincenty)).toBeLessThan(0.001); // Sub-millimeter agreement
        expect(Math.abs(dHaversine - dChord)).toBeLessThan(0.001);
      }
    });
  });

  // ==========================================================================
  // 3. BOUNDARY CASES FOR isWithinGeofence
  // ==========================================================================
  describe("Task 3: Boundary Cases for isWithinGeofence (Exact, 1mm inside, 1mm outside)", () => {
    const officeLat = 12.9716;
    const officeLon = 77.5946;
    const radiusMeters = 150;

    // 1 meter in degrees latitude = 1 / ((EARTH_RADIUS_METERS * PI) / 180)
    const METERS_TO_LAT_DEG = 180 / (EARTH_RADIUS_METERS * Math.PI);
    const ONE_MM_IN_METERS = 0.001;

    it("verifies exact boundary condition (distance === radius) evaluates to TRUE", () => {
      // Offset by exact radiusMeters north
      const userLat = officeLat + radiusMeters * METERS_TO_LAT_DEG;
      const userLon = officeLon;

      const computedDist = calculateHaversineDistance(
        userLat,
        userLon,
        officeLat,
        officeLon
      );
      expect(computedDist).toBeCloseTo(radiusMeters, 5);

      // When radius is set to the exact computed distance, distance === radius
      expect(isWithinGeofence(userLat, userLon, officeLat, officeLon, computedDist)).toBe(
        true
      );
    });

    it("verifies 1mm INSIDE boundary evaluates to TRUE", () => {
      // Target distance: radiusMeters - 0.001m (149.999m)
      const insideDistance = radiusMeters - ONE_MM_IN_METERS;
      const userLat = officeLat + insideDistance * METERS_TO_LAT_DEG;
      const userLon = officeLon;

      const computedDist = calculateHaversineDistance(
        userLat,
        userLon,
        officeLat,
        officeLon
      );
      expect(computedDist).toBeLessThan(radiusMeters);
      expect(computedDist).toBeCloseTo(149.999, 4);

      expect(isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters)).toBe(
        true
      );
    });

    it("verifies 1mm OUTSIDE boundary evaluates to FALSE", () => {
      // Target distance: radiusMeters + 0.001m (150.001m)
      const outsideDistance = radiusMeters + ONE_MM_IN_METERS;
      const userLat = officeLat + outsideDistance * METERS_TO_LAT_DEG;
      const userLon = officeLon;

      const computedDist = calculateHaversineDistance(
        userLat,
        userLon,
        officeLat,
        officeLon
      );
      expect(computedDist).toBeGreaterThan(radiusMeters);
      expect(computedDist).toBeCloseTo(150.001, 4);

      expect(isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters)).toBe(
        false
      );
    });

    it("verifies 0.1mm (sub-millimeter) precision inside and outside boundary", () => {
      const subMmDelta = 0.0001; // 0.1 mm

      // 0.1 mm inside (149.9999m)
      const subMmInsideDist = radiusMeters - subMmDelta;
      const userLatInside = officeLat + subMmInsideDist * METERS_TO_LAT_DEG;
      expect(
        isWithinGeofence(userLatInside, officeLon, officeLat, officeLon, radiusMeters)
      ).toBe(true);

      // 0.1 mm outside (150.0001m)
      const subMmOutsideDist = radiusMeters + subMmDelta;
      const userLatOutside = officeLat + subMmOutsideDist * METERS_TO_LAT_DEG;
      expect(
        isWithinGeofence(userLatOutside, officeLon, officeLat, officeLon, radiusMeters)
      ).toBe(false);
    });

    it("verifies 1mm inside and outside boundary across all cardinal directions (North, South, East, West)", () => {
      const testDistances = [
        { name: "1mm inside", dist: radiusMeters - ONE_MM_IN_METERS, expected: true },
        { name: "1mm outside", dist: radiusMeters + ONE_MM_IN_METERS, expected: false },
      ];

      // 1 meter in longitude degrees at latitude phi: 180 / (EARTH_RADIUS_METERS * PI * cos(phi))
      const phiRad = toRad(officeLat);
      const METERS_TO_LON_DEG = 180 / (EARTH_RADIUS_METERS * Math.PI * Math.cos(phiRad));

      for (const t of testDistances) {
        // North
        const northLat = officeLat + t.dist * METERS_TO_LAT_DEG;
        expect(
          isWithinGeofence(northLat, officeLon, officeLat, officeLon, radiusMeters)
        ).toBe(t.expected);

        // South
        const southLat = officeLat - t.dist * METERS_TO_LAT_DEG;
        expect(
          isWithinGeofence(southLat, officeLon, officeLat, officeLon, radiusMeters)
        ).toBe(t.expected);

        // East
        const eastLon = officeLon + t.dist * METERS_TO_LON_DEG;
        expect(
          isWithinGeofence(officeLat, eastLon, officeLat, officeLon, radiusMeters)
        ).toBe(t.expected);

        // West
        const westLon = officeLon - t.dist * METERS_TO_LON_DEG;
        expect(
          isWithinGeofence(officeLat, westLon, officeLat, officeLon, radiusMeters)
        ).toBe(t.expected);
      }
    });

    it("verifies boundary condition with zero-radius geofence (radius = 0)", () => {
      // At identical coordinates (distance = 0), isWithin is true
      expect(isWithinGeofence(officeLat, officeLon, officeLat, officeLon, 0)).toBe(true);

      // 1mm away, isWithin is false
      const userLat1mm = officeLat + ONE_MM_IN_METERS * METERS_TO_LAT_DEG;
      expect(isWithinGeofence(userLat1mm, officeLon, officeLat, officeLon, 0)).toBe(false);
    });

    it("verifies boundary condition with large radius geofence (10,000 km)", () => {
      // 90 degrees latitude arc from -45° to +45° = (PI / 2) * R = ~10,007,543.398 meters
      const largeOfficeLat = -45;
      const largeOfficeLon = 0;
      const targetUserLat = 45;
      const targetUserLon = 0;
      const exactDistance = calculateHaversineDistance(
        largeOfficeLat,
        largeOfficeLon,
        targetUserLat,
        targetUserLon
      );

      // Exact radius
      expect(
        isWithinGeofence(
          targetUserLat,
          targetUserLon,
          largeOfficeLat,
          largeOfficeLon,
          exactDistance
        )
      ).toBe(true);

      // 1mm inside large radius (radius = exactDistance + 1mm)
      expect(
        isWithinGeofence(
          targetUserLat,
          targetUserLon,
          largeOfficeLat,
          largeOfficeLon,
          exactDistance + ONE_MM_IN_METERS
        )
      ).toBe(true);

      // 1mm outside large radius (radius = exactDistance - 1mm)
      expect(
        isWithinGeofence(
          targetUserLat,
          targetUserLon,
          largeOfficeLat,
          largeOfficeLon,
          exactDistance - ONE_MM_IN_METERS
        )
      ).toBe(false);
    });

    it("strictly rejects negative, NaN, Infinity or non-number radiuses", () => {
      expect(() => isWithinGeofence(officeLat, officeLon, officeLat, officeLon, -0.001)).toThrow(
        RangeError
      );
      expect(() => isWithinGeofence(officeLat, officeLon, officeLat, officeLon, -150)).toThrow(
        RangeError
      );
      expect(() => isWithinGeofence(officeLat, officeLon, officeLat, officeLon, NaN)).toThrow(
        RangeError
      );
      expect(() => isWithinGeofence(officeLat, officeLon, officeLat, officeLon, Infinity)).toThrow(
        RangeError
      );
      expect(() => isWithinGeofence(officeLat, officeLon, officeLat, officeLon, -Infinity)).toThrow(
        RangeError
      );
      expect(() => isWithinGeofence(officeLat, officeLon, officeLat, officeLon, "150" as any)).toThrow(
        RangeError
      );
    });
  });

  // ==========================================================================
  // 4. GLOBAL SWEEPS, METRIC INVARIANTS & TRIANGLE INEQUALITY
  // ==========================================================================
  describe("Task 4: Global Sweeps & Metric Invariant Verification", () => {
    it("satisfies antipodal distance invariant across full 360-degree equatorial sweep", () => {
      for (let lon = -180; lon < 180; lon += 5) {
        let antiLon = lon + 180;
        if (antiLon > 180) antiLon -= 360;

        const dist = calculateHaversineDistance(0, lon, 0, antiLon);
        expect(Number.isNaN(dist)).toBe(false);
        expect(Math.abs(dist - HALF_EARTH_CIRCUMFERENCE)).toBeLessThan(0.01);
      }
    });

    it("satisfies antipodal distance invariant across full 180-degree meridian sweep", () => {
      for (let lat = -89; lat <= 89; lat += 2) {
        const antiLat = -lat;
        const dist = calculateHaversineDistance(lat, 0, antiLat, 180);
        expect(Number.isNaN(dist)).toBe(false);
        expect(Math.abs(dist - HALF_EARTH_CIRCUMFERENCE)).toBeLessThan(0.2);
      }
    });

    it("handles negative zero (-0) coordinates identically without sign-bit corruption", () => {
      expect(calculateHaversineDistance(-0, -0, 0, 0)).toBe(0);
      expect(calculateHaversineDistance(0, 0, -0, -0)).toBe(0);
      expect(calculateHaversineDistance(-0, 180, 0, -180)).toBeCloseTo(0, 5);
      expect(isWithinGeofence(-0, -0, 0, 0, 0)).toBe(true);
    });

    it("satisfies Triangle Inequality: dist(A, C) <= dist(A, B) + dist(B, C) across 500 spherical triangles", () => {
      let seed = 987654321;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      for (let i = 0; i < 500; i++) {
        const latA = rnd() * 160 - 80;
        const lonA = rnd() * 340 - 170;

        const latB = rnd() * 160 - 80;
        const lonB = rnd() * 340 - 170;

        const latC = rnd() * 160 - 80;
        const lonC = rnd() * 340 - 170;

        const distAB = calculateHaversineDistance(latA, lonA, latB, lonB);
        const distBC = calculateHaversineDistance(latB, lonB, latC, lonC);
        const distAC = calculateHaversineDistance(latA, lonA, latC, lonC);

        // Great-circle metric strictly satisfies triangle inequality.
        // Float precision cushion of 1 millimeter (0.001m)
        expect(distAC).toBeLessThanOrEqual(distAB + distBC + 0.001);
      }
    });

    it("executes 10,000 distance calculations in under 100ms (throughput benchmark)", () => {
      const startTime = performance.now();
      let dummySum = 0;

      for (let i = 0; i < 10000; i++) {
        const lat1 = (i % 160) - 80;
        const lon1 = (i % 340) - 170;
        const lat2 = ((i * 3) % 160) - 80;
        const lon2 = ((i * 3) % 340) - 170;

        dummySum += calculateHaversineDistance(lat1, lon1, lat2, lon2);
      }

      const elapsed = performance.now() - startTime;
      expect(dummySum).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100); // Must process 10,000 calculations under 100ms
    });
  });
});
