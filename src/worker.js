const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const FIVE_MINUTES_SECONDS = 300;
const ONE_YEAR_SECONDS = 31536000;
const FEATURED_PAGE_ID = "eb762ddb";
const ADMIN_PATHS = new Set(["/admin.html", "/upload.js"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return Response.redirect(`${url.origin}/play.html?id=${encodeURIComponent(env.FEATURED_PAGE_ID || FEATURED_PAGE_ID)}`, 302);
    }

    if (url.pathname === "/admin") {
      return Response.redirect(`${url.origin}/admin.html`, 302);
    }

    if (ADMIN_PATHS.has(url.pathname)) {
      const guard = requireAdmin(request, env);
      if (guard) return guard;
    }

    if (url.pathname === "/api/generate") {
      const guard = requireAdmin(request, env);
      if (guard) return guard;

      if (request.method !== "POST") {
        return new Response("Method not allowed.", {
          status: 405,
          headers: {
            "allow": "POST",
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store"
          }
        });
      }

      try {
        return await generatePage(request, env, url.origin);
      } catch (error) {
        return json({ error: error.message || "Generation failed." }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/define") {
      try {
        return await defineWord(request, env);
      } catch (error) {
        return json({ error: error.message || "Definition failed." }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/study-speech") {
      try {
        return await generateStudySpeech(request, env);
      } catch (error) {
        return json({ error: error.message || "Study speech failed." }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/study-help") {
      try {
        return await generateStudyHelp(request, env);
      } catch (error) {
        return json({ error: error.message || "Study help failed." }, 500);
      }
    }

    const pageMatch = url.pathname.match(/^\/api\/pages\/([^/]+)$/);
    if (request.method === "GET" && pageMatch) {
      return getPage(pageMatch[1], env);
    }

    const audioMatch = url.pathname.match(/^\/api\/audio\/([^/]+)$/);
    if (request.method === "GET" && audioMatch) {
      return getAudio(audioMatch[1], env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function generatePage(request, env, origin) {
  const body = await request.json().catch(() => null);
  const text = String(body?.text || "").trim();
  const title = String(body?.title || "Untitled").trim() || "Untitled";
  const voiceId = String(body?.voiceId || env.ELEVENLABS_VOICE_ID || "").trim();

  if (!text) {
    return json({ error: "Text is required." }, 400);
  }

  if (!voiceId || voiceId === "replace-with-your-voice-id") {
    return json({ error: "A valid ElevenLabs voice ID is required." }, 400);
  }

  const eleven = await createSpeechWithTimestamps({
    apiKey: env.ELEVENLABS_API_KEY,
    voiceId,
    modelId: env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
    text
  });

  const id = crypto.randomUUID().slice(0, 8);
  const audio = base64ToBytes(eleven.audio_base64);
  const alignment = eleven.normalized_alignment || eleven.alignment;
  const words = getWordTimestamps(alignment);

  const page = {
    id,
    title,
    text,
    words,
    audioUrl: `/api/audio/${id}`,
    createdAt: new Date().toISOString()
  };

  await env.PAGES_BUCKET.put(`items/${id}/audio.mp3`, audio, {
    httpMetadata: { contentType: "audio/mpeg" }
  });
  await env.PAGES_BUCKET.put(`items/${id}/transcript.json`, JSON.stringify(page), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });

  return json({
    id,
    url: `${publicBaseUrl(env, origin)}/play.html?id=${encodeURIComponent(id)}`
  });
}

function publicBaseUrl(env, fallbackOrigin) {
  const configured = String(env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  return configured || fallbackOrigin;
}

function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin password is not configured.", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  const auth = request.headers.get("authorization") || "";
  const password = getBasicAuthPassword(auth);

  if (password === env.ADMIN_PASSWORD) {
    return null;
  }

  return new Response("Password required.", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Synced Pages Admin", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function getBasicAuthPassword(authHeader) {
  if (!authHeader.startsWith("Basic ")) {
    return "";
  }

  try {
    const decoded = atob(authHeader.slice(6));
    const separator = decoded.indexOf(":");
    return separator === -1 ? "" : decoded.slice(separator + 1);
  } catch {
    return "";
  }
}

async function defineWord(request, env) {
  if (!env.OPENAI_API_KEY) {
    return json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY as a Worker secret." }, 500);
  }

  const body = await request.json().catch(() => null);
  const word = String(body?.word || "").trim();
  const context = String(body?.context || "").trim().slice(0, 600);
  const targetLanguage = String(body?.targetLanguage || "Turkish").trim().slice(0, 60);

  if (!word) {
    return json({ error: "Word is required." }, 400);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        {
          role: "system",
          content: "You are a concise language-learning dictionary. Return only valid JSON."
        },
        {
          role: "user",
          content: [
            "Explain this word for an English language learner.",
            `Word: ${word}`,
            `Context: ${context || "No context supplied."}`,
            `Learner language: ${targetLanguage}`,
            "Write the definition in simple B1 conversational English, like a learner's dictionary.",
            "Use the context only to choose the right meaning.",
            "Write a new short example sentence in English that clearly demonstrates the meaning through the situation, cause, feeling, or contrast.",
            "The example must help the learner understand the target word, not merely place the word in a generic sentence.",
            "Do not quote or continue the story text in the example.",
            "Return JSON with keys: word, definition, translation, example."
          ].join("\n")
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "word_help",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              word: { type: "string" },
              definition: { type: "string" },
              translation: { type: "string" },
              example: { type: "string" }
            },
            required: ["word", "definition", "translation", "example"]
          }
        }
      },
      reasoning: {
        effort: "minimal"
      },
      max_output_tokens: 1600
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    return json({ error: `OpenAI failed (${response.status}): ${responseText || response.statusText}` }, 500);
  }

  return json(parseOpenAIJson(responseText));
}

async function generateStudySpeech(request, env) {
  const body = await request.json().catch(() => null);
  const text = String(body?.text || "").trim().slice(0, 900);
  const voiceId = String(body?.voiceId || env.ELEVENLABS_VOICE_ID || "").trim();

  if (!text) {
    return json({ error: "Text is required." }, 400);
  }

  if (!voiceId || voiceId === "replace-with-your-voice-id") {
    return json({ error: "A valid ElevenLabs voice ID is required." }, 400);
  }

  const eleven = await createSpeechWithTimestamps({
    apiKey: env.ELEVENLABS_API_KEY,
    voiceId,
    modelId: env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5",
    text
  });

  const alignment = eleven.normalized_alignment || eleven.alignment;

  return json({
    audioUrl: `data:audio/mpeg;base64,${eleven.audio_base64}`,
    words: getWordTimestamps(alignment)
  });
}

async function generateStudyHelp(request, env) {
  const apiKey = env.STUDY_OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: "OpenAI API key is missing. Add STUDY_OPENAI_API_KEY or OPENAI_API_KEY as a Worker secret." }, 500);
  }

  const body = await request.json().catch(() => null);
  const sentence = String(body?.sentence || "").trim().slice(0, 900);
  const target = String(body?.target || "").trim().slice(0, 80);
  const keyPhrase = String(body?.keyPhrase || target).trim().slice(0, 120);
  const choices = Array.isArray(body?.choices)
    ? body.choices.map((choice) => String(choice).trim()).filter(Boolean).slice(0, 5)
    : [];
  const helperWords = Array.isArray(body?.helperWords)
    ? body.helperWords.map((word) => String(word).trim()).filter(Boolean).slice(0, 6)
    : [];
  const targetLanguage = String(body?.targetLanguage || "Turkish").trim().slice(0, 60);

  if (!sentence || !target) {
    return json({ error: "Sentence and target are required." }, 400);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [
            "You write tiny language-learning help cards for adult English learners.",
            "Return only valid JSON.",
            "Be clear, direct, and practical. No labels, no bullet points, no academic tone, no fluff."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            "Create help for this gap-fill question.",
            `Full correct sentence: ${sentence}`,
            `Correct answer / target: ${target}`,
            `Key phrase to highlight: ${keyPhrase}`,
            `Answer choices: ${choices.join(", ") || "Not supplied"}`,
            `Clue/helper words: ${helperWords.join(", ") || "None"}`,
            `Learner language: ${targetLanguage}`,
            "",
            "Write exactly two useful outputs:",
            "1. whyItMatters: one short sentence in simple, learner-friendly English explaining why the answer sounds natural here.",
            "2. translation: a natural, colloquial translation of the whole correct sentence into the learner language. Translate the meaning, not word by word.",
            "",
            "For whyItMatters, get straight to the pith.",
            "Use direct second-person wording such as 'When you...' or 'You wouldn't say...' if it helps.",
            "Use learner-friendly wording. Do not use grammar/teacher terms like 'collocation'; say 'goes together', 'sounds natural', or 'we usually say'.",
            "Only contrast with the other answer choices if there is an actual learning point.",
            "Point out useful differences from the learner's language structure or literal translation when they help, e.g. 'In Italian you might say it more like...'.",
            "Notice likely L1 interference, literal-translation traps, and false friends for the learner language, but mention them only if they explain the mistake simply.",
            "If there is no useful learner-language contrast, do not invent one; just explain the natural English phrase.",
            "Mention the key phrase where helpful.",
            "Avoid long grammar terms unless necessary.",
            "Keep whyItMatters under 26 words.",
            "Keep translation natural for everyday speech.",
            "Return JSON with keys: keyPhrase, whyItMatters, translation."
          ].join("\n")
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "study_help",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              keyPhrase: { type: "string" },
              whyItMatters: { type: "string" },
              translation: { type: "string" }
            },
            required: ["keyPhrase", "whyItMatters", "translation"]
          }
        }
      },
      reasoning: {
        effort: "minimal"
      },
      max_output_tokens: 900
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    return json({ error: `OpenAI failed (${response.status}): ${responseText || response.statusText}` }, 500);
  }

  return json(parseOpenAIJson(responseText));
}

