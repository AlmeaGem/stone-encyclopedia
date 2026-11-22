const encoder = new TextEncoder();

const constantTimeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
};

const hexBytes = (value) => {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/../g), (byte) => parseInt(byte, 16));
};

/**
 * Verify Stripe's v1 signature against the exact, unmodified request body.
 * A valid signature alone does not authorize granting entitlements.
 */
export async function verifyStripeSignature(
  rawBody,
  signatureHeader,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (
    typeof rawBody !== 'string' ||
    typeof signatureHeader !== 'string' ||
    !secret?.startsWith('whsec_')
  ) {
    return false;
  }

  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestampField = parts.find((part) => /^t=\d+$/.test(part));
  if (!timestampField) return false;
  const timestamp = Number(timestampField.slice(2));
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) {
    return false;
  }

  const signatures = parts
    .filter((part) => /^v1=[0-9a-f]{64}$/i.test(part))
    .map((part) => hexBytes(part.slice(3)));
  if (signatures.length === 0) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(timestamp + '.' + rawBody),
    ),
  );
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}
