# Memory-Enhanced AI Chat Agent Backend

This is the Python backend for the Memory-Enhanced AI Chat Agent using LiveKit API. It provides real-time chat capabilities with an AI agent that can recall previous user interactions through a memory context service.

## Features

- LiveKit integration for real-time chat rooms
- AI chat agent that joins rooms as a participant
- Memory context retrieval using vector embeddings
- Personalized responses leveraging both current input and past conversations
- FastAPI endpoints for room management

## Prerequisites

- Python 3.8+
- LiveKit account and API credentials
- OpenAI API key

## Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file based on the `.env.example` template and fill in your credentials:
   ```
   # LiveKit Configuration
   LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret

   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Server Configuration
   PORT=8000
   HOST=0.0.0.0
   ```

4. Run the server:
   ```bash
   python app.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

- `GET /`: Check if the service is running
- `POST /create-room/{room_name}`: Create a new LiveKit room with an AI agent
- `DELETE /close-room/{room_name}`: Close a LiveKit room and remove the AI agent

## How It Works

1. The backend creates LiveKit rooms and adds an AI agent to each room
2. When users join, the agent greets them
3. For each user message, the agent:
   - Retrieves relevant past conversations from the memory store
   - Generates a response using OpenAI with the context of past conversations
   - Saves the new interaction to the memory store
4. The conversation continues with personalized, memory-informed responses

## Memory Storage

The application uses ChromaDB as a vector store to save and retrieve conversation history. Each interaction is embedded and stored with the username as metadata, allowing for personalized context retrieval.