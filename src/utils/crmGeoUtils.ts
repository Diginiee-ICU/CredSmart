/**
 * CRM Phase 2: Geo Location Calculation Engine & Utilities
 * Provides high-precision spherical distance calculation using Haversine formula,
 * geofence validation, nearest office detection, and browser Geolocation API wrapper with test mocks.
 */

import type { CRMGeolocation } from "@/types/crmAttendance";

/**
 * Mean spherical Earth radius in meters according to IUGG standards.
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Default options for navigator.geolocation.getCurrentPosition
 */
export const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

export interface CoordinatesResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface NearestGeofenceResult {
  geofence: CRMGeolocation;
  distance: number;
  isWithin: boolean;
}

/**
 * Validates whether latitude and longitude are within standard geographical boundaries.
 * Latitude must be [-90, +90] and longitude must be [-180, +180].
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Calculates the great-circle distance in meters between two geographical points using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in degrees (-90 to +90)
 * @param lon1 Longitude of point 1 in degrees (-180 to +180)
 * @param lat2 Latitude of point 2 in degrees (-90 to +90)
 * @param lon2 Longitude of point 2 in degrees (-180 to +180)
 * @returns Distance in meters (>= 0)
 * @throws {RangeError} If coordinates are out of geographical bounds or non-finite
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new RangeError(
      `Invalid coordinate bounding: latitude must be between -90 and 90, longitude must be between -180 and 180. Received: [${lat1}, ${lon1}], [${lat2}, ${lon2}]`
    );
  }

  // Fast path: identical coordinates or both points at the same geographic pole yield exact 0 distance
  if (
    (lat1 === lat2 && lon1 === lon2) ||
    (Math.abs(lat1) === 90 && lat1 === lat2)
  ) {
    return 0;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Normalize longitude difference to [-180, +180] for shortest arc across antimeridian
  let diffLonDeg = (lon2 - lon1) % 360;
  if (diffLonDeg > 180) diffLonDeg -= 360;
  if (diffLonDeg < -180) diffLonDeg += 360;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(diffLonDeg);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  // Haversine formula: a = sin^2(dLat/2) + cos(phi1)*cos(phi2)*sin^2(dLon/2)
  const a =
    sinHalfDLat * sinHalfDLat +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfDLon * sinHalfDLon;

  // Numerically clamp a to [0, 1] to prevent NaN from floating-point inaccuracies
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Checks whether user coordinates reside within a circular office geofence.
 *
 * @param userLat User GPS latitude
 * @param userLon User GPS longitude
 * @param officeLat Office base latitude
 * @param officeLon Office base longitude
 * @param radiusMeters Maximum allowed distance in meters (e.g. 150)
 * @returns true if user is within geofence, false otherwise
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number
): boolean {
  if (typeof radiusMeters !== "number" || !Number.isFinite(radiusMeters) || radiusMeters < 0) {
    throw new RangeError("Geofence radius must be a non-negative finite number.");
  }

  const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
  return distance <= radiusMeters;
}

/**
 * Finds the nearest active office geofence to the user's current coordinates.
 *
 * @param userLat User GPS latitude
 * @param userLon User GPS longitude
 * @param geofences Array of office geofences
 * @returns The nearest geofence with distance and inside-check, or null if no active geofences exist
 */
export function findNearestGeofence(
  userLat: number,
  userLon: number,
  geofences: CRMGeolocation[]
): NearestGeofenceResult | null {
  if (!Array.isArray(geofences) || geofences.length === 0) {
    return null;
  }

  // Filter only active geofences
  const activeGeofences = geofences.filter((g) => g && g.is_active === true);
  if (activeGeofences.length === 0) {
    return null;
  }

  let nearest: CRMGeolocation | null = null;
  let minDistance = Infinity;

  for (const geofence of activeGeofences) {
    const distance = calculateHaversineDistance(
      userLat,
      userLon,
      geofence.latitude,
      geofence.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = geofence;
    }
  }

  if (!nearest) {
    return null;
  }

  return {
    geofence: nearest,
    distance: minDistance,
    isWithin: minDistance <= nearest.radius_meters,
  };
}

