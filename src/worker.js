const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const FEATURED_PAGE_ID = "eb762ddb";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return env.ASSETS.fetch(new Request(url.origin + "/signup.html", request));
    }

    if (request.method === "POST" && url.pathname === "/api/signup") {
      try {
        return await handleSignup(request, env);
      } catch (error) {
        return json({ error: error.message || "Signup failed." }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/welcome/respond") {
      try {
        return await saveWelcomeResponse(request, env);
      } catch (error) {
        return json({ error: error.message || "Failed to save response." }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/welcome/respond") {
      const contactId = url.searchParams.get("contact_id");
      if (!contactId) {
        return json({ error: "contact_id is required." }, 400);
      }
      return getWelcomeResponse(contactId, env);
    }

    if (request.method === "GET" && url.pathname === "/api/welcome/time-poll") {
      return getTimePoll(env);
    }

    return env.ASSETS.fetch(request);
  }
};

function publicBaseUrl(env, fallbackOrigin) {
  const configured = String(env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  return configured || fallbackOrigin;
}

async function handleSignup(request, env) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return json({ message: "A valid email is required." }, 400);
  }

  const resendHeaders = {
    "authorization": `Bearer ${env.RESEND_API_KEY}`,
    "content-type": "application/json"
  };

  const contactResponse = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: resendHeaders,
    body: JSON.stringify({
      email,
      unsubscribed: false
    })
  });

  if (!contactResponse.ok && contactResponse.status !== 409) {
    const text = await contactResponse.text();
    return json({ message: `Failed to create contact: ${text}` }, 500);
  }

  let contactId = "";
  try {
    const contactData = await contactResponse.json();
    contactId = contactData?.id || "";
  } catch (e) {}
  if (!contactId) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
    contactId = Array.from(new Uint8Array(hashBuffer)).slice(0, 8).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  await env.PAGES_BUCKET.put(`welcome/${contactId}/contact.json`, JSON.stringify({
    contact_id: contactId,
    email,
    source: "signup_page",
    created_at: new Date().toISOString()
  }), {
    httpMetadata: { content_type: "application/json; charset=utf-8" }
  });

  await fetch("https://api.resend.com/events/send", {
    method: "POST",
    headers: resendHeaders,
    body: JSON.stringify({
      event: "serial.subscribed",
      email,
      payload: { source: "signup_page", contact_id: contactId }
    })
  });

  return json({ ok: true, contact_id: contactId });
}

async function saveWelcomeResponse(request, env) {
  const body = await request.json().catch(() => null);
  const contactId = String(body?.contact_id || "").trim();

  if (!contactId) {
    return json({ error: "contact_id is required." }, 400);
  }

  const key = `welcome/${contactId}/responses.json`;

  let existing = {};
  const object = await env.PAGES_BUCKET.get(key);
  if (object) {
    try {
      existing = await object.json();
    } catch (e) {}
  }

  const merged = { ...existing, contact_id: contactId };
  if (body.event_id !== undefined) merged.event_id = body.event_id;
  if (body.event_status !== undefined) merged.event_status = body.event_status;
  if (body.preferred_time !== undefined) merged.preferred_time = body.preferred_time;
  if (body.available_slots !== undefined) merged.available_slots = body.available_slots;
  if (body.story_preferences !== undefined) merged.story_preferences = body.story_preferences;
  if (body.speaking_interest !== undefined) merged.speaking_interest = body.speaking_interest;
  if (body.speaking_clicked_at !== undefined) merged.speaking_clicked_at = body.speaking_clicked_at;
  if (body.source !== undefined) merged.source = body.source;
  if (body.timezone !== undefined) merged.timezone = body.timezone;
  if (body.booked_at !== undefined) merged.booked_at = body.booked_at;
  if (body.submitted_at !== undefined) merged.submitted_at = body.submitted_at;
  if (body.updated_at !== undefined) merged.updated_at = body.updated_at;
  merged.last_updated = new Date().toISOString();

  await env.PAGES_BUCKET.put(key, JSON.stringify(merged), {
    httpMetadata: { content_type: "application/json; charset=utf-8" }
  });

  return json({ ok: true });
}

async function getWelcomeResponse(contactId, env) {
  const key = `welcome/${contactId}/responses.json`;
  const object = await env.PAGES_BUCKET.get(key);

  if (!object) {
    return json({ found: false });
  }

  const data = await object.json();
  return json({ found: true, data });
}

async function getTimePoll(env) {
  const counts = {};
  const list = await env.PAGES_BUCKET.list({ prefix: "welcome/" });

  for (const item of list.objects) {
    if (!item.key.endsWith("/responses.json")) continue;
    try {
      const object = await env.PAGES_BUCKET.get(item.key);
      if (!object) continue;
      const data = await object.json();
      if (data.available_slots && Array.isArray(data.available_slots)) {
        for (const slot of data.available_slots) {
          counts[slot] = (counts[slot] || 0) + 1;
        }
      } else if (data.preferred_time) {
        counts[data.preferred_time] = (counts[data.preferred_time] || 0) + 1;
      }
    } catch (e) {}
  }

  return json({ counts });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}