#!/bin/bash

echo "🚀 Setting up Real-Time Chat App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js is installed"

# Check if MongoDB is running (optional check)
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB or use MongoDB Atlas."
    fi
else
    echo "⚠️  MongoDB not found. Please install MongoDB or use MongoDB Atlas."
fi

# Setup server
echo "📦 Setting up server..."
cd server

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install
else
    echo "Server dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
else
    echo "✅ .env file already exists"
fi

cd ..

# Setup mobile app
echo "📱 Setting up mobile app..."
cd mobile

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing mobile dependencies..."
    npm install
else
    echo "Mobile dependencies already installed"
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update server/.env with your MongoDB URI and JWT secret"
echo "2. Start the server: cd server && npm run dev"
echo "3. Start the mobile app: cd mobile && npm start"
echo ""
echo "For detailed instructions, see README.md"
