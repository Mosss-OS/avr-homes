<?php

declare(strict_types=1);

class Validator
{
  private array $errors = [];
  private array $data;

  public function __construct(array $data)
  {
    $this->data = $data;
  }

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

  public function email(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
      $this->errors[$field][] = "{$label} must be a valid email address.";
    }
    return $this;
  }

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

  public function numeric(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && $value !== null && !is_numeric($value)) {
      $this->errors[$field][] = "{$label} must be a number.";
    }
    return $this;
  }

  public function inArray(string $field, array $allowed, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && $value !== null && !in_array($value, $allowed, true)) {
      $this->errors[$field][] = "{$label} is invalid.";
    }
    return $this;
  }

  public function phone(string $field, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if ($value !== '' && !preg_match('/^\+?[\d\s\-()]{7,20}$/', $value)) {
      $this->errors[$field][] = "{$label} must be a valid phone number.";
    }
    return $this;
  }

  public function minLength(string $field, int $min, string $label = ''): self
  {
    $label = $label ?: $field;
    $value = $this->data[$field] ?? '';
    if (is_string($value) && strlen(trim($value)) < $min) {
      $this->errors[$field][] = "{$label} must be at least {$min} characters.";
    }
    return $this;
  }

  public function fails(): bool
  {
    return !empty($this->errors);
  }

  public function getErrors(): array
  {
    return $this->errors;
  }

  public function validated(): array
  {
    return $this->data;
  }
}
