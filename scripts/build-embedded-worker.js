const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workerPath = path.join(root, "src", "worker.js");
const outPath = path.join(root, "src", "worker-embedded.js");

const assets = {
  "/": readPublic("index.html", "text/html; charset=utf-8", { revalidate: true }),
  "/index.html": readPublic("index.html", "text/html; charset=utf-8", { revalidate: true }),
  "/admin.html": readPublic("admin.html", "text/html; charset=utf-8", { revalidate: true }),
  "/play.html": readPublic("play.html", "text/html; charset=utf-8", { revalidate: true }),
  "/daily.html": readPublic("daily.html", "text/html; charset=utf-8", { revalidate: true }),
  "/study.html": readPublic("study.html", "text/html; charset=utf-8", { revalidate: true }),
  "/styles.css": readPublic("styles.css", "text/css; charset=utf-8"),
  "/daily.css": readPublic("daily.css", "text/css; charset=utf-8"),
  "/study.css": readPublic("study.css", "text/css; charset=utf-8"),
  "/upload.js": readPublic("upload.js", "text/javascript; charset=utf-8"),
  "/play.js": readPublic("play.js", "text/javascript; charset=utf-8"),
  "/daily.js": readPublic("daily.js", "text/javascript; charset=utf-8"),
  "/study-speech-cache.js": readPublic("study-speech-cache.js", "text/javascript; charset=utf-8"),
  "/study.js": readPublic("study.js", "text/javascript; charset=utf-8"),
  "/plumber-example.mp3": readPublicBinary("plumber-example.mp3", "audio/mpeg", { immutable: true }),
  "/favicon.ico": {
    contentType: "image/svg+xml",
    immutable: true,
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#f7f6f2"/><path d="M8 18c6-7 10-7 16 0" fill="none" stroke="#211d18" stroke-width="2.6" stroke-linecap="round"/><path d="M10 23h12" stroke="#211d18" stroke-width="2.6" stroke-linecap="round"/></svg>'
  }
};

let source = fs.readFileSync(workerPath, "utf8");
source = source.replace(
  "    return env.ASSETS.fetch(request);\n",
  "    return serveStatic(request, url.pathname);\n"
);

const staticBlock = `
const STATIC_ASSETS = ${JSON.stringify(assets, null, 2)};

const STATIC_SHORT_CACHE_SECONDS = 300;
const STATIC_LONG_CACHE_SECONDS = 31536000;

async function serveStatic(request, pathname) {
  const asset = STATIC_ASSETS[pathname];

  if (!asset) {
    return new Response("Not found.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=60",
        "expires": staticFutureDate(60)
      }
    });
  }

  const maxAge = asset.immutable ? STATIC_LONG_CACHE_SECONDS : STATIC_SHORT_CACHE_SECONDS;
  const headers = {
    "content-type": asset.contentType,
    "cache-control": asset.revalidate
      ? "no-cache"
      : asset.immutable
        ? \`public, max-age=\${maxAge}, immutable\`
        : \`public, max-age=\${maxAge}\`,
    "expires": asset.revalidate ? "0" : staticFutureDate(maxAge)
  }

  return new Response(asset.base64 ? staticBase64ToBytes(asset.base64) : asset.body, {
    headers
  });
}

function staticFutureDate(seconds) {
  return new Date(Date.now() + seconds * 1000).toUTCString();
}

function staticBase64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
`;

fs.writeFileSync(outPath, `${staticBlock}\n${source}`);

function readPublic(file, contentType, options = {}) {
  return {
    contentType,
    ...options,
    body: fs.readFileSync(path.join(root, "public", file), "utf8")
  };
}

function readPublicBinary(file, contentType, options = {}) {
  return {
    contentType,
    ...options,
    base64: fs.readFileSync(path.join(root, "public", file)).toString("base64")
  };
}
