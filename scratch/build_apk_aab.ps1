$ErrorActionPreference = "Stop"
Set-Location "c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart"

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "=== 1. Building Vite Web Assets ==="
node "node_modules/vite/bin/vite.js" build
if ($LASTEXITCODE -ne 0) { throw "Vite build failed" }

Write-Host "=== 2. Syncing Capacitor Android ==="
node "node_modules/@capacitor/cli/bin/capacitor" sync android
if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }

Write-Host "=== 3. Building Android Release APK & AAB ==="
Set-Location "c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\android"
.\gradlew.bat assembleRelease bundleRelease
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }

Write-Host "=== 4. Copying to Releases Directory ==="
Set-Location "c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart"
$apkSrc = "android\app\build\outputs\apk\release\app-release.apk"
$aabSrc = "android\app\build\outputs\bundle\release\app-release.aab"
$apkDest = "releases\CredSmart-v1.2.0-release.apk"
$aabDest = "releases\CredSmart-v1.2.0-release.aab"

if (-not (Test-Path "releases")) {
    New-Item -ItemType Directory -Path "releases" -Force
}

Copy-Item $apkSrc $apkDest -Force
Copy-Item $aabSrc $aabDest -Force

Write-Host "Build complete successfully!"
Get-Item $apkDest, $aabDest | Select-Object Name, Length, LastWriteTime
