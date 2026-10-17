# CRM Phase 2 Technical Specification & Math/Library Analysis

**Author:** `survey_spec_miner_3`  
**Date:** 2026-10-17  
**Working Directory:** `.agents/teamwork/spec_miner_survey_3`  
**Reference Assignment:** CRM Tab Phase 2 — Attendance & Geo Location Attendance  
**Authoritative Sources:**
- User Request: `.agents/teamwork/ORIGINAL_REQUEST.md` (Section `## 2026-10-17T08:52:11Z`)
- Orchestrator Dispatch: `.agents/teamwork/orchestrator_crm_phase2/DISPATCH.md`
- RBAC Architecture Skill: `.agents/skills/crm-rbac-skill/SKILL.md`
- Dependency Spec: `package.json`
- Test Harness: `vitest.config.ts`, `src/test/setup.ts`, `src/test/crmPermissionRbac.test.ts`
- PDF Utilities: `src/utils/whatsappPdfShare.ts`, `src/utils/downloadExactInvoice.ts`
- CSV Utility: `src/lib/utils.ts` (`exportToCSV`)
- CRM Tokens: `src/components/crm/CRMCard.tsx` (`CRM_BRAND_COLORS`)

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Geolocation Math | `calculateHaversineDistance` | Calculates the great-circle distance in meters between two WGS-84 coordinates using Earth radius 6,371,000m | `(lat1: number, lon1: number, lat2: number, lon2: number)` | `number` (distance in meters >= 0) | Throws `Error` on invalid bounds or non-finite numbers; clamps float domain `[0, 1]` to prevent `NaN` | `ORIGINAL_REQUEST.md:367`, IUGG Spherical Model |
| 2 | Geolocation Math | `isWithinGeofence` | Determines whether an employee's coordinates fall within an office radius boundary | `(userLat: number, userLon: number, officeLat: number, officeLon: number, radiusMeters: number)` | `boolean` (`true` if distance <= radiusMeters) | Throws on invalid inputs; returns `false` if office coordinates invalid | `ORIGINAL_REQUEST.md:368` |
| 3 | Geolocation API | `getCurrentCoordinates` | Promise wrapper around `navigator.geolocation.getCurrentPosition` with high accuracy, configurable timeout, and fresh position enforcement | `(options?: PositionOptions)` | `Promise<GeoResult>` with `{ coords: { latitude, longitude, accuracy } }` | Catches `PERMISSION_DENIED` (1), `POSITION_UNAVAILABLE` (2), `TIMEOUT` (3), insecure origin, or missing browser API with actionable error message | `ORIGINAL_REQUEST.md:369`, W3C Geolocation Spec |
| 4 | Testing Utility | `mockGeolocationSuccess` / `mockGeolocationError` | Vitest test helpers that mock `globalThis.navigator.geolocation` for predictable coordinates and error codes in jsdom | `(coords)` or `(code, message)` | `MockGeolocation` instance | Allows resetting and testing permission denial, timeout, and coordinate checks | `ORIGINAL_REQUEST.md:370`, Vitest harness |
| 5 | PDF Generation | `generateAttendancePdf` | Programmatic vector PDF generation using `jsPDF` for monthly attendance statements matching CredSmart brand tokens | `{ orgName, month, year, staff, records, summary }` | `Blob` or triggers file download | Handles multi-page pagination gracefully; fails safely with toast if doc rendering errors | `package.json:112`, `whatsappPdfShare.ts:98` |
| 6 | CSV Export | `exportAttendanceCsv` / `exportPayrollCsv` | RFC 4180 compliant CSV export for HR and payroll processing systems | `(filename: string, rows: (string|number)[][])` | Triggers browser download of `.csv` Blob | Sanitizes commas, quotes, and newlines; converts null/undefined to empty strings | `src/lib/utils.ts:8`, `ORIGINAL_REQUEST.md:388` |
| 7 | Testing Suite | Vitest CRM Test Harness | Testing environment configuration using jsdom, `@/` path alias, globals, and chainable Supabase mocks | Spec test files in `src/test/` | Vitest report (Pass/Fail) | Fails on type/assertion errors; requires `npm.cmd` on Windows PowerShell | `vitest.config.ts`, `src/test/setup.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Haversine Distance | `lat1 = lat2, lon1 = lon2` (Identical point, 0 distance) | Without early exit or clamping, floating point arithmetic could produce subnormal epsilon values or `-0`. Early check `if (lat1 === lat2 && lon1 === lon2) return 0;` yields exact `0`. |
| 2 | Haversine Distance | Negative coordinates: Southern/Western Hemisphere (e.g. Sydney `-33.8688, 151.2093` to São Paulo `-23.5505, -46.6333`) | Trigonometric functions `Math.sin` and `Math.cos` evaluate negative radian angles correctly; difference must be $(\phi_2 - \phi_1)$ and $(\lambda_2 - \lambda_1)$ without absolute value prior to radian difference. |
| 3 | Haversine Distance | Antipodal coordinates (e.g. `(0, 0)` and `(0, 180)`) | Value of $a$ can compute to $1.0000000000000002$ due to IEEE 754 precision. Taking $\sqrt{1 - a}$ evaluates to $\sqrt{-2 \times 10^{-16}} = \text{NaN}$. Strict clamping `Math.min(1, Math.max(0, a))` prevents `NaN`. |
| 4 | Haversine Distance | Antimeridian crossing (`lon1 = 179`, `lon2 = -179`) | Direct subtraction gives $-358^\circ$. Angular delta normalization `((dLon + 540) % 360) - 180` ensures shortest great-circle arc ($2^\circ$) is evaluated. |
| 5 | Haversine Distance | Non-finite or out-of-bound inputs (`lat = 95`, `lon = -200`, `lat = NaN`) | Coordinate bounding validation must reject values where `abs(lat) > 90` or `abs(lon) > 180` or `!Number.isFinite(...)` by throwing an informative `RangeError` / `TypeError`. |
| 6 | Geolocation API | User blocks permission (`PERMISSION_DENIED = 1`) | Wrapper intercepts error code 1, does NOT crash, and returns `{ success: false, error: { code: 1, message: "User denied Geolocation", userGuidance: "Please enable location access in browser settings" } }`. |
| 7 | Geolocation API | Hardware GPS timeout (`TIMEOUT = 3`) | When `timeout: 10000` expires without satellite fix, wrapper catches code 3 and suggests moving near a window or falling back to manual regularization. |
| 8 | Geolocation API | Non-secure context (HTTP host, LAN IP `http://192.168.x.x:5173`) | `window.isSecureContext === false` blocks `navigator.geolocation` in Chromium/Safari. Wrapper checks `window.isSecureContext` upfront and returns clear error explaining HTTPS is required. |
| 9 | Geolocation API | jsdom test environment (no native geolocation) | In Vitest jsdom, `navigator.geolocation` is undefined. Attempting to call `getCurrentPosition` throws `TypeError`. Must be injected via `Object.defineProperty(globalThis.navigator, "geolocation", ...)`. |
| 10 | PDF Export | `jspdf-autotable` missing in `package.json` | Attempting `import "jspdf-autotable"` causes module resolution compile failure. Programmatic vector PDF rendering directly using `jsPDF` primitive API (`setFillColor`, `rect`, `text`, `addPage`) must be used. |
| 11 | PDF Export | Multi-page overflow (> 35 daily records or large team) | Single page table height ($> 270\text{mm}$) will draw off-canvas. Table renderer must track `curY` and invoke `doc.addPage()` + re-render table headers when `curY + rowHeight > pageHeight - margin`. |
| 12 | CSV Export | Field contains commas, double quotes, or newlines | `exportToCSV` in `src/lib/utils.ts` escapes double quotes to `""` and wraps fields containing commas, quotes, or newlines in `"..."` per RFC 4180. |

