@echo off
echo 🚀 Setting up Real-Time Chat App...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js is installed

REM Setup server
echo 📦 Setting up server...
cd server

REM Install dependencies
if not exist "node_modules" (
    echo Installing server dependencies...
    npm install
) else (
    echo Server dependencies already installed
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy env.example .env
    echo ✅ Created .env file. Please update it with your configuration.
) else (
    echo ✅ .env file already exists
)

cd ..

REM Setup mobile app
echo 📱 Setting up mobile app...
cd mobile

REM Install dependencies
if not exist "node_modules" (
    echo Installing mobile dependencies...
    npm install
) else (
    echo Mobile dependencies already installed
)

cd ..

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update server/.env with your MongoDB URI and JWT secret
echo 2. Start the server: cd server ^&^& npm run dev
echo 3. Start the mobile app: cd mobile ^&^& npm start
echo.
echo For detailed instructions, see README.md
pause
