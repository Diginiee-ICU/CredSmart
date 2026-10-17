import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EARTH_RADIUS_METERS,
  DEFAULT_GEOLOCATION_OPTIONS,
  isValidCoordinate,
  calculateHaversineDistance,
  isWithinGeofence,
  findNearestGeofence,
  getCurrentPosition,
  mockGeolocationPosition,
  mockGeolocationError,
  mockGeolocationUnsupported,
  resetGeolocationMock,
} from "@/utils/crmGeoUtils";
import type { CRMGeolocation } from "@/types/crmAttendance";

describe("CRM Phase 2: crmGeoUtils Geolocation Calculation Engine & Utilities", () => {
  // Always clean up geolocation mocks after each test
  afterEach(() => {
    resetGeolocationMock();
  });

  // ==========================================================================
  // 1. Constants & Coordinate Validation
  // ==========================================================================
  describe("Constants & Coordinate Validation", () => {
    it("exports EARTH_RADIUS_METERS as exactly 6,371,000 meters", () => {
      expect(EARTH_RADIUS_METERS).toBe(6371000);
    });

    it("exports DEFAULT_GEOLOCATION_OPTIONS with high accuracy, 10s timeout, and 0 maxAge", () => {
      expect(DEFAULT_GEOLOCATION_OPTIONS).toEqual({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

    it("validates coordinates correctly within standard WGS-84 boundaries", () => {
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90, -180)).toBe(true);
      expect(isValidCoordinate(-90, 180)).toBe(true);
      expect(isValidCoordinate(12.9716, 77.5946)).toBe(true);
      expect(isValidCoordinate(-33.8688, 151.2093)).toBe(true);
    });

    it("rejects coordinates exceeding latitude limits [-90, +90]", () => {
      expect(isValidCoordinate(90.0001, 0)).toBe(false);
      expect(isValidCoordinate(-90.0001, 0)).toBe(false);
      expect(isValidCoordinate(180, 0)).toBe(false);
      expect(isValidCoordinate(-180, 0)).toBe(false);
    });

    it("rejects coordinates exceeding longitude limits [-180, +180]", () => {
      expect(isValidCoordinate(0, 180.0001)).toBe(false);
      expect(isValidCoordinate(0, -180.0001)).toBe(false);
      expect(isValidCoordinate(0, 360)).toBe(false);
      expect(isValidCoordinate(0, -360)).toBe(false);
    });

    it("rejects non-finite values (NaN, Infinity, -Infinity)", () => {
      expect(isValidCoordinate(NaN, 0)).toBe(false);
      expect(isValidCoordinate(0, NaN)).toBe(false);
      expect(isValidCoordinate(Infinity, 0)).toBe(false);
      expect(isValidCoordinate(0, -Infinity)).toBe(false);
    });

    it("rejects non-number types passed as coordinates", () => {
      expect(isValidCoordinate(null as any, 0)).toBe(false);
      expect(isValidCoordinate(0, undefined as any)).toBe(false);
      expect(isValidCoordinate("12.97" as any, 77.59)).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Haversine Distance Calculation
  // ==========================================================================
  describe("calculateHaversineDistance", () => {
    it("returns exact 0 meters between identical coordinates", () => {
      expect(calculateHaversineDistance(0, 0, 0, 0)).toBe(0);
      expect(calculateHaversineDistance(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
      expect(calculateHaversineDistance(90, 0, 90, 0)).toBe(0);
      expect(calculateHaversineDistance(-90, 0, -90, 0)).toBe(0);
      expect(calculateHaversineDistance(-33.8688, 151.2093, -33.8688, 151.2093)).toBe(0);
    });

    it("calculates accurate distances between known benchmark coordinates", () => {
      // Benchmark 1: London (51.5074, -0.1278) to Paris (48.8566, 2.3522)
      // Theoretical spherical distance: ~343,556 meters
      const londonParisDistance = calculateHaversineDistance(
        51.5074,
        -0.1278,
        48.8566,
        2.3522
      );
      expect(londonParisDistance).toBeGreaterThan(340000);
      expect(londonParisDistance).toBeLessThan(348000);
      expect(Math.round(londonParisDistance)).toBeCloseTo(343556, -3);

      // Benchmark 2: New York (40.7128, -74.006) to London (51.5074, -0.1278)
      // Theoretical spherical distance: ~5,570,222 meters
      const nyLondonDistance = calculateHaversineDistance(
        40.7128,
        -74.006,
        51.5074,
        -0.1278
      );
      expect(nyLondonDistance).toBeGreaterThan(5500000);
      expect(nyLondonDistance).toBeLessThan(5650000);
      expect(Math.round(nyLondonDistance)).toBeCloseTo(5570222, -4);

      // Benchmark 3: 1 degree latitude at Equator
      // Distance = EARTH_RADIUS_METERS * (PI / 180) = ~111,194.9 meters
      const oneDegreeLatDistance = calculateHaversineDistance(0, 0, 1, 0);
      const expectedDegreeDistance = (EARTH_RADIUS_METERS * Math.PI) / 180;
      expect(oneDegreeLatDistance).toBeCloseTo(expectedDegreeDistance, 1);

      // Benchmark 4: 1 degree longitude at Equator
      const oneDegreeLonDistance = calculateHaversineDistance(0, 0, 0, 1);
      expect(oneDegreeLonDistance).toBeCloseTo(expectedDegreeDistance, 1);
    });

    it("is strictly symmetric: dist(A, B) === dist(B, A)", () => {
      const distAB = calculateHaversineDistance(12.9716, 77.5946, 28.6139, 77.209);
      const distBA = calculateHaversineDistance(28.6139, 77.209, 12.9716, 77.5946);
      expect(distAB).toBeCloseTo(distBA, 5);
    });

    it("correctly handles antimeridian crossing (180° / -180° boundary)", () => {
      // Two points 0.5 degrees on either side of the 180° meridian (1° total separation)
      // Point 1: (0, 179.5), Point 2: (0, -179.5)
      const antimeridianDistance = calculateHaversineDistance(0, 179.5, 0, -179.5);
      const expectedOneDegree = (EARTH_RADIUS_METERS * Math.PI) / 180;

      // Must be ~111.19 km (1 degree arc), NOT ~39,919 km (359 degrees around the back)
      expect(antimeridianDistance).toBeCloseTo(expectedOneDegree, 1);

      // Reverse direction check
      const reverseAntimeridian = calculateHaversineDistance(0, -179.5, 0, 179.5);
      expect(reverseAntimeridian).toBeCloseTo(expectedOneDegree, 1);

      // Across the 180° meridian at high northern latitude (80° N, 179° E to 80° N, -179° W)
      const highLatDistance = calculateHaversineDistance(80, 179, 80, -179);
      expect(Number.isFinite(highLatDistance)).toBe(true);
      expect(highLatDistance).toBeGreaterThan(0);
      expect(highLatDistance).toBeLessThan(100000); // Shorter parallel circle
    });

    it("correctly calculates distances near the poles", () => {
      // 1 degree south from North Pole
      const fromNorthPole = calculateHaversineDistance(90, 0, 89, 0);
      const expectedOneDegree = (EARTH_RADIUS_METERS * Math.PI) / 180;
      expect(fromNorthPole).toBeCloseTo(expectedOneDegree, 1);

      // Longitude convergence at the exact pole: (90, 45) to (90, -120) is 0 distance
      const poleConvergence = calculateHaversineDistance(90, 45, 90, -120);
      expect(poleConvergence).toBe(0);

      // 1 degree north from South Pole
      const fromSouthPole = calculateHaversineDistance(-90, 0, -89, 0);
      expect(fromSouthPole).toBeCloseTo(expectedOneDegree, 1);
    });

    it("applies numerical clamping to avoid NaN on antipodal points", () => {
      // North Pole to South Pole (exactly half the Earth's circumference)
      const northToSouthPole = calculateHaversineDistance(90, 0, -90, 0);
      const halfCircumference = EARTH_RADIUS_METERS * Math.PI;
      expect(Number.isNaN(northToSouthPole)).toBe(false);
      expect(northToSouthPole).toBeCloseTo(halfCircumference, 1);

      // Equator antipodal: (0, 0) to (0, 180)
      const equatorAntipodal = calculateHaversineDistance(0, 0, 0, 180);
      expect(Number.isNaN(equatorAntipodal)).toBe(false);
      expect(equatorAntipodal).toBeCloseTo(halfCircumference, 1);

      // Arbitrary antipodal: (45, 60) to (-45, -120)
      const arbitraryAntipodal = calculateHaversineDistance(45, 60, -45, -120);
      expect(Number.isNaN(arbitraryAntipodal)).toBe(false);
      expect(arbitraryAntipodal).toBeCloseTo(halfCircumference, 1);
    });

    it("throws RangeError on invalid or out-of-bounds coordinates", () => {
      // Latitude out of range
      expect(() => calculateHaversineDistance(95, 0, 0, 0)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(-95, 0, 0, 0)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(0, 0, 91, 0)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(0, 0, -91, 0)).toThrow(RangeError);

      // Longitude out of range
      expect(() => calculateHaversineDistance(0, 185, 0, 0)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(0, -185, 0, 0)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(0, 0, 0, 181)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(0, 0, 0, -181)).toThrow(RangeError);

      // Non-finite values
      expect(() => calculateHaversineDistance(NaN, 0, 0, 0)).toThrow(RangeError);
      expect(() => calculateHaversineDistance(0, 0, Infinity, 0)).toThrow(RangeError);
    });
  });

  // ==========================================================================
  // 3. Geofence Boundary Checking (isWithinGeofence)
  // ==========================================================================
  describe("isWithinGeofence", () => {
    const officeLat = 12.9716;
    const officeLon = 77.5946;
    const radiusMeters = 150;

    it("returns true when user coordinates are identical to office coordinates", () => {
      expect(isWithinGeofence(officeLat, officeLon, officeLat, officeLon, radiusMeters)).toBe(
        true
      );
    });

    it("returns true when user coordinates are well within the radius", () => {
      // Offset by ~0.0003 degrees (~33 meters)
      const userLat = officeLat + 0.0003;
      const userLon = officeLon;
      const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
      expect(distance).toBeLessThan(radiusMeters);
      expect(isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters)).toBe(
        true
      );
    });

    it("returns true when user coordinates are exactly on the boundary", () => {
      // Calculate distance to a point
      const userLat = officeLat + 0.0005;
      const userLon = officeLon;
      const exactDistance = calculateHaversineDistance(
        userLat,
        userLon,
        officeLat,
        officeLon
      );
      // Pass the exact distance as radiusMeters
      expect(isWithinGeofence(userLat, userLon, officeLat, officeLon, exactDistance)).toBe(
        true
      );
    });

    it("returns false when user coordinates are outside the radius", () => {
      // Offset by ~0.005 degrees (~555 meters)
      const userLat = officeLat + 0.005;
      const userLon = officeLon;
      const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
      expect(distance).toBeGreaterThan(radiusMeters);
      expect(isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters)).toBe(
        false
      );
    });

    it("handles zero radius correctly (only exact match is within)", () => {
      expect(isWithinGeofence(officeLat, officeLon, officeLat, officeLon, 0)).toBe(true);
      expect(isWithinGeofence(officeLat + 0.0001, officeLon, officeLat, officeLon, 0)).toBe(
        false
      );
    });

    it("throws RangeError if radius is negative or non-finite", () => {
      expect(() =>
        isWithinGeofence(officeLat, officeLon, officeLat, officeLon, -10)
      ).toThrow(RangeError);
      expect(() =>
        isWithinGeofence(officeLat, officeLon, officeLat, officeLon, NaN)
      ).toThrow(RangeError);
      expect(() =>
        isWithinGeofence(officeLat, officeLon, officeLat, officeLon, Infinity)
      ).toThrow(RangeError);
    });

    it("propagates RangeError if coordinates are invalid", () => {
      expect(() =>
        isWithinGeofence(95, officeLon, officeLat, officeLon, radiusMeters)
      ).toThrow(RangeError);
    });
  });

  // ==========================================================================
  // 4. findNearestGeofence
  // ==========================================================================
  describe("findNearestGeofence", () => {
    const mockGeofences: CRMGeolocation[] = [
      {
        id: "geo-1",
        org_id: "org-1",
        name: "Headquarters (Bangalore MG Road)",
        latitude: 12.9756,
        longitude: 77.6066,
        radius_meters: 150,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "geo-2",
        org_id: "org-1",
        name: "Branch 2 (Bangalore Indiranagar)",
        latitude: 12.9784,
        longitude: 77.6408,
        radius_meters: 200,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "geo-3",
        org_id: "org-1",
        name: "Branch 3 (Bangalore Koramangala - Inactive)",
        latitude: 12.9352,
        longitude: 77.6245,
        radius_meters: 100,
        is_active: false,
        created_at: new Date().toISOString(),
      },
    ];

    it("returns null when geofence list is empty or invalid", () => {
      expect(findNearestGeofence(12.9756, 77.6066, [])).toBeNull();
      expect(findNearestGeofence(12.9756, 77.6066, null as any)).toBeNull();
      expect(findNearestGeofence(12.9756, 77.6066, undefined as any)).toBeNull();
    });

    it("returns null when all geofences are inactive", () => {
      const inactiveGeofences: CRMGeolocation[] = [
        {
          ...mockGeofences[0],
          is_active: false,
        },
        {
          ...mockGeofences[1],
          is_active: false,
        },
      ];
      expect(findNearestGeofence(12.9756, 77.6066, inactiveGeofences)).toBeNull();
    });

    it("selects the closest active geofence and computes isWithin true when inside radius", () => {
      // User is right next to Headquarters (10 meters away)
      const userLat = 12.97565;
      const userLon = 77.60665;

      const result = findNearestGeofence(userLat, userLon, mockGeofences);
      expect(result).not.toBeNull();
      expect(result?.geofence.id).toBe("geo-1");
      expect(result?.geofence.name).toBe("Headquarters (Bangalore MG Road)");
      expect(result?.distance).toBeLessThan(50);
      expect(result?.isWithin).toBe(true);
    });

    it("selects the closest active geofence and computes isWithin false when outside radius", () => {
      // User is 500 meters away from Headquarters
      const userLat = 12.9796;
      const userLon = 77.6066;

      const result = findNearestGeofence(userLat, userLon, mockGeofences);
      expect(result).not.toBeNull();
      expect(result?.geofence.id).toBe("geo-1");
      expect(result?.distance).toBeGreaterThan(150);
      expect(result?.isWithin).toBe(false);
    });

    it("ignores inactive geofences even if they are closer", () => {
      // User is directly at the Koramangala location (geo-3), which is inactive!
      const userLat = 12.9352;
      const userLon = 77.6245;

      const result = findNearestGeofence(userLat, userLon, mockGeofences);
      expect(result).not.toBeNull();
      // Even though user is at Koramangala (geo-3), geo-3 is inactive, so it must pick the closest ACTIVE geofence
      expect(result?.geofence.id).not.toBe("geo-3");
      expect(result?.geofence.is_active).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Geolocation API Wrapper & Mock Helpers
  // ==========================================================================
  describe("getCurrentPosition & Testing Mock Helpers", () => {
    it("resolves coordinates when mocked with mockGeolocationPosition", async () => {
      mockGeolocationPosition({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 12,
      });

      const position = await getCurrentPosition();
      expect(position).toEqual({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 12,
      });
    });

    it("uses default accuracy of 10 if accuracy is not provided in mock", async () => {
      mockGeolocationPosition({
        latitude: 28.6139,
        longitude: 77.209,
      });

      const position = await getCurrentPosition();
      expect(position.latitude).toBe(28.6139);
      expect(position.longitude).toBe(77.209);
      expect(position.accuracy).toBe(10);
    });

    it("rejects with descriptive message on PERMISSION_DENIED (Code 1)", async () => {
      mockGeolocationError({
        code: 1,
        message: "User denied Geolocation",
      });

      await expect(getCurrentPosition()).rejects.toThrow(
        "Location permission denied. Please allow location access to continue."
      );

      try {
        await getCurrentPosition();
      } catch (err: any) {
        expect(err.code).toBe(1);
      }
    });

    it("rejects with descriptive message on POSITION_UNAVAILABLE (Code 2)", async () => {
      mockGeolocationError({
        code: 2,
        message: "GPS position unavailable",
      });

      await expect(getCurrentPosition()).rejects.toThrow(
        "Location position unavailable. Please check your GPS or network settings."
      );

      try {
        await getCurrentPosition();
      } catch (err: any) {
        expect(err.code).toBe(2);
      }
    });

    it("rejects with descriptive message on TIMEOUT (Code 3)", async () => {
      mockGeolocationError({
        code: 3,
        message: "Acquisition timed out",
      });

      await expect(getCurrentPosition()).rejects.toThrow(
        "Location request timed out. Please try again."
      );

      try {
        await getCurrentPosition();
      } catch (err: any) {
        expect(err.code).toBe(3);
      }
    });

    it("rejects when Geolocation is unsupported in the environment", async () => {
      mockGeolocationUnsupported();

      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );
    });

    it("resets mock state cleanly using resetGeolocationMock", async () => {
      mockGeolocationPosition({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 8,
      });

      const pos = await getCurrentPosition();
      expect(pos.latitude).toBe(19.076);

      resetGeolocationMock();

      // In jsdom environment, original geolocation is undefined, so reset restores undefined
      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );
    });
  });
});