---

## 1. Haversine Distance Formula Specification

### 1.1 Mathematical Formulation
The Haversine formula determines the great-circle distance between two points on a sphere given their longitudes and latitudes.

Let:
- $\phi_1, \phi_2$ be the latitudes in radians: $\phi = \text{lat} \times \frac{\pi}{180}$
- $\lambda_1, \lambda_2$ be the longitudes in radians: $\lambda = \text{lon} \times \frac{\pi}{180}$
- $\Delta\phi = \phi_2 - \phi_1 = (\text{lat}_2 - \text{lat}_1) \times \frac{\pi}{180}$
- $\Delta\lambda = \lambda_2 - \lambda_1 = (\text{lon}_2 - \text{lon}_1) \times \frac{\pi}{180}$
- $R = 6,371,000 \text{ meters}$ (IUGG mean spherical Earth radius)

The intermediate haversine $a$ is computed as:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

The angular distance in radians $c$ is computed using the numerically stable two-argument arctangent:
$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

The great-circle distance in meters $d$ is:
$$d = R \cdot c = 6,371,000 \cdot c$$

### 1.2 Earth Radius Constant
The system must use **$R = 6,371,000 \text{ meters}$** (6,371 km).
- Equatorial radius ($a$): 6,378,137 m
- Polar radius ($b$): 6,356,752 m
- Mean volumetric / IUGG radius ($R_1 = (2a + b)/3$): 6,371,008 m, conventionally standardized to **6,371,000 m** in civil geolocation standards and explicitly specified in `ORIGINAL_REQUEST.md:367`.