function parseOpenAIJson(responseText) {
  const data = JSON.parse(responseText);
  const text = data.output_text || findFirstText(data.output) || findFirstText(data.choices);

  if (!text) {
    throw new Error("OpenAI returned no definition text.");
  }

  try {
    return JSON.parse(extractJsonObject(text));
  } catch {
    throw new Error("OpenAI returned definition text in an unexpected format.");
  }
}

function findFirstText(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (typeof value.text === "string" && value.text.trim()) {
    return value.text;
  }

  if (typeof value.content === "string" && value.content.trim()) {
    return value.content;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = findFirstText(item);
      if (text) return text;
    }
  } else {
    for (const item of Object.values(value)) {
      const text = findFirstText(item);
      if (text) return text;
    }
  }

  return "";
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return trimmed;
  }

  return trimmed.slice(start, end + 1);
}

async function createSpeechWithTimestamps({ apiKey, voiceId, modelId, text }) {
  if (!apiKey) {
    throw new Error("ElevenLabs API key is missing.");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text,
      model_id: modelId
    })
  });

  if (!response.ok) {
    const message = await response.text();
    const requestId = response.headers.get("request-id") || response.headers.get("x-request-id");
    const detail = message || response.statusText || "No response body";
    throw new Error(`ElevenLabs failed (${response.status}${requestId ? `, request ${requestId}` : ""}): ${detail}`);
  }

  return response.json();
}

