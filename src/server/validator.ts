/**
 * Fluent input validator for Next.js route handlers.
 *
 * Mirrors the PHP `Validator` utility with a chainable interface supporting
 * required fields, email format, string length, numeric checks, allowed
 * values, phone format, and minimum length.
 *
 * @module server/validator
 */

/** Field-keyed validation error messages. */
export type ValidationErrors = Record<string, string[]>;

export class Validator {
  private errors: ValidationErrors = {};
  private data: Record<string, unknown>;

  constructor(data: Record<string, unknown>) {
    this.data = data;
  }

  /** Validate that a field is present and non-empty. */
  required(field: string, label = ""): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (
      (typeof value === "string" && value.trim() === "") ||
      value === null ||
      value === ""
    ) {
      (this.errors[field] ??= []).push(`${label} is required.`);
    }
    return this;
  }

  /** Validate that a field contains a valid email address. */
  email(field: string, label = ""): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (value !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      (this.errors[field] ??= []).push(`${label} must be a valid email address.`);
    }
    return this;
  }

  /** Validate that a field is a string, optionally with a maximum length. */
  string(field: string, label = "", max = 0): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (value !== null && typeof value !== "string") {
      (this.errors[field] ??= []).push(`${label} must be a string.`);
    } else if (max > 0 && String(value).length > max) {
      (this.errors[field] ??= []).push(`${label} must not exceed ${max} characters.`);
    }
    return this;
  }

  /** Validate that a field is numeric. */
  numeric(field: string, label = ""): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (value !== "" && value !== null && isNaN(Number(value))) {
      (this.errors[field] ??= []).push(`${label} must be a number.`);
    }
    return this;
  }

  /** Validate that a field value is one of the allowed values. */
  inArray(field: string, allowed: unknown[], label = ""): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (value !== "" && value !== null && !allowed.includes(value)) {
      (this.errors[field] ??= []).push(`${label} is invalid.`);
    }
    return this;
  }

  /** Validate that a field contains a valid phone number. */
  phone(field: string, label = ""): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (value !== "" && !/^\+?[\d\s\-()]{7,20}$/.test(String(value))) {
      (this.errors[field] ??= []).push(`${label} must be a valid phone number.`);
    }
    return this;
  }

  /** Validate that a string field meets a minimum length. */
  minLength(field: string, min: number, label = ""): this {
    label = label || field;
    const value = this.data[field] ?? "";
    if (typeof value === "string" && value.trim().length < min) {
      (this.errors[field] ??= []).push(`${label} must be at least ${min} characters.`);
    }
    return this;
  }

  /** Check whether validation has failed. */
  fails(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  /** Return all collected validation errors. */
  getErrors(): ValidationErrors {
    return this.errors;
  }

  /** Return the original (validated) input data. */
  validated(): Record<string, unknown> {
    return this.data;
  }
}
