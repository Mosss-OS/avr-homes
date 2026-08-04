/**
 * PaystackService — reusable client for the Paystack API.
 *
 * Covers transaction initialization/verification, recurring plans and
 * subscriptions (auto-debit), customer creation, and webhook signature
 * validation. Mirrors the PHP `PaystackService`.
 *
 * @module server/paystack
 */

const BASE_URL = "https://api.paystack.co";

function secretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY ?? "";
}

interface PaystackRequestResult {
  ok: boolean;
  status: number;
  body: Record<string, any>;
  error: string;
}

/**
 * Perform a request against the Paystack API.
 */
export async function request(
  method: string,
  path: string,
  body?: Record<string, unknown> | null
): Promise<PaystackRequestResult> {
  const key = secretKey();
  if (!key) {
    return { ok: false, status: 0, body: {}, error: "PAYSTACK_SECRET_KEY not configured" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let httpCode = 0;
  let parsed: Record<string, any> = {};
  try {
    const res = await fetch(BASE_URL + path, {
      method: method.toUpperCase(),
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    httpCode = res.status;
    parsed = (await res.json().catch(() => ({}))) || {};
  } catch (err) {
    return { ok: false, status: httpCode, body: {}, error: `request error: ${(err as Error).message}` };
  }

  return {
    ok: httpCode >= 200 && httpCode < 300 && Boolean(parsed.status),
    status: httpCode,
    body: parsed,
    error: (parsed.message ?? "") || `HTTP ${httpCode}`,
  };
}

/**
 * Initialize a one-off transaction (inline popup / payment page).
 */
export async function initializeTransaction(
  email: string,
  amountKobo: number,
  reference: string,
  metadata: Record<string, unknown> = {},
  planCode: string | null = null
): Promise<{
  ok: boolean;
  reference: string | null;
  authorization_url: string | null;
  access_code: string | null;
  body: any;
}> {
  const payload: Record<string, unknown> = {
    email,
    amount: amountKobo,
    reference,
    metadata,
    currency: "NGN",
  };
  if (planCode != null) payload.plan = planCode;

  const res = await request("POST", "/transaction/initialize", payload);
  if (!res.ok) {
    return { ok: false, reference: null, authorization_url: null, access_code: null, body: res };
  }

  const data = res.body?.data ?? {};
  return {
    ok: true,
    reference: data.reference ?? null,
    authorization_url: data.authorization_url ?? null,
    access_code: data.access_code ?? null,
    body: res,
  };
}

/**
 * Verify a transaction reference. Returns transaction details on success.
 */
export async function verifyTransaction(reference: string): Promise<{
  ok: boolean;
  status: string | null;
  amountKobo: number;
  currency: string;
  reference: string;
  customer: Record<string, any>;
  authorization: Record<string, any>;
  body: any;
}> {
  const res = await request("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
  if (!res.ok) {
    return {
      ok: false,
      status: null,
      amountKobo: 0,
      currency: "NGN",
      reference,
      customer: {},
      authorization: {},
      body: res,
    };
  }

  const data = res.body?.data ?? {};
  return {
    ok: true,
    status: data.status ?? null,
    amountKobo: Number(data.amount ?? 0),
    currency: data.currency ?? "NGN",
    reference: data.reference ?? reference,
    customer: data.customer ?? {},
    authorization: data.authorization ?? {},
    body: res,
  };
}

/**
 * Create or fetch a customer by email.
 */
export async function createCustomer(
  email: string,
  name = ""
): Promise<{ ok: boolean; customer_code: string | null; body: any }> {
  const payload: Record<string, unknown> = { email };
  if (name !== "") payload.first_name = name;
  const res = await request("POST", "/customer", payload);
  if (!res.ok) return { ok: false, customer_code: null, body: res };
  return { ok: true, customer_code: res.body?.data?.customer_code ?? null, body: res };
}

/**
 * Create a recurring payment plan.
 */
export async function createPlan(
  name: string,
  amountKobo: number,
  interval = "monthly",
  description = ""
): Promise<{ ok: boolean; plan_code: string | null; body: any }> {
  const res = await request("POST", "/plan", {
    name,
    amount: amountKobo,
    interval,
    currency: "NGN",
    description,
  });
  if (!res.ok) return { ok: false, plan_code: null, body: res };
  return { ok: true, plan_code: res.body?.data?.plan_code ?? null, body: res };
}

/**
 * Create a subscription so Paystack auto-debits the card each cycle.
 */
export async function createSubscription(
  customerCode: string,
  planCode: string,
  authorizationCode: string,
  startDate: string | null = null
): Promise<{ ok: boolean; subscription_code: string | null; body: any }> {
  const payload: Record<string, unknown> = {
    customer: customerCode,
    plan: planCode,
    authorization: authorizationCode,
  };
  if (startDate != null) payload.start_date = startDate;
  const res = await request("POST", "/subscription", payload);
  if (!res.ok) return { ok: false, subscription_code: null, body: res };
  return { ok: true, subscription_code: res.body?.data?.subscription_code ?? null, body: res };
}

/**
 * Disable a subscription (stop future auto-debits).
 */
export async function disableSubscription(subscriptionCode: string): Promise<PaystackRequestResult> {
  return request("POST", `/subscription/${encodeURIComponent(subscriptionCode)}/disable`, {
    code: subscriptionCode,
    token: "",
  });
}

/**
 * Validate the signature of an incoming Paystack webhook.
 */
export async function verifyWebhookSignature(signatureHeader: string, rawBody: string): Promise<boolean> {
  const key = secretKey();
  if (!key) return false;
  const expected = await createHmac(signatureHeader, key, rawBody);
  return expected;
}

async function createHmac(signature: string, key: string, rawBody: string): Promise<boolean> {
  const crypto = await import("node:crypto");
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  return expected === signature;
}