async function getPage(id, env) {
  const object = await env.PAGES_BUCKET.get(`items/${id}/transcript.json`);

  if (!object) {
    return json({ error: "Page not found." }, 404);
  }

  return new Response(object.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${FIVE_MINUTES_SECONDS}`,
      "expires": futureDate(FIVE_MINUTES_SECONDS)
    }
  });
}

async function getAudio(id, env) {
  const object = await env.PAGES_BUCKET.get(`items/${id}/audio.mp3`);

  if (!object) {
    return new Response("Audio not found.", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
      "expires": futureDate(ONE_YEAR_SECONDS)
    }
  });
}

function getWordTimestamps(alignment) {
  const words = [];
  let currentWord = "";
  let wordStart = null;
  let lastEnd = null;

  const characters = alignment?.characters || [];
  const startTimes = alignment?.character_start_times_seconds || [];
  const endTimes = alignment?.character_end_times_seconds || [];

  characters.forEach((char, index) => {
    const start = startTimes[index];
    const end = endTimes[index];

    if (/\s/.test(char)) {
      if (currentWord) {
        words.push({ word: currentWord, start: wordStart, end: lastEnd });
        currentWord = "";
        wordStart = null;
      }
      return;
    }

    if (wordStart === null) {
      wordStart = start;
    }

    currentWord += char;
    lastEnd = end;
  });

  if (currentWord) {
    words.push({ word: currentWord, start: wordStart, end: lastEnd });
  }

  return words;
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function futureDate(seconds) {
  return new Date(Date.now() + seconds * 1000).toUTCString();
}
