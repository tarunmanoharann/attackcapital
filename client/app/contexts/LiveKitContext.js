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
  const [isLoading, setIsLoading] = useState(true);
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://attackcapital-1.onrender.com';
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  
  // Load session from localStorage on initial render
  useEffect(() => {
    const savedSession = localStorage.getItem('chatSession');
    if (savedSession) {
      const { username: savedUsername, roomName: savedRoomName } = JSON.parse(savedSession);
      if (savedUsername && savedRoomName) {
        setUsername(savedUsername);
        setRoomName(savedRoomName);
        // Reconnect to room
        connectToRoom(savedRoomName, savedUsername);
      }
    }
    setIsLoading(false);
  }, []);
  
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
      
      // Save session to localStorage
      localStorage.setItem('chatSession', JSON.stringify({
        username: usernameInput,
        roomName: roomNameInput
      }));
      
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
      // Clear session from localStorage
      localStorage.removeItem('chatSession');
    }
  };
  
  // Send a chat message
  const sendMessage = async (content) => {
    if (!room || !connected) {
      setError('Not connected to a room');
      return false;
    }
    
    try {
      console.log('Sending message:', content);
      
      // Add user message to local state immediately
      const userMessageId = Date.now().toString();
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: userMessageId,
          sender: username,
          content,
          timestamp: new Date(),
          isAI: false
        }
      ]);
      
      // Publish to LiveKit
      await room.localParticipant.publishData(
        JSON.stringify({ type: 'chat', content }),
        { destination: 'all' }
      );
      
      console.log('Message published to LiveKit');
      
      // Get AI response from backend
      try {
        console.log('Requesting AI response from:', `${backendUrl}/chat`);
        
        // Add a temporary "AI is typing" message
        const typingId = Date.now().toString() + '-typing';
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: typingId,
            sender: 'AI Assistant',
            content: 'Typing...',
            timestamp: new Date(),
            isAI: true,
            isTyping: true
          }
        ]);
        
        // Make the API call with timeout
        const response = await axios.post(`${backendUrl}/chat`, {
          room: roomName,
          username: username,
          message: content
        }, {
          timeout: 15000, // 15 second timeout
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('AI response received:', response.data);
        
        // Remove the typing indicator
        setMessages((prevMessages) => 
          prevMessages.filter(msg => msg.id !== typingId)
        );
        
        if (response.data && response.data.response) {
          // Add AI response to messages
          const aiMessageId = Date.now().toString() + '-ai';
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: aiMessageId,
              sender: 'AI Assistant',
              content: response.data.response,
              timestamp: new Date(),
              isAI: true
            }
          ]);
          console.log('AI message added to state');
        } else {
          console.error('No response data or missing response field:', response.data);
          // Add error message if response format is incorrect
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now().toString() + '-error',
              sender: 'System',
              content: 'Received invalid response from AI service.',
              timestamp: new Date(),
              isAI: true
            }
          ]);
        }
      } catch (aiError) {
        console.error('Error getting AI response:', aiError);
        
        // Remove typing indicator if it exists
        setMessages((prevMessages) => 
          prevMessages.filter(msg => !msg.isTyping)
        );
        
        // Add detailed error message to chat
        let errorMessage = 'Failed to get AI response. Please try again.';
        
        if (aiError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Error response:', aiError.response.data);
          errorMessage = `Server error: ${aiError.response.status}. Please check your backend connection.`;
        } else if (aiError.request) {
          // The request was made but no response was received
          console.error('No response received:', aiError.request);
          errorMessage = 'No response from server. Please check if the backend is running.';
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Request error:', aiError.message);
          errorMessage = `Request error: ${aiError.message}`;
        }
        
        // Add error message to chat
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString() + '-error',
            sender: 'System',
            content: errorMessage,
            timestamp: new Date(),
            isAI: true
          }
        ]);
      }
      
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
    isLoading,
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
