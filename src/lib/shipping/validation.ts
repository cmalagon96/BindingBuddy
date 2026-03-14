import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long")
    .trim(),
  line1: z
    .string()
    .min(3, "Street address is required")
    .max(200, "Address is too long")
    .trim(),
  line2: z
    .string()
    .max(200, "Address line 2 is too long")
    .trim()
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .min(2, "City is required")
    .max(100, "City name is too long")
    .trim(),
  state: z.string().min(1, "State is required").max(10),
  postalCode: z
    .string()
    .min(3, "Postal code is required")
    .max(20, "Postal code is too long")
    .trim()
    .regex(/^[A-Za-z0-9\s\-]+$/, "Invalid postal code format"),
  country: z.string().min(1, "Country is required").max(2),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export interface ShippingValidationResult {
  success: boolean;
  data?: ShippingAddress;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

export function validateShippingAddress(
  input: unknown
): ShippingValidationResult {
  const result = shippingAddressSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ShippingAddress;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}
