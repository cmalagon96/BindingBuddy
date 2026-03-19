"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/components/ui/Button";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/shipping/validation";
import { US_STATES, SUPPORTED_COUNTRIES } from "@/lib/shipping/constants";

const shippingFormSchema = shippingAddressSchema.extend({
  email: z.string().email("Please enter a valid email address").trim(),
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;

export interface ShippingFormResult {
  email: string;
  address: ShippingAddress;
}

interface ShippingFormProps {
  defaultValues?: Partial<ShippingFormData>;
  onSubmit: (result: ShippingFormResult) => void;
}

export default function ShippingForm({
  defaultValues,
  onSubmit,
}: ShippingFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      country: "US",
      ...defaultValues,
    },
  });

  const selectedCountry = watch("country");

  const fieldClass = (hasError: boolean) =>
    [
      "w-full bg-poke-dark border rounded-xl px-4 py-3 text-poke-text text-sm",
      "placeholder:text-poke-muted/60 outline-none transition-colors duration-150",
      "focus:border-poke-blue/60 focus:ring-1 focus:ring-poke-blue/30",
      hasError ? "border-red-500/60" : "border-poke-border",
    ].join(" ");

  function handleFormSubmit(data: ShippingFormData) {
    const { email, ...address } = data;
    onSubmit({ email, address });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-poke-muted mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            className={fieldClass(!!errors.email)}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-poke-muted mb-1.5">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            {...register("fullName")}
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            className={fieldClass(!!errors.fullName)}
          />
          {errors.fullName && (
            <p className="mt-1.5 text-xs text-red-400">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Address Line 1 */}
        <div>
          <label className="block text-sm font-medium text-poke-muted mb-1.5">
            Street Address <span className="text-red-400">*</span>
          </label>
          <input
            {...register("line1")}
            type="text"
            autoComplete="address-line1"
            placeholder="123 Main St"
            className={fieldClass(!!errors.line1)}
          />
          {errors.line1 && (
            <p className="mt-1.5 text-xs text-red-400">
              {errors.line1.message}
            </p>
          )}
        </div>

        {/* Address Line 2 */}
        <div>
          <label className="block text-sm font-medium text-poke-muted mb-1.5">
            Apt, Suite, etc.{" "}
            <span className="text-poke-muted/50 font-normal">(optional)</span>
          </label>
          <input
            {...register("line2")}
            type="text"
            autoComplete="address-line2"
            placeholder="Apt 4B"
            className={fieldClass(!!errors.line2)}
          />
          {errors.line2 && (
            <p className="mt-1.5 text-xs text-red-400">
              {errors.line2.message}
            </p>
          )}
        </div>

        {/* City + Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-poke-muted mb-1.5">
              City <span className="text-red-400">*</span>
            </label>
            <input
              {...register("city")}
              type="text"
              autoComplete="address-level2"
              placeholder="Phoenix"
              className={fieldClass(!!errors.city)}
            />
            {errors.city && (
              <p className="mt-1.5 text-xs text-red-400">
                {errors.city.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-poke-muted mb-1.5">
              Postal Code <span className="text-red-400">*</span>
            </label>
            <input
              {...register("postalCode")}
              type="text"
              autoComplete="postal-code"
              placeholder="85001"
              className={fieldClass(!!errors.postalCode)}
            />
            {errors.postalCode && (
              <p className="mt-1.5 text-xs text-red-400">
                {errors.postalCode.message}
              </p>
            )}
          </div>
        </div>

        {/* State + Country */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-poke-muted mb-1.5">
              State <span className="text-red-400">*</span>
            </label>
            {selectedCountry === "US" ? (
              <select
                {...register("state")}
                autoComplete="address-level1"
                className={fieldClass(!!errors.state)}
              >
                <option value="">Select state…</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...register("state")}
                type="text"
                autoComplete="address-level1"
                placeholder="Province / Region"
                className={fieldClass(!!errors.state)}
              />
            )}
            {errors.state && (
              <p className="mt-1.5 text-xs text-red-400">
                {errors.state.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-poke-muted mb-1.5">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              {...register("country")}
              autoComplete="country"
              className={fieldClass(!!errors.country)}
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="mt-1.5 text-xs text-red-400">
                {errors.country.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Saving…" : "Continue to Payment"}
        </Button>
      </div>
    </form>
  );
}
