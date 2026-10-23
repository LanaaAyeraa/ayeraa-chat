$ErrorActionPreference = "Stop"

$JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:JAVA_HOME = $JAVA_HOME
$env:Path = "$JAVA_HOME\bin;$env:Path"

$ANDROID_HOME = "C:\Users\Hype 5 X5-2\scoop\apps\android-clt\current"
$BUILD_TOOLS = "$ANDROID_HOME\build-tools\34.0.0"
$PLATFORM = "$ANDROID_HOME\platforms\android-34"
$ANDROID_JAR = "$PLATFORM\android.jar"

Write-Host "=== AYERAA CHAT NATIVE ANDROID BUILD PIPELINE ===" -ForegroundColor Cyan
Write-Host "Java Home: $JAVA_HOME"
Write-Host "Android Home: $ANDROID_HOME"
Write-Host "Build Tools: $BUILD_TOOLS"
Write-Host "Android Jar: $ANDROID_JAR"

if (!(Test-Path $ANDROID_JAR)) {
    throw "android.jar not found at $ANDROID_JAR!"
}

$WORKSPACE = "D:\room chat\android"
$APP_DIR = "$WORKSPACE\app\src\main"
$BUILD_DIR = "$WORKSPACE\build"

# Clean build directory
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
}
New-Item -ItemType Directory -Force -Path "$BUILD_DIR\compiled_res" | Out-Null
New-Item -ItemType Directory -Force -Path "$BUILD_DIR\gen" | Out-Null
New-Item -ItemType Directory -Force -Path "$BUILD_DIR\classes" | Out-Null
New-Item -ItemType Directory -Force -Path "$BUILD_DIR\dex" | Out-Null
New-Item -ItemType Directory -Force -Path "$BUILD_DIR\out" | Out-Null

$AAPT2 = "$BUILD_TOOLS\aapt2.exe"
$D8 = "$BUILD_TOOLS\d8.bat"
$ZIPALIGN = "$BUILD_TOOLS\zipalign.exe"
$APKSIGNER = "$BUILD_TOOLS\apksigner.bat"
$JAVAC = "$JAVA_HOME\bin\javac.exe"
$JAR = "$JAVA_HOME\bin\jar.exe"
$KEYTOOL = "$JAVA_HOME\bin\keytool.exe"

# 1. Compile resources with AAPT2
Write-Host "[1/7] Compiling Android resources with AAPT2..." -ForegroundColor Yellow
& $AAPT2 compile --dir "$APP_DIR\res" -o "$BUILD_DIR\compiled_res.zip"
if ($LASTEXITCODE -ne 0) { throw "AAPT2 compile failed!" }

# 2. Link resources with AAPT2
Write-Host "[2/7] Linking resources and generating R.java..." -ForegroundColor Yellow
& $AAPT2 link -I $ANDROID_JAR `
    --manifest "$APP_DIR\AndroidManifest.xml" `
    --java "$BUILD_DIR\gen" `
    -o "$BUILD_DIR\base.apk" `
    --auto-add-overlay `
    "$BUILD_DIR\compiled_res.zip"
if ($LASTEXITCODE -ne 0) { throw "AAPT2 link failed!" }

# 3. Compile Java source code
Write-Host "[3/7] Compiling Java source files with javac..." -ForegroundColor Yellow
$javaSources = @()
$javaSources += (Get-ChildItem -Recurse "$APP_DIR\java" -Filter "*.java" | Select-Object -ExpandProperty FullName)
$javaSources += (Get-ChildItem -Recurse "$BUILD_DIR\gen" -Filter "*.java" | Select-Object -ExpandProperty FullName)

& $JAVAC -encoding UTF-8 -cp $ANDROID_JAR -d "$BUILD_DIR\classes" $javaSources
if ($LASTEXITCODE -ne 0) { throw "Java compilation failed!" }

# 4. Dex with D8
Write-Host "[4/7] Converting bytecode to Dalvik Executable (classes.dex) with D8..." -ForegroundColor Yellow
$classFiles = (Get-ChildItem -Recurse "$BUILD_DIR\classes" -Filter "*.class" | Select-Object -ExpandProperty FullName)
& $D8 --lib $ANDROID_JAR --output "$BUILD_DIR\dex" $classFiles
if ($LASTEXITCODE -ne 0) { throw "D8 dexing failed!" }

# 5. Package classes.dex into base.apk
Write-Host "[5/7] Packaging classes.dex into APK..." -ForegroundColor Yellow
Push-Location "$BUILD_DIR\dex"
& $JAR -uf "$BUILD_DIR\base.apk" classes.dex
Pop-Location
if ($LASTEXITCODE -ne 0) { throw "Packaging classes.dex failed!" }

# 6. Zipalign
Write-Host "[6/7] Aligning APK with zipalign..." -ForegroundColor Yellow
& $ZIPALIGN -p -f -v 4 "$BUILD_DIR\base.apk" "$BUILD_DIR\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "zipalign failed!" }

# 7. Generate debug keystore & sign APK
Write-Host "[7/7] Signing APK with apksigner..." -ForegroundColor Yellow
$KEYSTORE = "$WORKSPACE\debug.keystore"
if (!(Test-Path $KEYSTORE)) {
    & $KEYTOOL -genkeypair -keystore $KEYSTORE -storepass android -alias androiddebugkey -keypass android `
        -dname "CN=AyeraaChat,OU=Ayeraa,O=Ayeraa,L=Jakarta,ST=Jakarta,C=ID" -keyalg RSA -keysize 2048 -validity 10000
}

$FINAL_APK = "$WORKSPACE\AyeraaChat.apk"
& $APKSIGNER sign --ks $KEYSTORE --ks-pass pass:android --key-pass pass:android --out $FINAL_APK "$BUILD_DIR\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "apksigner failed!" }

Write-Host "=== BUILD SUCCESSFUL! ===" -ForegroundColor Green
$apkItem = Get-Item $FINAL_APK
Write-Host "Generated APK: $($apkItem.FullName) ($([math]::Round($apkItem.Length / 1MB, 2)) MB)"

# Copy to Google Drive APK directory
$GDRIVE_DIR = "G:\My Drive\APK"
if (Test-Path $GDRIVE_DIR) {
    Copy-Item -Path $FINAL_APK -Destination "$GDRIVE_DIR\AyeraaChat.apk" -Force
    Write-Host "Copied to Google Drive: $GDRIVE_DIR\AyeraaChat.apk" -ForegroundColor Green
}

# Also copy to root project directory
Copy-Item -Path $FINAL_APK -Destination "D:\room chat\AyeraaChat.apk" -Force
Write-Host "Copied to root: D:\room chat\AyeraaChat.apk" -ForegroundColor Green
