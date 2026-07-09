$ErrorActionPreference = "Stop"

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $sourceDir
$outDir = Join-Path $repoDir "extension-class-management-install"
$repoRoot = [System.IO.Path]::GetFullPath($repoDir)
$outRoot = [System.IO.Path]::GetFullPath($outDir)

if (-not $outRoot.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to write outside the repository: $outRoot"
}

if (Test-Path -LiteralPath $outDir) {
  Remove-Item -LiteralPath $outDir -Recurse -Force
}

New-Item -ItemType Directory -Path $outDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "icons") | Out-Null

$files = @(
  "manifest-class-management.json",
  "background.js",
  "backup.js",
  "canvas-token.js",
  "entitlements.js",
  "hub.js",
  "grader.js",
  "scheduler.js",
  "email.js",
  "toolbar.css",
  "icons\icon16.png",
  "icons\icon48.png",
  "icons\icon128.png"
)

foreach ($file in $files) {
  $from = Join-Path $sourceDir $file
  $toName = if ($file -eq "manifest-class-management.json") { "manifest.json" } else { $file }
  $to = Join-Path $outDir $toName
  Copy-Item -LiteralPath $from -Destination $to -Force
}

Write-Host "Class-management extension install folder created:"
Write-Host $outDir
