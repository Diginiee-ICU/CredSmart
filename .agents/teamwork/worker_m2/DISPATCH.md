## 2026-10-17T10:08:42Z
You are worker_m2 for CRM Phase 2 Milestone 2: Geo Location Calculation Engine & Utilities.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z) before doing any work.
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase2\DISPATCH.md.
Also read the detailed spec miner analysis at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_3\analysis.md (which provides the exact mathematical formulas, numerical clamping constants, Geolocation API wrapper requirements, and mock test helpers).

Your write ownership:
- src/utils/crmGeoUtils.ts
- src/test/crmGeoUtils.test.ts

Tasks to execute:
1. Create src/utils/crmGeoUtils.ts:
   - Export EARTH_RADIUS_METERS = 6371000.
   - calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number
     - Check for coordinate bounding (lat: [-90, 90], lon: [-180, 180]).
     - Fast return 0 if lat1 === lat2 && lon1 === lon2.
     - Convert degrees to radians.
     - Normalize longitude difference to [-180, 180].
     - Calculate a = sin^2(dLat/2) + cos(lat1)*cos(lat2)*sin^2(dLon/2).
     - Numerically clamp a: Math.min(1, Math.max(0, a)) to avoid NaN.
     - Calculate c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)).
     - Return distance in meters (rounded or float as appropriate).
   - isWithinGeofence(userLat: number, userLon: number, officeLat: number, officeLon: number, radiusMeters: number): boolean
     - Return distance <= radiusMeters.
   - findNearestGeofence(userLat: number, userLon: number, geofences: CRMGeolocation[]): { geofence: CRMGeolocation; distance: number; isWithin: boolean } | null
     - Handle empty geofences array returning null.
     - Calculate distance to each active geofence and return the nearest one.
   - getCurrentPosition(options?: PositionOptions): Promise<{ latitude: number; longitude: number; accuracy: number }>
     - Default options: enableHighAccuracy: true, timeout: 10000, maximumAge: 0.
     - Check if navigator.geolocation is supported.
     - Wrap navigator.geolocation.getCurrentPosition in a clean Promise with descriptive error messages for PERMISSION_DENIED (1), POSITION_UNAVAILABLE (2), and TIMEOUT (3).
   - Mock helpers for testing:
     - mockGeolocationPosition(coords: { latitude: number; longitude: number; accuracy?: number }): void
     - mockGeolocationError(error: { code: number; message: string }): void
     - resetGeolocationMock(): void
2. Create src/test/crmGeoUtils.test.ts:
   - Comprehensive unit tests:
     - Distance between identical points is 0m.
     - Distance between known coordinates (e.g., benchmark coordinates).
     - Distance across antimeridian / near poles.
     - Numerical clamping tests (antipodal points).
     - Invalid coordinates handling / errors.
     - isWithinGeofence tests (inside, on boundary, outside).
     - findNearestGeofence tests (closest selection, multiple active/inactive geofences, empty array).
     - getCurrentPosition tests using mock helpers (success, permission denied, timeout).
3. Run verification:
   - cmd /c npx tsc --noEmit
   - npm.cmd test -- src/test/crmGeoUtils.test.ts --run
   - npm.cmd test -- src/test/crmAttendanceMigrationStress.test.ts --run

Write your handoff report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md and notify orchestrator.
