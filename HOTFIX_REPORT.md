# Hotfix: Runtime Errors (Feb 18, 2026)

## Issues Fixed

### 1. Dashboard.tsx - Invalid Hook Call ❌ → ✅
**Error:** `Invalid hook call. Hooks can only be called inside of the body of a function component.`

**Root Cause:** `useToast()` was called inside async function `fetchSalesStats()`, violating React's Rules of Hooks.

**Fix:** Moved `const { toast } = useToast();` to component top level (line 43)

```tsx
export default function Dashboard() {
  const navigate = useNavigate();
  const { orgId, org } = useOrganization();
  const { toast } = useToast();  // ← MOVED HERE
  // ... rest of component
  
  const fetchSalesStats = async () => {
    // No longer tries to call useToast here
    try {
      // ... async code
    }
  }
}
```

### 2. Analytics.tsx - Same Hook Violation ❌ → ✅
**Error:** Same invalid hook call issue in `fetchSales()`

**Fix:** Moved `const { toast } = useToast();` to component top level (line 36)

### 3. Staff.tsx - Missing `useAuth` Hook ❌ → ✅
**Error:** `ReferenceError: user is not defined` at line 383

**Root Cause:** Component references `user?.id` in render but never imported `useAuth()`

**Fix:** 
- Added `import { useAuth } from "@/hooks/useAuth";`
- Added `const { user } = useAuth();` to component initialization (line 56)

```tsx
export default function Staff() {
  const { orgId, loading: orgLoading } = useOrganization();
  const { user } = useAuth();  // ← ADDED
  const [members, setMembers] = useState<Member[]>([]);
  // ... rest of component
  
  // Now user?.id is available in render
}
```

## Files Modified in This Hotfix

✅ `src/pages/Dashboard.tsx`  
✅ `src/pages/Analytics.tsx`  
✅ `src/pages/Staff.tsx`  

## Verification

- Build: ✅ No errors
- Type check: ✅ No errors
- Runtime errors: ✅ Fixed

## Testing Steps

1. Clear browser cache (Cmd/Ctrl + Shift + Delete)
2. Refresh page (F5)
3. Test:
   - Navigate to Dashboard → should see sales stats without error
   - Navigate to Staff → should see members with "(You)" indicator
   - Navigate to Analytics → should load charts without hook error

## What Remains

All other defensive fixes remain in place:
- Try/catch around Supabase queries
- Null-safe field access
- Error toasts and console logging
- TTL-backed pending onboarding