### 1.3 Handling Critical Boundary Conditions
1. **Identical Point (Zero Distance)**:
   When `lat1 === lat2 && lon1 === lon2`:
   $\Delta\phi = 0$, $\Delta\lambda = 0 \implies a = 0 \implies c = 0 \implies d = 0$.
   To avoid floating point noise (e.g. $10^{-16}$) or $-0$, an explicit zero-check must be performed:
   ```ts
   if (lat1 === lat2 && lon1 === lon2) return 0;
   ```
2. **Negative Coordinates (Hemispheres)**:
   - Southern latitudes are negative: $[-90, 0)$.
   - Western longitudes are negative: $[-180, 0)$.
   - In standard trigonometry: $\sin(-\theta) = -\sin(\theta)$, so $\sin^2(-\theta) = \sin^2(\theta)$.
   - $\cos(-\theta) = \cos(\theta)$.
   - Radian difference $(\text{lat}_2 - \text{lat}_1)$ preserves exact orientation across the Equator and Prime Meridian.
3. **Antimeridian Crossing (180° / -180°)**:
   When calculating across the 180th meridian (e.g., $179^\circ$ to $-179^\circ$), the linear difference is $-358^\circ$. Normalizing $\Delta\lambda$ to $[-180, 180]$ gives:
   ```ts
   let diffLon = (lon2 - lon1) % 360;
   if (diffLon > 180) diffLon -= 360;
   if (diffLon < -180) diffLon += 360;
   ```
4. **Floating Point Clamping Against NaN**:
   Due to rounding precision in IEEE 754 64-bit floats:
   - If points are antipodal, $a$ can evaluate to $1 + 10^{-16}$, causing $\sqrt{1 - a}$ to evaluate to $\sqrt{-10^{-16}} = \text{NaN}$.
   - If points are identical, float inaccuracies can calculate $a = -10^{-17}$, causing $\sqrt{a} = \text{NaN}$.
   - Therefore, $a$ must be clamped to $[0, 1]$ before computing $c$:
   ```ts
   const clampedA = Math.min(1, Math.max(0, a));
   ```
5. **Coordinate Validation & Bounding**:
   - $\text{lat} \in [-90, +90]$
   - $\text{lon} \in [-180, +180]$
   - Inputs must be checked with `Number.isFinite()`.

