<?php

/**
 * Input validation utility.
 *
 * Provides a fluent interface for validating input data with
 * support for required fields, email format, string length,
 * numeric checks, allowed values, phone format, and minimum length.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * Fluent input validator.
 */
class Validator
{
  private array $errors = [];
  private array $data;

  /**
   * @param array<string,mixed> $data Associative array of input data to validate.
   */
  public function __construct(array $data)
  {
    $this->data = $data;
  }

  /**
   * Validate that a field is present and non-empty.
   *
   * @param string $field Field key.
   * @param string $label Human-readable label (defaults to field key).
   * @return $this
   */
  public function required(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if (is_string($value) && trim($value) === '') {
      $this->errors[$field][] = "{$label} is required.";
    } elseif ($value === null || $value === '') {
      $this->errors[$field][] = "{$label} is required.";
    }
    return $this;
  }

  /**
   * Validate that a field contains a valid email address.
   *
   * @param string $field Field key.
   * @param string $label Human-readable label (defaults to field key).
   * @return $this
   */
  public function email(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
      $this->errors[$field][] = "{$label} must be a valid email address.";
    }
    return $this;
  }

  /**
   * Validate that a field is a string, optionally with a maximum length.
   *
   * @param string $field Field key.
   * @param string $label Human-readable label (defaults to field key).
   * @param int    $max   Maximum allowed length (0 = no limit).
   * @return $this
   */
  public function string(string $field, string $label = '', int $max = 0): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== null && !is_string($value)) {
      $this->errors[$field][] = "{$label} must be a string.";
    } elseif ($max > 0 && strlen($value) > $max) {
      $this->errors[$field][] = "{$label} must not exceed {$max} characters.";
    }
    return $this;
  }

  /**
   * Validate that a field is numeric.
   *
   * @param string $field Field key.
   * @param string $label Human-readable label (defaults to field key).
   * @return $this
   */
  public function numeric(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && $value !== null && !is_numeric($value)) {
      $this->errors[$field][] = "{$label} must be a number.";
    }
    return $this;
  }

  /**
   * Validate that a field value is one of the allowed values.
   *
   * @param string $field   Field key.
   * @param array  $allowed Array of acceptable values.
   * @param string $label   Human-readable label (defaults to field key).
   * @return $this
   */
  public function inArray(string $field, array $allowed, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && $value !== null && !in_array($value, $allowed, true)) {
      $this->errors[$field][] = "{$label} is invalid.";
    }
    return $this;
  }

  /**
   * Validate that a field contains a valid phone number.
   *
   * @param string $field Field key.
   * @param string $label Human-readable label (defaults to field key).
   * @return $this
   */
  public function phone(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && !preg_match('/^\+?[\d\s\-()]{7,20}$/', $value)) {
      $this->errors[$field][] = "{$label} must be a valid phone number.";
    }
    return $this;
  }

  /**
   * Validate that a string field meets a minimum length.
   *
   * @param string $field Field key.
   * @param int    $min   Minimum number of characters.
   * @param string $label Human-readable label (defaults to field key).
   * @return $this
   */
  public function minLength(string $field, int $min, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if (is_string($value) && strlen(trim($value)) < $min) {
      $this->errors[$field][] = "{$label} must be at least {$min} characters.";
    }
    return $this;
  }

  /**
   * Check whether validation has failed.
   *
   * @return bool True if any errors have been collected.
   */
  public function fails(): bool
  {
    return !empty($this->errors);
  }

  /**
   * Return all collected validation errors.
   *
   * @return array<string,array<string>> Field-keyed error messages.
   */
  public function getErrors(): array
  {
    return $this->errors;
  }

  /**
   * Return the original (validated) input data.
   *
   * @return array<string,mixed> Input data.
   */
  public function validated(): array
  {
    return $this->data;
  }
}
