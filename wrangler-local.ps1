$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ProjectRoot
$NodeDir = Join-Path $WorkspaceRoot "tools\node-v24.11.1-win-x64"

$env:Path = "$NodeDir;$env:Path"
$env:npm_config_cache = Join-Path $WorkspaceRoot "npm-cache"
$env:XDG_CONFIG_HOME = Join-Path $WorkspaceRoot ".config"
$env:WRANGLER_LOG_PATH = Join-Path $WorkspaceRoot ".wrangler-logs"

& (Join-Path $NodeDir "npx.cmd") wrangler @args