### 1.4 Authoritative TypeScript Reference Implementation
```typescript
/**
 * Canonical Earth Radius in meters according to IUGG mean spherical model.
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Validates whether latitude and longitude are within standard geographical boundaries.
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
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
      `Invalid geographical coordinates: [${lat1}, ${lon1}], [${lat2}, ${lon2}]. Lat must be [-90, 90], Lon must be [-180, 180].`
    );
  }

  // Exact match fast exit
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Shortest angular longitude difference across antimeridian
  let diffLonDeg = (lon2 - lon1) % 360;
  if (diffLonDeg > 180) diffLonDeg -= 360;
  if (diffLonDeg < -180) diffLonDeg += 360;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(diffLonDeg);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  const a =
    sinHalfDLat * sinHalfDLat +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfDLon * sinHalfDLon;

  // Clamp against IEEE 754 float precision overflow/underflow
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
 * @returns true if user is within geofence
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number
): boolean {
  if (radiusMeters < 0 || !Number.isFinite(radiusMeters)) {
    throw new RangeError("Geofence radius must be a positive finite number.");
  }
  const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
  return distance <= radiusMeters;
}
```

---

## 2. Geolocation API Wrapper Specification

### 2.1 W3C Geolocation Standard & Browser Behavior
The browser standard API is `navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options)`.

#### Options Parameter Configuration
```typescript
export interface GeolocationConfig {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}
```
1. **`enableHighAccuracy: true`**:
   - Requests satellite GPS on mobile devices (Android/iOS) and Wi-Fi SSID triangulation on desktop.
   - Crucial for geofencing where typical office tolerances are 100m–200m (without high accuracy, coarse IP geolocation can yield an error of 5,000m–50,000m, causing false negative geofence rejections).
2. **`timeout: 10000` (10,000 ms)**:
   - Prevents clock-in button spinner from hanging if device GPS hardware is slow or obstructed.
   - 10 seconds is the standard SLA for mobile web app punch-in.
3. **`maximumAge: 0`**:
   - Zero milliseconds forbids the browser from returning a cached location reading from an earlier session (e.g., when the employee was at home 30 minutes ago).

### 2.2 Error Codes & Handling Matrix
The W3C `GeolocationPositionError` defines three standard integer codes:
- **`PERMISSION_DENIED` (Code 1)**:
  - Cause: User clicked "Don't Allow" on browser prompt, or origin is blocked in site settings.
  - User guidance: "Location permission denied. Please allow location access in your browser or phone settings to verify attendance."
  - Action: Prompt manual attendance request (`verification_method = 'manual'`).
- **`POSITION_UNAVAILABLE` (Code 2)**:
  - Cause: Device has GPS disabled, airplane mode active, or no satellite signal (underground/basement).
  - User guidance: "Unable to retrieve GPS signal. Check your device location services or step near an open area."
- **`TIMEOUT` (Code 3)**:
  - Cause: High accuracy fix took longer than 10 seconds.
  - User guidance: "GPS acquisition timed out. Try again or submit a manual attendance request."

### 2.3 Environmental Constraints
1. **Secure Context (`window.isSecureContext`)**:
   W3C Geolocation API is strictly restricted to Secure Contexts (`https://` or `http://localhost`). When deployed over plain `http://` (such as local IP `http://192.168.1.5:5173`), `navigator.geolocation` will fail with permission denied or be completely undefined.
2. **Capacitor Mobile Shell**:
   CredSmart supports Capacitor Android (`@capacitor/android` in `package.json`). In WebView, Capacitor delegates to Android WebChromeClient geolocation permissions, which triggers native Android system runtime permission prompts (`ACCESS_FINE_LOCATION`).

