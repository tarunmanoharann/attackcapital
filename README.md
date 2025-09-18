# AI Chat Agent with LiveKit API and Memory-Enhanced Contextual Conversations

This project implements a real-time AI chat agent using the LiveKit API that can recall and use previous user interactions by integrating a memory context service. The agent interacts through chat messages and provides personalized responses based on both current input and retrieved memory.

## Project Structure

The project consists of two main components:

1. **Python Backend** - Handles LiveKit room management, AI agent logic, and memory storage/retrieval
2. **Next.js Frontend** - Provides the user interface for joining rooms and chatting with the AI agent

## Features

- Users can join LiveKit rooms with unique usernames
- AI chat agent joins the room as a participant
- Memory context retrieval for personalized responses
- Real-time chat communication
- Context-aware conversations that remember past interactions

## Tech Stack

- **Backend**: Python with LiveKit Agents SDK, FastAPI, OpenAI, and ChromaDB for vector storage
- **Frontend**: Next.js with LiveKit client libraries and Tailwind CSS
- **Memory/RAG**: Vector embeddings for semantic search of past conversations
- **LLM**: OpenAI's GPT models for generating responses

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+
- LiveKit account and API credentials
- OpenAI API key

### Setup

#### Option 1: Manual Setup

1. **Backend Setup**
   - Navigate to the `backend` directory
   - Follow the instructions in the backend [README.md](./backend/README.md)

2. **Frontend Setup**
   - Navigate to the `client` directory
   - Follow the instructions in the frontend [README.md](./client/README.md)

#### Option 2: Docker Setup

1. Create environment files:
   - Copy `backend/.env.example` to `backend/.env` and fill in your credentials
   - Copy `client/.env.example` to `client/.env.local` and fill in your credentials

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Access the application at http://localhost:3000

## Usage

1. Start the backend server
2. Start the frontend development server
3. Open the frontend application in your browser
4. Enter your name and a room name to join
5. Start chatting with the AI agent
