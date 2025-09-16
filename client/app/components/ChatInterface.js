'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLiveKit } from '../contexts/LiveKitContext';
import ChatMessage from './ChatMessage';
import { FiSend } from 'react-icons/fi';

export default function ChatInterface() {
  const { messages, sendMessage, connected, roomName, username, disconnect } = useLiveKit();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;
    
    sendMessage(inputMessage);
    setInputMessage('');
  };
  
  if (!connected) {
    return <div className="p-4 text-center">Not connected to a chat room</div>;
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="font-semibold">Room: {roomName}</h2>
          <p className="text-sm text-gray-600">Connected as: {username}</p>
        </div>
        <button 
          onClick={disconnect}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Leave Room
        </button>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="border-t p-4 flex">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          className="bg-blue-500 text-white rounded-r-lg px-4 py-2 hover:bg-blue-600 flex items-center justify-center"
          disabled={inputMessage.trim() === ''}
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
}