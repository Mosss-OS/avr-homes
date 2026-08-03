<?php

declare(strict_types=1);

/**
 * PaystackService — reusable client for the Paystack API.
 *
 * Covers transaction initialization/verification, recurring plans and
 * subscriptions (auto-debit), customer creation, and webhook signature
 * validation. Uses cURL directly (no Composer).
 *
 * @package AvrHomes
 */
class PaystackService
{
  private const BASE_URL = 'https://api.paystack.co';

  /** @return string Secret key from env, or empty string. */
  private static function secretKey(): string
  {
    return $_ENV['PAYSTACK_SECRET_KEY'] ?? '';
  }

  /**
   * Perform a cURL request against the Paystack API.
   *
   * @param string $method HTTP method (GET/POST/PUT/DELETE).
   * @param string $path   API path (e.g. /transaction/verify/{ref}).
   * @param array|null $body Optional JSON body.
   * @return array{ok: bool, status: int, body: array, error: string}
   */
  public static function request(string $method, string $path, ?array $body = null): array
  {
    $secretKey = self::secretKey();
    if (!$secretKey) {
      return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'PAYSTACK_SECRET_KEY not configured'];
    }

    $ch = curl_init(self::BASE_URL . $path);
    $headers = [
      'Authorization: Bearer ' . $secretKey,
      'Content-Type: application/json',
      'Accept: application/json',
    ];

    $options = [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_TIMEOUT => 20,
      CURLOPT_CUSTOMREQUEST => strtoupper($method),
    ];

    if ($body !== null) {
      $options[CURLOPT_POSTFIELDS] = json_encode($body);
    }

    curl_setopt_array($ch, $options);
    $response = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    if ($error) {
      return ['ok' => false, 'status' => $httpCode, 'body' => [], 'error' => "cURL error: {$error}"];
    }

    $parsed = json_decode($response, true) ?: [];
    return [
      'ok' => $httpCode >= 200 && $httpCode < 300 && !empty($parsed['status']),
      'status' => $httpCode,
      'body' => $parsed,
      'error' => ($parsed['message'] ?? '') ?: "HTTP {$httpCode}",
    ];
  }

  /**
   * Initialize a one-off transaction (inline popup / payment page).
   *
   * @param string $email
   * @param int $amountKobo Amount in kobo (NGN * 100).
   * @param string $reference Unique transaction reference.
   * @param array $metadata Free-form metadata (store schedule/membership ids).
   * @param string|null $planCode Optional Paystack plan code for recurring setups.
   * @return array{ok: bool, reference: ?string, authorization_url: ?string, access_code: ?string, body: array}
   */
  public static function initializeTransaction(
    string $email,
    int $amountKobo,
    string $reference,
    array $metadata = [],
    ?string $planCode = null
  ): array {
    $body = [
      'email' => $email,
      'amount' => $amountKobo,
      'reference' => $reference,
      'metadata' => $metadata,
      'currency' => 'NGN',
    ];
    if ($planCode !== null) {
      $body['plan'] = $planCode;
    }

    $res = self::request('POST', '/transaction/initialize', $body);
    if (!$res['ok']) {
      return ['ok' => false, 'reference' => null, 'authorization_url' => null, 'access_code' => null, 'body' => $res];
    }

    $data = $res['body']['data'] ?? [];
    return [
      'ok' => true,
      'reference' => $data['reference'] ?? null,
      'authorization_url' => $data['authorization_url'] ?? null,
      'access_code' => $data['access_code'] ?? null,
      'body' => $res,
    ];
  }

  /**
   * Verify a transaction reference. Returns transaction details on success.
   *
   * @return array{ok: bool, status: ?string, amountKobo: int, currency: string, reference: string, customer: array, authorization: array, body: array}
   */
  public static function verifyTransaction(string $reference): array
  {
    $res = self::request('GET', '/transaction/verify/' . urlencode($reference));
    if (!$res['ok']) {
      return ['ok' => false, 'status' => null, 'amountKobo' => 0, 'currency' => 'NGN', 'reference' => $reference, 'customer' => [], 'authorization' => [], 'body' => $res];
    }

    $data = $res['body']['data'] ?? [];
    return [
      'ok' => true,
      'status' => $data['status'] ?? null,
      'amountKobo' => (int)($data['amount'] ?? 0),
      'currency' => $data['currency'] ?? 'NGN',
      'reference' => $data['reference'] ?? $reference,
      'customer' => $data['customer'] ?? [],
      'authorization' => $data['authorization'] ?? [],
      'body' => $res,
    ];
  }

  /**
   * Create or fetch a customer by email.
   *
   * @return array{ok: bool, customer_code: ?string, body: array}
   */
  public static function createCustomer(string $email, string $name = ''): array
  {
    $body = ['email' => $email];
    if ($name !== '') {
      $body['first_name'] = $name;
    }
    $res = self::request('POST', '/customer', $body);
    if (!$res['ok']) {
      return ['ok' => false, 'customer_code' => null, 'body' => $res];
    }
    return [
      'ok' => true,
      'customer_code' => $res['body']['data']['customer_code'] ?? null,
      'body' => $res,
    ];
  }

  /**
   * Create a recurring payment plan.
   *
   * @return array{ok: bool, plan_code: ?string, body: array}
   */
  public static function createPlan(string $name, int $amountKobo, string $interval = 'monthly', string $description = ''): array
  {
    $body = [
      'name' => $name,
      'amount' => $amountKobo,
      'interval' => $interval,
      'currency' => 'NGN',
      'description' => $description,
    ];
    $res = self::request('POST', '/plan', $body);
    if (!$res['ok']) {
      return ['ok' => false, 'plan_code' => null, 'body' => $res];
    }
    return [
      'ok' => true,
      'plan_code' => $res['body']['data']['plan_code'] ?? null,
      'body' => $res,
    ];
  }

  /**
   * Create a subscription so Paystack auto-debits the card each cycle.
   *
   * @return array{ok: bool, subscription_code: ?string, body: array}
   */
  public static function createSubscription(string $customerCode, string $planCode, string $authorizationCode, ?string $startDate = null): array
  {
    $body = [
      'customer' => $customerCode,
      'plan' => $planCode,
      'authorization' => $authorizationCode,
    ];
    if ($startDate !== null) {
      $body['start_date'] = $startDate;
    }
    $res = self::request('POST', '/subscription', $body);
    if (!$res['ok']) {
      return ['ok' => false, 'subscription_code' => null, 'body' => $res];
    }
    return [
      'ok' => true,
      'subscription_code' => $res['body']['data']['subscription_code'] ?? null,
      'body' => $res,
    ];
  }

  /**
   * Disable a subscription (stop future auto-debits).
   *
   * @return array{ok: bool, body: array}
   */
  public static function disableSubscription(string $subscriptionCode): array
  {
    return self::request('POST', '/subscription/' . urlencode($subscriptionCode) . '/disable', ['code' => $subscriptionCode, 'token' => '']);
  }

  /**
   * Validate the signature of an incoming Paystack webhook.
   *
   * @param string $signatureHeader Value of the X-Paystack-Signature header.
   * @param string $rawBody Raw request body.
   * @return bool True if signature matches the secret key.
   */
  public static function verifyWebhookSignature(string $signatureHeader, string $rawBody): bool
  {
    $secretKey = self::secretKey();
    if (!$secretKey) {
      return false;
    }
    $expected = hash_hmac('sha512', $rawBody, $secretKey);
    return hash_equals($expected, $signatureHeader);
  }
}
