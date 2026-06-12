# Wrangler setup for this app

This project uses a self-contained Wrangler setup so it does not depend on global installs.

Use this command from this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 --version
```

The helper script points Node, npm cache, Wrangler logs, and Cloudflare auth config into the workspace.

## Login

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 login --browser=false
```

Open the URL it prints, approve Cloudflare, then let the callback finish.

Check:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 whoami
```

## Secrets

Do not paste the ElevenLabs key into chat or commit it to files.

For production:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 secret put ELEVENLABS_API_KEY
```

For word definitions/translations:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 secret put OPENAI_API_KEY
```

For local testing, copy `.dev.vars.example` to `.dev.vars` and paste the key there.

## R2 bucket

Create the storage bucket:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 r2 bucket create synced-text-pages
```

## Local dev and deploy

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 dev
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 deploy
```

## Staging/dev Worker

Public production stays on:

```text
https://read.globalbook.club
```

Feature experiments can be deployed to:

```text
https://synced-text-pages-dev.alexisgkemp.workers.dev
```

Deploy current code to dev:

```powershell
$env:SCRIPT_NAME='synced-text-pages-dev'; ..\tools\node-v24.11.1-win-x64\node.exe scripts\deploy-content-api.js
```

Deploy current code to production:

```powershell
$env:SCRIPT_NAME='synced-text-pages'; ..\tools\node-v24.11.1-win-x64\node.exe scripts\deploy-content-api.js
```

The dev Worker has R2 access but does not automatically inherit secrets. Add dev secrets only when you need to test those features:

```powershell
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 secret put OPENAI_API_KEY --name synced-text-pages-dev
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 secret put ELEVENLABS_API_KEY --name synced-text-pages-dev
powershell -ExecutionPolicy Bypass -File .\wrangler-local.ps1 secret put ADMIN_PASSWORD --name synced-text-pages-dev
```
