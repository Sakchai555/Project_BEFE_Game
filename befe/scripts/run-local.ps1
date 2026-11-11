$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw 'ไม่พบไฟล์ .env ให้คัดลอก .env.example เป็น .env แล้วใส่ค่า Supabase ก่อน'
}

foreach ($line in Get-Content -LiteralPath $envFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    $parts = $trimmed -split '=', 2
    if ($parts.Count -ne 2) { continue }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($name -match '^[A-Za-z_][A-Za-z0-9_]*$') {
        Set-Item -Path "Env:$name" -Value $value
    }
}

if (-not $env:SUPABASE_URL -or $env:SUPABASE_URL -match 'your-project') {
    throw 'ใส่ SUPABASE_URL และ SUPABASE_ANON_KEY จริงใน .env ก่อน'
}
if (-not $env:SUPABASE_ANON_KEY -or $env:SUPABASE_ANON_KEY -match 'your-publishable') {
    throw 'ใส่ SUPABASE_URL และ SUPABASE_ANON_KEY จริงใน .env ก่อน'
}

Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
        npm install
        if ($LASTEXITCODE -ne 0) { throw 'ติดตั้ง npm dependencies ไม่สำเร็จ' }
    }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'สร้าง React frontend ไม่สำเร็จ' }
    go run ./backend
} finally {
    Pop-Location
}

