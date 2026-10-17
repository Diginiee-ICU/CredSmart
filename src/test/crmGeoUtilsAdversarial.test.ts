import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

describe("Adversarial Empirical Challenge: Geolocation API & Mock Harness", () => {
  // Ensure pristine mock state before and after each test
  beforeEach(() => {
    resetGeolocationMock();
  });

  afterEach(() => {
    resetGeolocationMock();
  });

  // ==========================================================================
  // TASK 1: Geolocation Error Handling Under Simulated Failures
  // ==========================================================================
  describe("Task 1: Simulated Geolocation Failures Error Handling", () => {
    it("handles PERMISSION_DENIED (Code 1) with exact error message and code property", async () => {
      mockGeolocationError({
        code: 1,
        message: "User denied Geolocation",
      });

      let caughtError: any = null;
      try {
        await getCurrentPosition();
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError.message).toBe(
        "Location permission denied. Please allow location access to continue."
      );
      expect(caughtError.code).toBe(1);
    });

    it("handles POSITION_UNAVAILABLE (Code 2) with exact error message and code property", async () => {
      mockGeolocationError({
        code: 2,
        message: "Network location provider failed",
      });

      let caughtError: any = null;
      try {
        await getCurrentPosition();
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError.message).toBe(
        "Location position unavailable. Please check your GPS or network settings."
      );
      expect(caughtError.code).toBe(2);
    });

    it("handles TIMEOUT (Code 3) with exact error message and code property", async () => {
      mockGeolocationError({
        code: 3,
        message: "Timeout expired",
      });

      let caughtError: any = null;
      try {
        await getCurrentPosition();
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError.message).toBe(
        "Location request timed out. Please try again."
      );
      expect(caughtError.code).toBe(3);
    });

    it("handles non-standard error codes by using provided custom message", async () => {
      mockGeolocationError({
        code: 4,
        message: "Custom hardware vendor error",
      });

      let caughtError: any = null;
      try {
        await getCurrentPosition();
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError.message).toBe("Custom hardware vendor error");
      expect(caughtError.code).toBe(4);
    });

    it("handles non-standard error codes with empty message by falling back to default message", async () => {
      mockGeolocationError({
        code: 99,
        message: "",
      });

      let caughtError: any = null;
      try {
        await getCurrentPosition();
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError.message).toBe("Failed to retrieve location.");
      expect(caughtError.code).toBe(99);
    });

    it("handles unsupported environment rejection", async () => {
      mockGeolocationUnsupported();

      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );
    });

    it("passes custom PositionOptions when calling getCurrentPosition", async () => {
      // Intercept getCurrentPosition call to verify options passed to navigator.geolocation
      let passedOptions: PositionOptions | undefined;
      const originalNavGeo = (navigator as any).geolocation;

      const spyGeo = {
        getCurrentPosition: (
          success: PositionCallback,
          _error?: PositionErrorCallback | null,
          options?: PositionOptions
        ) => {
          passedOptions = options;
          success({
            coords: {
              latitude: 10,
              longitude: 20,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
        watchPosition: () => 1,
        clearWatch: () => {},
      };

      Object.defineProperty(navigator, "geolocation", {
        value: spyGeo,
        writable: true,
        configurable: true,
      });

      await getCurrentPosition({
        timeout: 5000,
        enableHighAccuracy: false,
      });

      expect(passedOptions).toBeDefined();
      expect(passedOptions?.timeout).toBe(5000);
      expect(passedOptions?.enableHighAccuracy).toBe(false);
      expect(passedOptions?.maximumAge).toBe(0); // Merged from defaults

      // Cleanup
      if (originalNavGeo) {
        Object.defineProperty(navigator, "geolocation", {
          value: originalNavGeo,
          writable: true,
          configurable: true,
        });
      } else {
        delete (navigator as any).geolocation;
      }
    });

    it("verifies watchPosition in mockGeolocationError triggers error callback with full interface", () => {
      mockGeolocationError({
        code: 1,
        message: "Denied in watch",
      });

      let receivedError: GeolocationPositionError | null = null;
      const watchId = navigator.geolocation.watchPosition(
        () => {},
        (err) => {
          receivedError = err;
        }
      );

      expect(watchId).toBe(1);
      expect(receivedError).not.toBeNull();
      expect(receivedError?.code).toBe(1);
      expect(receivedError?.PERMISSION_DENIED).toBe(1);
      expect(receivedError?.POSITION_UNAVAILABLE).toBe(2);
      expect(receivedError?.TIMEOUT).toBe(3);
    });
  });

  // ==========================================================================
  // TASK 2: Cleanup and Mock Restoration (resetGeolocationMock)
  // ==========================================================================
  describe("Task 2: Cleanup and Mock Restoration (resetGeolocationMock)", () => {
    it("restores original state when navigator.geolocation was initially undefined", async () => {
      // In jsdom without mocks, navigator.geolocation is undefined
      mockGeolocationPosition({ latitude: 15.0, longitude: 75.0, accuracy: 10 });

      const pos = await getCurrentPosition();
      expect(pos.latitude).toBe(15.0);

      // Reset mock
      resetGeolocationMock();

      // After reset, getCurrentPosition must reject because geolocation is no longer mocked/supported
      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );
    });

    it("restores pre-existing real navigator.geolocation object perfectly", async () => {
      const realSpy = vi.fn((success: PositionCallback) => {
        success({
          coords: {
            latitude: 42.0,
            longitude: -71.0,
            accuracy: 3,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: 123456789,
        } as GeolocationPosition);
      });

      const fakeRealGeo = {
        getCurrentPosition: realSpy,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
        isRealHardware: true,
      };

      // Set fake real geolocation
      Object.defineProperty(navigator, "geolocation", {
        value: fakeRealGeo,
        writable: true,
        configurable: true,
      });

      // Now apply mock
      mockGeolocationPosition({ latitude: 1.1, longitude: 2.2, accuracy: 5 });
      const mockedPos = await getCurrentPosition();
      expect(mockedPos.latitude).toBe(1.1);
      expect(realSpy).not.toHaveBeenCalled();

      // Now reset mock
      resetGeolocationMock();

      // Verify original fakeRealGeo is restored
      expect((navigator.geolocation as any).isRealHardware).toBe(true);
      const restoredPos = await getCurrentPosition();
      expect(restoredPos.latitude).toBe(42.0);
      expect(realSpy).toHaveBeenCalledTimes(1);

      // Clean up fakeRealGeo
      delete (navigator as any).geolocation;
    });

    it("is strictly idempotent: multiple resets do not throw or corrupt state", () => {
      expect(() => {
        resetGeolocationMock();
        resetGeolocationMock();
        resetGeolocationMock();
      }).not.toThrow();
    });

    it("handles consecutive mock calls without intermediate reset cleanly", async () => {
      // Test setting mock position then changing it directly
      mockGeolocationPosition({ latitude: 10, longitude: 20 });
      let pos = await getCurrentPosition();
      expect(pos.latitude).toBe(10);

      // Change mock position without resetting
      mockGeolocationPosition({ latitude: 30, longitude: 40 });
      pos = await getCurrentPosition();
      expect(pos.latitude).toBe(30);

      // Change to mock error without resetting
      mockGeolocationError({ code: 1, message: "Denied" });
      await expect(getCurrentPosition()).rejects.toThrow("Location permission denied");

      // Now single reset should return to original state
      resetGeolocationMock();
      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );
    });

    it("prevents test pollution across simulated independent test cases", async () => {
      // Simulated Test 1
      mockGeolocationPosition({ latitude: 51.5074, longitude: -0.1278, accuracy: 15 });
      const res1 = await getCurrentPosition();
      expect(res1.latitude).toBe(51.5074);
      resetGeolocationMock();

      // Simulated Test 2 (expects clean unpolluted state)
      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );

      // Simulated Test 3 (mock error)
      mockGeolocationError({ code: 3, message: "Timeout" });
      await expect(getCurrentPosition()).rejects.toThrow("Location request timed out");
      resetGeolocationMock();

      // Simulated Test 4 (expects clean unpolluted state)
      await expect(getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by your browser or environment."
      );
    });
  });

  // ==========================================================================
  // TASK 3: findNearestGeofence Stress-Testing
  // ==========================================================================
  describe("Task 3: findNearestGeofence Stress-Testing & Edge Cases", () => {
    const baseOffice: CRMGeolocation = {
      id: "geo-base",
      org_id: "org-1",
      name: "Central Office",
      latitude: 12.9716,
      longitude: 77.5946,
      radius_meters: 150,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    it("returns null when passed an empty array []", () => {
      const result = findNearestGeofence(12.9716, 77.5946, []);
      expect(result).toBeNull();
    });

    it("returns null when passed non-array inputs (null, undefined, invalid)", () => {
      expect(findNearestGeofence(12.9716, 77.5946, null as any)).toBeNull();
      expect(findNearestGeofence(12.9716, 77.5946, undefined as any)).toBeNull();
      expect(findNearestGeofence(12.9716, 77.5946, {} as any)).toBeNull();
      expect(findNearestGeofence(12.9716, 77.5946, "not-array" as any)).toBeNull();
    });

    it("returns null when ALL geofences in the array are inactive (single and multiple)", () => {
      // Single inactive geofence
      const singleInactive: CRMGeolocation[] = [
        { ...baseOffice, id: "geo-inact-1", is_active: false },
      ];
      expect(findNearestGeofence(12.9716, 77.5946, singleInactive)).toBeNull();

      // Multiple inactive geofences
      const multipleInactive: CRMGeolocation[] = [
        { ...baseOffice, id: "geo-inact-1", is_active: false },
        { ...baseOffice, id: "geo-inact-2", is_active: false, latitude: 12.972, longitude: 77.595 },
        { ...baseOffice, id: "geo-inact-3", is_active: false, latitude: 13.0, longitude: 77.6 },
      ];
      expect(findNearestGeofence(12.9716, 77.5946, multipleInactive)).toBeNull();

      // Inactive mixed with null/undefined entries
      const dirtyInactive = [
        null as any,
        { ...baseOffice, is_active: false },
        undefined as any,
      ];
      expect(findNearestGeofence(12.9716, 77.5946, dirtyInactive)).toBeNull();
    });

    it("handles a single active geofence correctly (inside, outside, and boundary)", () => {
      const singleActive: CRMGeolocation[] = [
        {
          id: "geo-single",
          org_id: "org-1",
          name: "Solo Office",
          latitude: 28.6139,
          longitude: 77.209,
          radius_meters: 100,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];

      // Exact center: distance 0, inside
      const centerRes = findNearestGeofence(28.6139, 77.209, singleActive);
      expect(centerRes).not.toBeNull();
      expect(centerRes?.geofence.id).toBe("geo-single");
      expect(centerRes?.distance).toBe(0);
      expect(centerRes?.isWithin).toBe(true);

      // Inside: offset by ~30 meters (0.00027 deg lat)
      const insideRes = findNearestGeofence(28.6139 + 0.00027, 77.209, singleActive);
      expect(insideRes?.isWithin).toBe(true);
      expect(insideRes?.distance).toBeLessThan(100);

      // Outside: offset by ~500 meters (0.0045 deg lat)
      const outsideRes = findNearestGeofence(28.6139 + 0.0045, 77.209, singleActive);
      expect(outsideRes?.isWithin).toBe(false);
      expect(outsideRes?.distance).toBeGreaterThan(100);

      // Exactly on perimeter: offset by exact distance equal to radius
      // 100 meters north = 100 / (EARTH_RADIUS_METERS * PI / 180) degrees
      const deltaLat = 100 / ((EARTH_RADIUS_METERS * Math.PI) / 180);
      const boundaryRes = findNearestGeofence(28.6139 + deltaLat, 77.209, singleActive);
      expect(boundaryRes?.distance).toBeCloseTo(100, 1);
      expect(boundaryRes?.isWithin).toBe(true);
    });

    it("handles identical distance geofences deterministically (tie-breaking)", () => {
      // Two geofences at the exact same location
      const twinGeofences: CRMGeolocation[] = [
        {
          id: "geo-first",
          org_id: "org-1",
          name: "Twin Office A",
          latitude: 12.9716,
          longitude: 77.5946,
          radius_meters: 100,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "geo-second",
          org_id: "org-1",
          name: "Twin Office B",
          latitude: 12.9716,
          longitude: 77.5946,
          radius_meters: 200,
          is_active: true,
          created_at: "2026-01-02T00:00:00Z",
        },
      ];

      // Distance from user to both is identical.
      // Strict < comparison means first encountered geofence is stably preserved.
      const res = findNearestGeofence(12.9716, 77.5946, twinGeofences);
      expect(res).not.toBeNull();
      expect(res?.geofence.id).toBe("geo-first");
      expect(res?.distance).toBe(0);
      expect(res?.isWithin).toBe(true);

      // Reverse list order -> now geo-second should be chosen because it's first in array
      const reversed = [...twinGeofences].reverse();
      const resReversed = findNearestGeofence(12.9716, 77.5946, reversed);
      expect(resReversed?.geofence.id).toBe("geo-second");
    });

    it("handles equidistant geofences in opposite directions deterministically", () => {
      // User is at (0, 0)
      // North office at (0.01, 0)
      // South office at (-0.01, 0)
      const northOffice: CRMGeolocation = {
        id: "geo-north",
        org_id: "org-1",
        name: "North Outpost",
        latitude: 0.01,
        longitude: 0,
        radius_meters: 500,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const southOffice: CRMGeolocation = {
        id: "geo-south",
        org_id: "org-1",
        name: "South Outpost",
        latitude: -0.01,
        longitude: 0,
        radius_meters: 500,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const distNorth = calculateHaversineDistance(0, 0, 0.01, 0);
      const distSouth = calculateHaversineDistance(0, 0, -0.01, 0);
      expect(distNorth).toBeCloseTo(distSouth, 6);

      const res = findNearestGeofence(0, 0, [northOffice, southOffice]);
      expect(res).not.toBeNull();
      expect(res?.geofence.id).toBe("geo-north");
      expect(res?.distance).toBeCloseTo(distNorth, 4);
    });

    it("stress-tests findNearestGeofence with 1,000 geofences across the globe", () => {
      const targetOffice: CRMGeolocation = {
        id: "target-bangalore",
        org_id: "org-1",
        name: "Target Bangalore HQ",
        latitude: 12.9716,
        longitude: 77.5946,
        radius_meters: 100,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Generate 999 random active offices distributed worldwide (guaranteed > 100km away)
      const largeGeofenceList: CRMGeolocation[] = [];
      for (let i = 0; i < 999; i++) {
        // Latitudes between -80 and +80, Longitudes between -170 and +170
        const lat = ((i * 17) % 160) - 80;
        const lon = ((i * 31) % 340) - 170;
        largeGeofenceList.push({
          id: `dist-office-${i}`,
          org_id: "org-1",
          name: `Distant Office ${i}`,
          latitude: lat,
          longitude: lon,
          radius_meters: 100,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }

      // Insert target office at random index
      const insertIdx = 543;
      largeGeofenceList.splice(insertIdx, 0, targetOffice);

      // User is 15 meters away from target
      const userLat = 12.9716 + 0.0001;
      const userLon = 77.5946;

      const startTime = performance.now();
      const result = findNearestGeofence(userLat, userLon, largeGeofenceList);
      const elapsed = performance.now() - startTime;

      expect(result).not.toBeNull();
      expect(result?.geofence.id).toBe("target-bangalore");
      expect(result?.distance).toBeLessThan(20);
      expect(result?.isWithin).toBe(true);
      expect(elapsed).toBeLessThan(50); // Under 50ms for 1,000 spherical computations
    });

    it("handles antimeridian proximity across +180°/-180° correctly", () => {
      // Office on Fiji/Tonga border at +179.99° longitude
      const islandOffice: CRMGeolocation = {
        id: "geo-antimeridian",
        org_id: "org-1",
        name: "Taveuni Island Office",
        latitude: -16.8,
        longitude: 179.99,
        radius_meters: 2000,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // User on the opposite side of the 180° meridian at -179.99° longitude (~2.2km away)
      const userLat = -16.8;
      const userLon = -179.99;

      const result = findNearestGeofence(userLat, userLon, [islandOffice]);
      expect(result).not.toBeNull();
      expect(result?.distance).toBeGreaterThan(2000);
      expect(result?.distance).toBeLessThan(2500);
      expect(result?.isWithin).toBe(false);

      // Move user to -179.995° (~1.1km away, inside 2000m radius)
      const insideResult = findNearestGeofence(userLat, -179.995, [islandOffice]);
      expect(insideResult?.distance).toBeLessThan(2000);
      expect(insideResult?.isWithin).toBe(true);
    });

    it("propagates RangeError when invalid coordinates are provided", () => {
      const validGeofences = [baseOffice];

      // Invalid user latitude
      expect(() => findNearestGeofence(95, 77.5946, validGeofences)).toThrow(
        RangeError
      );

      // Invalid user longitude
      expect(() => findNearestGeofence(12.9716, 200, validGeofences)).toThrow(
        RangeError
      );

      // Non-finite user coordinate
      expect(() => findNearestGeofence(NaN, 77.5946, validGeofences)).toThrow(
        RangeError
      );

      // Geofence with invalid coordinate
      const badGeofence: CRMGeolocation[] = [
        { ...baseOffice, latitude: 100 },
      ];
      expect(() => findNearestGeofence(12.9716, 77.5946, badGeofence)).toThrow(
        RangeError
      );
    });
  });
});
