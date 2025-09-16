'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import axios from 'axios';

const LiveKitContext = createContext(null);

export function useLiveKit() {
  return useContext(LiveKitContext);
}

export function LiveKitProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  
  // Initialize room
  useEffect(() => {
    const newRoom = new Room();
    
    // Set up event listeners
    newRoom.on(RoomEvent.ChatMessage, (message) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          sender: message.from?.identity || 'Unknown',
          content: message.message,
          timestamp: new Date(),
          isAI: message.from?.identity === 'AI_Assistant'
        }
      ]);
    });
    
    setRoom(newRoom);
    
    return () => {
      if (newRoom.state !== 'disconnected') {
        newRoom.disconnect();
      }
    };
  }, []);
  
  // Create a room on the backend
  const createRoom = async (roomName) => {
    try {
      await axios.post(`${backendUrl}/create-room/${roomName}`);
      return true;
    } catch (error) {
      setError(`Failed to create room: ${error.message}`);
      return false;
    }
  };
  
  // Connect to a room
  const connectToRoom = async (roomNameInput, usernameInput) => {
    if (!room) return false;
    
    try {
      setError(null);
      setUsername(usernameInput);
      setRoomName(roomNameInput);
      
      // Create room on backend if it doesn't exist
      const roomCreated = await createRoom(roomNameInput);
      if (!roomCreated) return false;
      
      // Get token from your token service
      const response = await axios.post(
        `${backendUrl}/token`,
        { room: roomNameInput, username: usernameInput }
      );
      
      const { token } = response.data;
      
      // Connect to the room
      await room.connect(livekitUrl, token);
      setConnected(true);
      
      return true;
    } catch (error) {
      setError(`Failed to connect: ${error.message}`);
      return false;
    }
  };
  
  // Disconnect from the room
  const disconnect = async () => {
    if (room && room.state !== 'disconnected') {
      await room.disconnect();
      setConnected(false);
      setMessages([]);
    }
  };
  
  // Send a chat message
  const sendMessage = async (content) => {
    if (!room || !connected) {
      setError('Not connected to a room');
      return false;
    }
    
    try {
      await room.localParticipant.publishData(
        JSON.stringify({ type: 'chat', content }),
        { destination: 'all' }
      );
      
      // Add message to local state
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          sender: username,
          content,
          timestamp: new Date(),
          isAI: false
        }
      ]);
      
      return true;
    } catch (error) {
      setError(`Failed to send message: ${error.message}`);
      return false;
    }
  };
  
  const value = {
    room,
    connected,
    username,
    roomName,
    messages,
    error,
    connectToRoom,
    disconnect,
    sendMessage
  };
  
  return (
    <LiveKitContext.Provider value={value}>
      {children}
    </LiveKitContext.Provider>
  );
}
