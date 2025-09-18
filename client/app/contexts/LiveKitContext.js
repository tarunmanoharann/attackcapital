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
  
  // Ensure URLs are properly formatted with https:// prefix
  let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://attackcapital-1.onrender.com';
  if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
    backendUrl = 'https://' + backendUrl;
  }
  
  // LiveKit URL with fallback
  let livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://attackcapital-1.livekit.cloud';
  if (!livekitUrl.startsWith('wss://') && !livekitUrl.startsWith('ws://')) {
    livekitUrl = 'wss://' + livekitUrl;
  }
  
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
  
  // Pre-defined conversation starters and responses
  const conversationStarters = {
    'hi': ['Hello! How can I help you today?', 'Hi there! What would you like to discuss?'],
    'hello': ['Hello! How can I help you today?', 'Hi there! What would you like to discuss?'],
    'hey': ['Hey! How are you doing today?', 'Hello there! How can I assist you?'],
    'how are you': ['I\'m doing well, thank you for asking! How about you?', 'I\'m great! How can I help you today?'],
    'good morning': ['Good morning! How can I make your day better?', 'Morning! What can I help you with today?'],
    'good afternoon': ['Good afternoon! How can I assist you today?', 'Afternoon! What would you like to discuss?'],
    'good evening': ['Good evening! How can I help you tonight?', 'Evening! What can I do for you?'],
    'how\'s your day': ['My day is going well! I\'m here to assist you. What\'s on your mind?', 'Every day is a good day when I can help! What can I do for you?'],
    'what can you do': ['I can help answer questions, provide information, and have conversations on various topics. What would you like to know?', 'I\'m designed to assist with information, answer questions, and engage in meaningful conversations. How can I help you today?'],
    'tell me about yourself': ['I\'m an AI assistant designed to help with information and have conversations. I\'m here to assist you with whatever you need!', 'I\'m your AI chat companion, ready to help with questions, provide information, or just chat. What would you like to talk about?']
  };

  // Function to get a random response from the array
  const getRandomResponse = (responses) => {
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  };

  // Check if message matches a conversation starter
  const checkForQuickResponse = (message) => {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for exact matches
    if (conversationStarters[lowerMessage]) {
      return getRandomResponse(conversationStarters[lowerMessage]);
    }
    
    // Check for partial matches
    for (const [key, responses] of Object.entries(conversationStarters)) {
      if (lowerMessage.includes(key)) {
        return getRandomResponse(responses);
      }
    }
    
    return null;
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
      
      // Check for quick response patterns
      const quickResponse = checkForQuickResponse(content);
      
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
      
      // If we have a quick response, use it instead of calling the API
      if (quickResponse) {
        // Short delay to simulate typing
        setTimeout(() => {
          // Remove typing indicator
          setMessages((prevMessages) => 
            prevMessages.filter(msg => msg.id !== typingId)
          );
          
          // Add AI quick response to state
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now().toString() + '-ai',
              sender: 'AI Assistant',
              content: quickResponse,
              timestamp: new Date(),
              isAI: true
            }
          ]);
        }, 1000); // 1 second delay for quick responses
        
        return true;
      }
      
      // Get AI response from backend
      try {
        console.log('Requesting AI response from:', `${backendUrl}/chat`);
        
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