### 2.4 Geolocation Wrapper Contract & Implementation
```typescript
export interface GeoPositionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeoLocationErrorResult {
  code: number;
  name: "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED" | "INSECURE_CONTEXT";
  message: string;
  userGuidance: string;
}

export type GeoResponse =
  | { success: true; data: GeoPositionResult }
  | { success: false; error: GeoLocationErrorResult };

/**
 * Modern Promise-based Geolocation wrapper with high accuracy and resilient timeout handling.
 */
export async function getDeviceCoordinates(
  options: GeolocationConfig = {}
): Promise<GeoResponse> {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
    return {
      success: false,
      error: {
        code: 1,
        name: "INSECURE_CONTEXT",
        message: "Geolocation requires a secure HTTPS connection.",
        userGuidance: "Please access CredSmart via HTTPS to enable GPS attendance verification.",
      },
    };
  }

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return {
      success: false,
      error: {
        code: 0,
        name: "UNSUPPORTED",
        message: "Geolocation is not supported by your current browser.",
        userGuidance: "Please use a modern browser (Chrome, Safari, Edge) to punch in.",
      },
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
        });
      },
      (err: GeolocationPositionError) => {
        let name: GeoLocationErrorResult["name"] = "POSITION_UNAVAILABLE";
        let userGuidance = "Unable to determine your location.";

        switch (err.code) {
          case 1: // PERMISSION_DENIED
            name = "PERMISSION_DENIED";
            userGuidance = "Location access was denied. Please allow location permissions in your browser.";
            break;
          case 2: // POSITION_UNAVAILABLE
            name = "POSITION_UNAVAILABLE";
            userGuidance = "GPS position is currently unavailable. Ensure your device GPS is turned on.";
            break;
          case 3: // TIMEOUT
            name = "TIMEOUT";
            userGuidance = "Acquiring GPS signal timed out. Please try again.";
            break;
        }

        resolve({
          success: false,
          error: {
            code: err.code,
            name,
            message: err.message,
            userGuidance,
          },
        });
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  });
}
```

### 2.5 Mocking `navigator.geolocation` in Vitest
In `jsdom`, `navigator.geolocation` is undefined. The test helper must use `Object.defineProperty` on `globalThis.navigator`.

```typescript
export interface MockGeoOptions {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  errorCode?: 1 | 2 | 3;
  errorMessage?: string;
  delayMs?: number;
}

/**
 * Vitest mock utility for controlling navigator.geolocation in unit tests.
 */
export function setupMockGeolocation(options: MockGeoOptions = {}) {
  const {
    latitude = 12.9716,
    longitude = 77.5946,
    accuracy = 15,
    errorCode,
    errorMessage = "Mocked geolocation error",
    delayMs = 0,
  } = options;

  const mockGetCurrentPosition = vi.fn((success, error, _opts) => {
    const execute = () => {
      if (errorCode) {
        error({
          code: errorCode,
          message: errorMessage,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      } else {
        success({
          coords: {
            latitude,
            longitude,
            accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      }
    };

    if (delayMs > 0) {
      setTimeout(execute, delayMs);
    } else {
      execute();
    }
  });

  const mockGeolocation = {
    getCurrentPosition: mockGetCurrentPosition,
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };

  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: mockGeolocation,
    writable: true,
    configurable: true,
  });

  return mockGeolocation;
}
```

---

## 3. PDF & CSV Export Architecture for Attendance & Payroll

### 3.1 Existing PDF Generation Analysis
CredSmart has two existing PDF export patterns:
1. **DOM Canvas Capture (`downloadExactInvoice.ts`)**:
   - Uses `html2canvas` to screenshot an offscreen DOM element, then injects the image into a single-page A4 `jsPDF` container (`pdf.addImage(imgData, 'PNG', ...)`).
   - Limitation for Attendance Reports: Attendance reports span multiple weeks/months and 30+ rows. Canvas capture cannot naturally page-break vector text across multiple A4 pages without visual clipping or blur.