/**
 * Promise wrapper around navigator.geolocation.getCurrentPosition with default high-accuracy options
 * and descriptive error messages for permission denial, timeout, and hardware unavailability.
 *
 * @param options Custom PositionOptions override
 * @returns Promise resolving to coordinates { latitude, longitude, accuracy }
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<CoordinatesResult> {
  const mergedOptions: PositionOptions = {
    ...DEFAULT_GEOLOCATION_OPTIONS,
    ...options,
  };

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new Error("Geolocation is not supported by your browser or environment.")
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error: GeolocationPositionError) => {
        let message = "Failed to retrieve location.";

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            message =
              "Location permission denied. Please allow location access to continue.";
            break;
          case 2: // POSITION_UNAVAILABLE
            message =
              "Location position unavailable. Please check your GPS or network settings.";
            break;
          case 3: // TIMEOUT
            message = "Location request timed out. Please try again.";
            break;
          default:
            message = error.message || message;
        }

        const err = new Error(message);
        (err as any).code = error.code;
        reject(err);
      },
      mergedOptions
    );
  });
}

// ============================================================================
// Vitest / Testing Mock Helpers
// ============================================================================

let originalGeolocation: Geolocation | undefined = undefined;
let isMocked = false;

/**
 * Mocks navigator.geolocation.getCurrentPosition to resolve with predictable coordinates.
 */
export function mockGeolocationPosition(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number;
}): void {
  if (typeof navigator === "undefined") {
    return;
  }

  if (!isMocked) {
    originalGeolocation = navigator.geolocation;
    isMocked = true;
  }

  const mockGeo = {
    getCurrentPosition: (
      success: PositionCallback,
      _error?: PositionErrorCallback | null,
      _options?: PositionOptions
    ) => {
      const position: GeolocationPosition = {
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };
      success(position);
    },
    watchPosition: (
      success: PositionCallback,
      _error?: PositionErrorCallback | null,
      _options?: PositionOptions
    ) => {
      const position: GeolocationPosition = {
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };
      success(position);
      return 1;
    },
    clearWatch: (_watchId: number) => {},
  };

  Object.defineProperty(navigator, "geolocation", {
    value: mockGeo,
    writable: true,
    configurable: true,
  });
}

/**
 * Mocks navigator.geolocation.getCurrentPosition to reject with a custom GeolocationPositionError.
 */
export function mockGeolocationError(error: {
  code: number;
  message: string;
}): void {
  if (typeof navigator === "undefined") {
    return;
  }

  if (!isMocked) {
    originalGeolocation = navigator.geolocation;
    isMocked = true;
  }

  const mockGeo = {
    getCurrentPosition: (
      _success: PositionCallback,
      errorCallback?: PositionErrorCallback | null,
      _options?: PositionOptions
    ) => {
      if (errorCallback) {
        const posErr = {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError;
        errorCallback(posErr);
      }
    },
    watchPosition: (
      _success: PositionCallback,
      errorCallback?: PositionErrorCallback | null,
      _options?: PositionOptions
    ) => {
      if (errorCallback) {
        const posErr = {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError;
        errorCallback(posErr);
      }
      return 1;
    },
    clearWatch: (_watchId: number) => {},
  };

  Object.defineProperty(navigator, "geolocation", {
    value: mockGeo,
    writable: true,
    configurable: true,
  });
}

/**
 * Mocks an environment where navigator.geolocation is completely undefined / unsupported.
 */
export function mockGeolocationUnsupported(): void {
  if (typeof navigator === "undefined") {
    return;
  }

  if (!isMocked) {
    originalGeolocation = navigator.geolocation;
    isMocked = true;
  }

  delete (navigator as any).geolocation;
  if ("geolocation" in navigator) {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Resets navigator.geolocation back to its original state prior to any mock calls.
 */
export function resetGeolocationMock(): void {
  if (typeof navigator === "undefined") {
    return;
  }

  if (isMocked) {
    if (originalGeolocation !== undefined) {
      Object.defineProperty(navigator, "geolocation", {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      });
    } else {
      delete (navigator as any).geolocation;
      if ("geolocation" in navigator) {
        Object.defineProperty(navigator, "geolocation", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      }
    }
    isMocked = false;
    originalGeolocation = undefined;
  }
}
