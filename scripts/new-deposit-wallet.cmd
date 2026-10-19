@echo off
setlocal
cd /d "%~dp0.."
echo.
echo This creates the new Base deposit wallet on this PC.
echo It does not use MetaMask. It does not send the key anywhere.
echo You will type a password twice. You will not see it as you type.
echo Write that password on paper. This window does not save it.
echo.
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22 from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\@scure\bip32\package.json" (
  echo Installing the wallet libraries. This needs the internet once.
  call npm ci
  if errorlevel 1 (
    echo Library install failed.
    pause
    exit /b 1
  )
)
node scripts\generate-deposit-extended-keys.mjs --check-deps
if errorlevel 1 (
  echo Dependency check failed. No wallet was created.
  pause
  exit /b 1
)
if not exist "%LOCALAPPDATA%\PvpDepositKeys" mkdir "%LOCALAPPDATA%\PvpDepositKeys"
echo.
echo Password: at least 16 characters. Type it, press Enter, type it again.
echo.
node scripts\generate-deposit-extended-keys.mjs --out "%LOCALAPPDATA%\PvpDepositKeys\pvp-base.deposit-hd.txt"
if errorlevel 1 (
  echo.
  echo The wallet file was not created.
  echo If it says OUTPUT_EXISTS, a wallet file is already there. Do not make a second one.
  pause
  exit /b 1
)
echo.
echo Checking that the private key can sign the address...
node scripts\generate-deposit-extended-keys.mjs --show-public "%LOCALAPPDATA%\PvpDepositKeys\pvp-base.deposit-hd.txt"
if errorlevel 1 (
  echo The check failed. Do not send any coins to the address.
  pause
  exit /b 1
)
echo.
echo Encrypted wallet file:
echo %LOCALAPPDATA%\PvpDepositKeys\pvp-base.deposit-hd.txt
echo.
echo Plug in a USB stick. Copy that one file onto it. Eject the stick.
echo In chat, send only the address line. Do not send the password or the file.
echo.
pause
