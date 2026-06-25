type PayPalTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type PayPalOrderLink = {
  href: string;
  rel: string;
  method?: string;
};

export type PayPalOrderResponse = {
  id?: string;
  status?: string;
  links?: PayPalOrderLink[];
  message?: string;
  details?: { description?: string; issue?: string }[];
};

export function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) throw new Error('PayPal is not configured yet.');

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({})) as PayPalTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Could not connect to PayPal.');
  }
  return data.access_token;
}
