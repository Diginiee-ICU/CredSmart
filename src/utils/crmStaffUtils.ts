/**
 * @file crmStaffUtils.ts
 * @description Enterprise CRM utilities for staff user provisioning, cryptographic password generation,
 * input validation, credentials formatting, and in-memory roster hydration.
 *
 * Adheres strictly to CredSmart CRM standards and PROJECT.md interface contracts.
 */

export type StoreRole = "salesman" | "cashier" | "manager" | "staff";

export interface ProvisionStaffInput {
  full_name: string;
  email: string;
  phone?: string;
  password?: string;
  store_role: StoreRole;
  crm_role_id?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    fullName: string;
    email: string;
    phone: string;
    storeRole: StoreRole;
  };
}

/**
 * Validates staff provisioning input according to CredSmart enterprise constraints.
 */
export function validateStaffProvisioningInput(input: Partial<ProvisionStaffInput>): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Full Name Validation
  const fullName = (input.full_name || "").trim();
  if (!fullName) {
    errors.full_name = "Full name is required";
  } else if (fullName.length < 2) {
    errors.full_name = "Full name must be at least 2 characters";
  } else if (fullName.length > 100) {
    errors.full_name = "Full name cannot exceed 100 characters";
  }

  // 2. Email Validation (RFC 5322 Compliant Subset)
  const email = (input.email || "").trim().toLowerCase();
  const emailRegex =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(email) || email.includes("..") || email.includes("@.")) {
    errors.email = "Invalid email address format";
  }

  // 3. Phone Sanitization & Validation (Standard 10-digit Indian Mobile or E.164)
  let cleanPhone = "";
  if (input.phone) {
    const rawPhone = input.phone.trim();
    let digits = rawPhone.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length === 11) {
      digits = digits.slice(1);
    }

    if (digits.length !== 10) {
      errors.phone = "Phone number must be a valid 10-digit mobile number";
    } else {
      cleanPhone = digits;
    }
  }

  // 4. Store Role Validation
  const allowedRoles: StoreRole[] = ["salesman", "cashier", "manager", "staff"];
  if (!input.store_role) {
    errors.store_role = "Store role is required";
  } else if (!allowedRoles.includes(input.store_role)) {
    errors.store_role = `Invalid store role. Must be one of: ${allowedRoles.join(", ")}`;
  }

  // 5. Password Validation (if provided explicitly)
  if (input.password !== undefined && input.password !== "") {
    if (input.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    ...(valid
      ? {
          sanitized: {
            fullName,
            email,
            phone: cleanPhone,
            storeRole: input.store_role as StoreRole,
          },
        }
      : {}),
  };
}

/**
 * Cryptographic auto-password generator using window.crypto.getRandomValues.
 * Generates high-entropy passwords satisfying uppercase, lowercase, numeric, and symbol sets.
 */
export function generateCryptographicPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude ambiguous I, O
  const lower = "abcdefghijkmnopqrstuvwxyz"; // exclude ambiguous l
  const digits = "23456789"; // exclude ambiguous 0, 1
  const symbols = "!@#$%^&*()_+~|}{[]:;?><,./-=";
  const allChars = upper + lower + digits + symbols;

  if (length < 8) {
    throw new Error("Password length must be at least 8 characters");
  }

  const cryptoObj =
    typeof window !== "undefined" && window.crypto
      ? window.crypto
      : (globalThis as unknown as { crypto: Crypto }).crypto;

  const getRandomChar = (charset: string): string => {
    const array = new Uint32Array(1);
    cryptoObj.getRandomValues(array);
    return charset[array[0] % charset.length];
  };

  const requiredChars = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(symbols),
  ];

  const remainingLength = length - requiredChars.length;
  const randomBytes = new Uint32Array(remainingLength);
  cryptoObj.getRandomValues(randomBytes);

  const result: string[] = [...requiredChars];
  for (let i = 0; i < remainingLength; i++) {
    result.push(allChars[randomBytes[i] % allChars.length]);
  }

  // Cryptographic Fisher-Yates shuffle
  const shuffleBytes = new Uint32Array(result.length);
  cryptoObj.getRandomValues(shuffleBytes);
  for (let i = result.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result.join("");
}

/**
 * Prepares one-click clipboard text payload and WhatsApp communication template.
 */
export function formatCredentialsPayload(params: {
  fullName: string;
  email: string;
  password: string;
  roleName: string;
  orgName: string;
  loginUrl?: string;
}): {
  clipboardText: string;
  whatsAppText: string;
  whatsAppUrl: string;
  maskedPassword: string;
} {
  const url = params.loginUrl || "https://credsmart.online/auth";
  const maskedPassword = "•".repeat(params.password.length);

  const clipboardText = [
    `Welcome to ${params.orgName} on CredSmart!`,
    `----------------------------------------`,
    `Employee: ${params.fullName}`,
    `Assigned Role: ${params.roleName}`,
    `Login URL: ${url}`,
    `Email: ${params.email}`,
    `Password: ${params.password}`,
    `----------------------------------------`,
    `Note: For security, please change your password upon first login.`,
  ].join("\n");

  const whatsAppText = `*Welcome to ${params.orgName} on CredSmart!*

Hi *${params.fullName}*, your staff credentials have been created:
• *Role:* ${params.roleName}
• *Login:* ${url}
• *Email:* ${params.email}
• *Password:* ${params.password}

_Please log in and update your password immediately._`;

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`;

  return {
    clipboardText,
    whatsAppText,
    whatsAppUrl,
    maskedPassword,
  };
}

/**
 * In-memory staff roster updater (hydrates staffList and staffRolesMap).
 */
export function hydrateStaffRoster<
  T extends { id: string; name: string; role: string; crmRoleId?: string }
>(
  currentStaff: T[],
  currentRolesMap: Record<string, string>,
  newUser: { id: string; full_name: string; store_role: string; crm_role_id?: string | null }
): {
  updatedStaffList: T[];
  updatedRolesMap: Record<string, string>;
} {
  const newStaffItem = {
    id: newUser.id,
    name: newUser.full_name,
    role: newUser.store_role,
    crmRoleId: newUser.crm_role_id || undefined,
  } as T;

  const updatedStaffList = [newStaffItem, ...currentStaff.filter((s) => s.id !== newUser.id)];
  const updatedRolesMap = {
    ...currentRolesMap,
    ...(newUser.crm_role_id ? { [newUser.id]: newUser.crm_role_id } : {}),
  };

  return { updatedStaffList, updatedRolesMap };
}
