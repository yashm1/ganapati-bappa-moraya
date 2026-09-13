const buckets = new Map();

export function getClientIdentifier(request) {
  for (const header of ["x-vercel-forwarded-for", "x-forwarded-for", "cf-connecting-ip", "x-real-ip"]) {
    const value = request.headers.get(header)?.split(",")[0]?.trim();
    if (value) return value.slice(0, 80);
  }
  return "unknown-client";
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function consumeRateLimit(namespace, identifier, limit, windowMs, now = Date.now()) {
  if (buckets.size > 5_000) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const key = `${namespace}:${identifier}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, retryAfter: 0 };
}

export function rateLimitResponse(result) {
  return Response.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(result.retryAfter),
      },
    },
  );
}

export async function hasValidImageSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((value, index) => bytes[index] === value);
  }
  if (file.type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}
