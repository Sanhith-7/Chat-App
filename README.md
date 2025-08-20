# Real-Time Chat App

A full-stack real-time chat application built with React Native (frontend) and Node.js/Express/Socket.IO (backend) with MongoDB database.

## Features

### ✅ Authentication
- User registration and login with JWT tokens
- Secure password hashing with bcrypt
- Persistent authentication state

### ✅ Real-Time Messaging
- Instant message delivery using Socket.IO
- Typing indicators
- Message delivery and read receipts
- Online/offline status tracking

### ✅ User Interface
- Modern, responsive UI design
- Conversation list with last message preview
- Real-time chat interface with message bubbles
- Loading states and error handling
- Keyboard-aware input handling

### ✅ Message Features
- Message persistence in MongoDB
- Message status tracking (sent, delivered, read)
- Timestamp formatting (Today, Yesterday, date)
- Message preview in conversation list

### ✅ Technical Features
- Real-time presence tracking
- Automatic message read marking
- Optimized message rendering
- Error handling and validation

## Project Structure

```
APP/
├── mobile/                 # React Native App
│   ├── src/
│   │   ├── context/       # Authentication context
│   │   ├── screens/       # App screens
│   │   └── services/      # API and Socket services
│   ├── App.js
│   └── package.json
└── server/                # Node.js Backend
    ├── src/
    │   ├── middleware/    # Authentication middleware
    │   ├── models/        # MongoDB models
    │   ├── routes/        # API routes
    │   └── index.js       # Server entry point
    └── package.json
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Users
- `GET /users` - Get all users (excluding current user)
- `GET /users/conversations` - Get users with last message

### Conversations
- `GET /conversations/:id/messages` - Get messages for a conversation

## Socket Events

### Client to Server
- `message:send` - Send a new message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `message:read` - Mark messages as read
- `presence:get` - Request online users

### Server to Client
- `message:new` - Receive new message
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `message:read` - Messages marked as read
- `presence:update` - Online users update

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- React Native development environment

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create an env file (use the template provided):
```bash
cp env.example .env
```
Edit `.env` if needed (defaults are OK for local):
```env
PORT=5000
DB_URI=mongodb://127.0.0.1:27017/chat_app
JWT_SECRET=your_jwt_secret_here
CLIENT_ORIGINS=http://localhost:19006,http://localhost:8081
```

4. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the React Native app:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# Web (recommended for quick testing)
# In the Expo terminal, press 'w'

# iOS (macOS only)
npm run ios

# Android (with emulator)
npm run android
```

## Sample Users

You can register via the app UI, or quickly create sample users via curl (with the server running):

```bash
# Alice
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"sanhith","email":"alice@gmail.com","password":"123456"}'

# Bob
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"sanh","email":"bob@gmail.com","password":"123456"}'
```

Then login with the same credentials in two different browsers/tabs.

## Testing Real-Time (Option 1: Two Browsers)

1. Start backend: `cd server && npm run dev`
2. Start frontend: `cd mobile && npm start`
3. Open `http://localhost:19006` in Chrome, and again in Firefox (or a private window)
4. Login as two different users (e.g., Alice and Bob)
5. Verify online indicators, typing, delivery, and read receipts

Notes:
- If presence seems stale, refresh both browsers after both are logged in.
- Ensure `.env` has `CLIENT_ORIGINS` including `http://localhost:19006`.

## Database Schema

### User Model
```javascript
{
  username: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  senderId: ObjectId (ref: User),
  receiverId: ObjectId (ref: User),
  content: String,
  status: String (enum: ['sent', 'delivered', 'read']),
  createdAt: Date,
  updatedAt: Date
}
```

## Key Features Implementation

### Real-Time Messaging
- Uses Socket.IO for real-time communication
- Messages are stored in MongoDB and delivered instantly
- Automatic read receipt when user is online

### Typing Indicators
- Debounced typing detection (1.2s delay)
- Real-time typing status broadcast
- Visual typing indicator in chat

### Message Status
- **Sent**: Message created and stored
- **Delivered**: Message received by recipient's client
- **Read**: Message viewed by recipient

### Online Presence
- Real-time online/offline status
- Automatic presence updates on connect/disconnect
- Visual indicators in conversation list

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Secure token storage in AsyncStorage

## Performance Optimizations

- Efficient message rendering with FlatList
- Optimistic UI updates
- Debounced typing indicators
- Lazy loading of conversation data
- Memory leak prevention with proper cleanup

## Troubleshooting

### Common Issues

1. **Socket connection failed**
   - Check if server is running on correct port
   - Verify CORS settings in server
   - Ensure network connectivity

2. **Messages not loading**
   - Check MongoDB connection
   - Verify API endpoints are accessible
   - Check authentication token

3. **Real-time features not working**
   - Ensure Socket.IO is properly configured
   - Check for firewall/network issues
   - Verify client and server versions match

### Development Tips

- Use React Native Debugger for better debugging
- Monitor MongoDB logs for database issues
- Check Socket.IO server logs for connection problems
- Use Expo DevTools for mobile app debugging

## Publish to GitHub

From the project root (`APP/`):
```bash
git init
git add .
git commit -m "Initial commit: real-time chat app (mobile + server)"

# Create a new GitHub repo first, then:
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If using SSH:
```bash
git remote add origin git@github.com:<your-username>/<your-repo>.git
git push -u origin main
```

## License

This project is open source and available under the MIT License.


