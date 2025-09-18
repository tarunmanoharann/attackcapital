'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLiveKit } from '../contexts/LiveKitContext';
import ChatMessage from './ChatMessage';
import { FiSend, FiUsers, FiLogOut, FiMessageCircle } from 'react-icons/fi';

export default function ChatInterface() {
  const { messages, sendMessage, connected, roomName, username, disconnect } = useLiveKit();
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    
    inputRef.current?.focus();
  }, []);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;
    
    sendMessage(inputMessage);
    setInputMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <FiMessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Not Connected</h3>
          <p className="text-gray-600">You're not connected to a chat room</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <FiUsers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{roomName}</h2>
              <p className="text-blue-100 text-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Connected as {username}
              </p>
            </div>
          </div>
          <button 
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <FiLogOut className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 bg-gradient-to-b from-gray-50 to-white overflow-y-auto">
        <div className="p-6">
          {messages.length === 0 ? (
            <div className="text-center mt-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <FiMessageCircle className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to {roomName}!</h3>
              <p className="text-gray-600 mb-4">No messages yet. Be the first to start the conversation!</p>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                Ready to chat
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
              {/* Typing indicator could go here */}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white outline-none min-h-[50px] max-h-32"
              rows="1"
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
            
            {/* Character count or typing indicator */}
            {inputMessage.length > 0 && (
              <div className="absolute bottom-1 right-3 text-xs text-gray-400">
                {inputMessage.length}
              </div>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={inputMessage.trim() === ''}
            className={`p-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center min-w-[50px] shadow-lg hover:shadow-xl transform hover:scale-105 ${
              inputMessage.trim() === ''
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed transform-none shadow-sm'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
            }`}
          >
            {inputMessage.trim() === '' ? (
              <FiSend className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2">
                <FiSend className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Send</span>
              </div>
            )}
          </button>
        </form>
        
        {/* Quick actions or status */}
        <div className="flex justify-between items-center mt-2 px-1">
          <div className="text-xs text-gray-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            Press Enter to send
          </div>
        </div>
      </div>
    </div>
  );
}