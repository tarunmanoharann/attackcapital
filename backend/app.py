import os
import json
import asyncio
import logging
from typing import Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from livekit.api import AccessToken, VideoGrants

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data models
class TokenRequest(BaseModel):
    room: str
    username: str

class RoomRequest(BaseModel):
    room_name: str

class ChatMessage(BaseModel):
    room: str
    username: str
    message: str

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Initialize OpenAI client
try:
    openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    logger.info("OpenAI client initialized")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    openai_client = None

# Initialize memory store with Chroma DB
try:
    embeddings = OpenAIEmbeddings()
    memory_store = Chroma(
        collection_name="user_memory",
        embedding_function=embeddings,
        persist_directory="./memory_db"
    )
    logger.info("Memory store initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize memory store: {e}")
    memory_store = None

# LiveKit configuration
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://your-livekit-server.com")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

if not all([LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
    logger.warning("LiveKit credentials not configured")

# Store active rooms
active_rooms: Dict[str, Dict] = {}

# Memory functions
async def save_to_memory(username: str, message: str, response: str):
    """Save user interaction to memory store"""
    if not memory_store:
        logger.warning("Memory store not available")
        return
    
    try:
        # Create a document with the interaction
        interaction = f"User ({username}): {message}\nAI Assistant: {response}"
        document = Document(
            page_content=interaction, 
            metadata={
                "username": username,
                "timestamp": asyncio.get_event_loop().time()
            }
        )
        
        # Add to memory store
        memory_store.add_documents([document])
        logger.info(f"Saved interaction to memory for user: {username}")
    except Exception as e:
        logger.error(f"Error saving to memory: {e}")

async def retrieve_from_memory(username: str, query: str, k: int = 3) -> List[str]:
    """Retrieve relevant past interactions from memory"""
    if not memory_store:
        return []
    
    try:
        # Search for relevant documents
        results = memory_store.similarity_search(
            query=query,
            k=k,
            filter={"username": username}
        )
        
        # Extract and return the content
        return [doc.page_content for doc in results]
    except Exception as e:
        logger.error(f"Error retrieving from memory: {e}")
        return []

async def generate_ai_response(username: str, user_message: str) -> str:
    """Generate AI response with memory context"""
    if not openai_client:
        return "I'm sorry, AI service is not available right now."
    
    try:
        # Retrieve relevant memory context
        memory_context = await retrieve_from_memory(username, user_message)
        memory_context_str = "\n".join(memory_context) if memory_context else ""
        
        # Prepare prompt with memory context
        system_prompt = (
            "You are a helpful AI assistant in a chat room. "
            "Be conversational, helpful, and personalized in your responses. "
            "Keep responses concise but informative. "
            "Use the provided memory context to maintain continuity in the conversation."
        )
        
        if memory_context_str:
            system_prompt += f"\n\nRelevant conversation history with {username}:\n{memory_context_str}"
        
        # Generate response using OpenAI
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        ai_response = response.choices[0].message.content
        
        # Save interaction to memory
        await save_to_memory(username, user_message, ai_response)
        
        return ai_response
        
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return "I'm sorry, I encountered an error processing your request."

# API endpoints
@app.get("/")
async def root():
    return {
        "status": "running", 
        "service": "LiveKit Memory-Enhanced AI Chat Agent",
        "active_rooms": list(active_rooms.keys()),
        "memory_enabled": memory_store is not None,
        "ai_enabled": openai_client is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": openai_client is not None,
        "livekit_configured": bool(LIVEKIT_API_KEY and LIVEKIT_API_SECRET),
        "memory_store": "available" if memory_store else "unavailable"
    }

@app.post("/token")
async def get_token(request: TokenRequest):
    """Generate a LiveKit token for a user to join a room"""
    if not all([LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
        raise HTTPException(status_code=500, detail="LiveKit not configured")
    
    try:
        # Create an access token with the user's identity
        token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        token.with_identity(request.username).with_grants(
            VideoGrants(
                room_join=True,
                room=request.room,
            )
        )
        
        jwt_token = token.to_jwt()
        
        return {
            "token": jwt_token,
            "room": request.room,
            "username": request.username,
            "server_url": LIVEKIT_URL
        }
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create-room/{room_name}")
async def create_room(room_name: str):
    """Create/register a new room"""
    try:
        
        if room_name not in active_rooms:
            active_rooms[room_name] = {
                "created_at": asyncio.get_event_loop().time(),
                "participants": []
            }
            
            logger.info(f"Registered room: {room_name}")
            return {
                "status": "success", 
                "message": f"Room {room_name} created",
                "room_name": room_name
            }
        else:
            return {
                "status": "info", 
                "message": f"Room {room_name} already exists",
                "room_name": room_name
            }
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def handle_chat(request: ChatMessage):
    """Handle chat message and return AI response"""
    try:
        # Generate AI response
        ai_response = await generate_ai_response(request.username, request.message)
        
        return {
            "status": "success",
            "response": ai_response,
            "username": request.username,
            "room": request.room
        }
    except Exception as e:
        logger.error(f"Error handling chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/close-room/{room_name}")
async def close_room(room_name: str):
    """Close/unregister a room"""
    try:
        if room_name in active_rooms:
            del active_rooms[room_name]
            logger.info(f"Closed room: {room_name}")
            return {"status": "success", "message": f"Room {room_name} closed"}
        else:
            raise HTTPException(status_code=404, detail=f"Room {room_name} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rooms")
async def list_rooms():
    """List all active rooms"""
    return {
        "active_rooms": [
            {
                "name": room_name,
                "created_at": info["created_at"],
                "participants": len(info.get("participants", []))
            }
            for room_name, info in active_rooms.items()
        ]
    }

@app.get("/memory/{username}")
async def get_user_memory(username: str, limit: int = 10):
    """Get memory for a specific user"""
    if not memory_store:
        raise HTTPException(status_code=503, detail="Memory store not available")
    
    try:
        results = memory_store.similarity_search(
            query="",  # Empty query to get recent interactions
            k=limit,
            filter={"username": username}
        )
        
        return {
            "username": username,
            "interactions": [
                {
                    "content": doc.page_content,
                    "timestamp": doc.metadata.get("timestamp", 0)
                }
                for doc in results
            ]
        }
    except Exception as e:
        logger.error(f"Error retrieving user memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)