2. **Programmatic Vector PDF (`whatsappPdfShare.ts:98–160`)**:
   - Uses pure native `jsPDF` vector primitives (`setFillColor`, `rect`, `setTextColor`, `setFontSize`, `setFont`, `text`, `addPage`, `save`).
   - Advantage: Highly performant, crisp text at 300+ DPI, seamless multi-page pagination (`curY > 270 => doc.addPage()`), runs cleanly in node/jsdom without canvas mock dependencies.

#### Critical Dependency Finding: `jspdf-autotable`
- Examination of `package.json` line 112: `"jspdf": "^4.2.1"`.
- `jspdf-autotable` is **NOT installed** in `package.json`.
- **Architectural Directive**: The implementation should either:
  1. Render tables programmatically via native `jsPDF` vector commands (identical to `whatsappPdfShare.ts`), OR
  2. Implement a lightweight custom table loop helper that draws cells using `doc.rect()` and `doc.text()`.
  This guarantees zero runtime missing module errors and full compatibility with existing build scripts.

### 3.2 Design System Brand Tokens & Palette
Colors must align with CredSmart CRM Design Tokens defined in `src/components/crm/CRMCard.tsx`:

| Token | Hex | RGB (for `jsPDF`) | Semantic Purpose |
|---|---|---|---|
| `navy` | `#0F172A` | `[15, 23, 42]` | Header background, high-contrast titles |
| `orange` | `#FF6A00` | `[255, 106, 0]` | Absent status, warnings, punch-out highlight |
| `blue` | `#1D4ED8` | `[29, 78, 216]` | Primary actions, on-leave status, link highlights |
| `emerald` | `#10B981` | `[16, 185, 129]` | Present status, geo-verified check, punch-in |
| `gold` | `#F59E0B` | `[245, 158, 11]` | Half-day status, pending requests, overtime |
| `slateBg` | `#F8FAFC` | `[248, 250, 252]` | Alternate row shading, KPI card backgrounds |
| `slateBorder` | `#E2E8F0` | `[226, 232, 240]` | Table borders, card dividers |
| `textMuted` | `#64748B` | `[100, 116, 139]` | Subtitles, secondary timestamps, table column headers |

### 3.3 Attendance Monthly PDF Report Layout
- **Page Size**: Standard A4 Portrait (210mm wide $\times$ 297mm high).
- **Margins**: Left/Right 14mm, Top/Bottom 14mm. Printable width = 182mm.
- **Section 1: Header Banner (Height: 26mm)**:
  - Fill: Navy `[15, 23, 42]`, rect `(0, 0, 210, 26, "F")`.
  - Title: "CREDSMART ATTENDANCE & PAYROLL SUMMARY" (White, Bold, 15pt).
  - Subtitle: Organization Name • Employee Name • Period (e.g., "October 2026") • Generated Date.
- **Section 2: KPI Metric Pods (Height: 18mm)**:
  - 4 side-by-side metric tiles (Width: 42.5mm each, Gap: 4mm):
    1. **Total Days**: Calendar days / Working days.
    2. **Present Days**: Emerald highlight.
    3. **Half / Leave**: Gold / Blue highlight.
    4. **Overtime Hours**: Total overtime hours recorded.
- **Section 3: Detailed Table**:
  - Columns (Total Width = 182mm):
    - `Date`: 22mm
    - `Day`: 16mm
    - `Clock In`: 22mm
    - `Clock Out`: 22mm
    - `Duration`: 20mm
    - `Overtime`: 18mm
    - `Status`: 22mm (Colored badge text)
    - `Verification`: 22mm (Geo-verified / Manual)
    - `Distance`: 18mm
  - Alternating row background: White `[255, 255, 255]` and Soft Slate `[248, 250, 252]`.
  - Pagination boundary: `if (curY > 275) { doc.addPage(); curY = 20; drawHeader(); }`.
- **Section 4: Footer**:
  - Text: "CredSmart Business Management Platform • System Generated Attendance Record • Confidential"
  - Page Number: `Page ${page} of ${totalPages}`.

