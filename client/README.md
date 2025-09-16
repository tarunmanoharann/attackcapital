# Memory-Enhanced AI Chat Frontend

This is the Next.js frontend for the Memory-Enhanced AI Chat Agent. It provides a user interface for joining LiveKit rooms and chatting with an AI agent that remembers previous conversations.

## Features

- User authentication with username and room name
- Real-time chat interface using LiveKit
- Interaction with an AI agent that remembers past conversations
- Responsive design that works on desktop and mobile

## Prerequisites

- Node.js 18+ and npm
- Backend server running (see backend README)
- LiveKit account and API credentials

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file based on the `.env.example` template and fill in your credentials:
   ```
   # LiveKit Configuration
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud

   # Backend API URL
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. Enter your name and a room name on the login screen
2. Click "Join Room" to connect to the chat
3. Start chatting with the AI agent
4. The AI will remember your previous conversations and provide context-aware responses
5. Click "Leave Room" to disconnect from the chat

## How It Works

1. The frontend connects to LiveKit using the provided credentials
2. When a user joins a room, the backend creates the room if it doesn't exist and adds an AI agent
3. Messages are sent and received in real-time through LiveKit
4. The AI agent retrieves relevant past conversations from its memory store to provide context-aware responses
