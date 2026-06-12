const fs = require("fs");
const path = require("path");

const accountId = "e124dbb728090a9a6c31ba6f08ce4e26";
const scriptName = process.env.SCRIPT_NAME || "synced-text-pages";
const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(root, "..");
const configPath = path.join(workspaceRoot, ".config", ".wrangler", "config", "default.toml");
const workerPath = path.join(root, "src", "worker-embedded.js");

const token = readWranglerToken(configPath);
const code = fs.readFileSync(workerPath, "utf8");
const form = new FormData();

form.append("metadata", new Blob([JSON.stringify({ main_module: "worker.js" })], {
  type: "application/json"
}));
form.append("worker.js", new Blob([code], {
  type: "application/javascript+module"
}), "worker.js");

(async () => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/content`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`
    },
    body: form
  });
  const text = await response.text();

  if (!response.ok) {
    console.error(text);
    process.exit(1);
  }

  const data = JSON.parse(text);
  console.log(`Uploaded ${data.result.id} at ${data.result.modified_on}`);
})();

function readWranglerToken(filePath) {
  const config = fs.readFileSync(filePath, "utf8");
  const match = config.match(/oauth_token\s*=\s*"([^"]+)"/);

  if (!match) {
    throw new Error("Could not find Wrangler OAuth token.");
  }

  return match[1];
}