### 3.4 CSV Export Specification for Payroll Ingestion
`src/lib/utils.ts` already provides `exportToCSV(filename: string, rows: any[][])`.

For attendance and payroll processing, two standard CSV formats are specified:

#### Format A: Monthly Employee Summary (Payroll Input)
Used directly by accountants or imported into payroll calculators:
```csv
"Employee ID","Employee Name","Email","Role","Period","Total Working Days","Present Days","Absent Days","Half Days","On Leave","Total Work Hours","Total Overtime Hours","Regularized Days","Attendance Rate (%)"
"usr-001","Rajesh Sharma","rajesh@credsmart.app","Store Manager","2026-10",26,24,0,2,0,208.5,12.0,1,"96.15%"
```

#### Format B: Daily Punch Log (Audit Trail)
Used for compliance, geofence verification, and dispute resolution:
```csv
"Date","Staff ID","Staff Name","Clock In","Clock Out","Duration (Hours)","Overtime (Mins)","Status","Verification Method","Within Geofence","Distance (Meters)","Office Location","Clock In Lat","Clock In Lon","Clock Out Lat","Clock Out Lon","Notes"
"2026-10-17","usr-001","Rajesh Sharma","09:02:14 AM","06:14:22 PM",9.2,14,"present","geo_verified","true",34.2,"Main Head Office",12.9716,77.5946,12.9718,77.5949,"On time"
```

---

## 4. Vitest Testing Environment & Conventions

### 4.1 Vitest Configuration (`vitest.config.ts`)
- **Engine**: Vitest v3.2.4
- **Environment**: `jsdom` (version 20.0.3)
- **Globals**: `true` (enables global `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`)
- **Setup Files**: `["./src/test/setup.ts"]`
  - Already configures `@testing-library/jest-dom` matchers.
  - Mocks `window.matchMedia`.
- **Path Alias**:
  `@/` resolves to `./src` (configured via `path.resolve(__dirname, "./src")`).
- **Command Invocation Under Windows PowerShell**:
  - Running plain `npm test` fails with `PSSecurityException` because `npm.ps1` script execution is disabled by Windows policy.
  - **Authoritative Command**: Always run `npm.cmd test -- <path>` or `npx.cmd vitest run <path>`.

### 4.2 Standard Mocking Patterns in CredSmart

#### Pattern 1: Mocking Supabase Client Queries
Used for resilient testing of `crm_attendance`, `crm_geolocations`, and `crm_attendance_requests`:
```typescript
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseQuery),
  },
}));
```

#### Pattern 2: Mocking `jsPDF`
Used to verify PDF generation without depending on canvas:
```typescript
const mockPdf = {
  setFillColor: vi.fn().mockReturnThis(),
  rect: vi.fn().mockReturnThis(),
  setTextColor: vi.fn().mockReturnThis(),
  setFontSize: vi.fn().mockReturnThis(),
  setFont: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  addPage: vi.fn().mockReturnThis(),
  save: vi.fn(),
  output: vi.fn(() => new Blob(["mock-pdf"], { type: "application/pdf" })),
};

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => mockPdf),
}));
```

#### Pattern 3: Mocking Timer & Clock
Used for testing live clock-in elapsed duration timer:
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

---

## 5. Architectural Recommendations for Implementation Agents
1. **Utility Location**:
   Place all math and browser geolocation logic in `src/utils/crmGeoUtils.ts`.
2. **Export Location**:
   Place PDF generation in `src/utils/crmAttendanceExport.ts` and leverage `src/lib/utils.ts` for CSV downloads.
3. **Accuracy Tolerance**:
   If user GPS accuracy reported by the device is $> 100\text{m}$, warn the user that GPS signal is low while allowing punch with a warning badge.
4. **Offline & Fallback Resilience**:
   In line with CredSmart's offline capability, store daily attendance logs in `localStorage` under `credsmart_crm_attendance_${orgId}` as an offline fallback when network connectivity is disrupted.
