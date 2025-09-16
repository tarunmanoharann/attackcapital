'use client';

import React from 'react';

export default function ChatMessage({ message }) {
  const { sender, content, timestamp, isAI } = message;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className={`flex flex-col mb-4 ${isAI ? 'items-start' : 'items-end'}`}>
      <div className={`max-w-[80%] px-4 py-2 rounded-lg ${isAI ? 'bg-gray-200 text-gray-800' : 'bg-blue-500 text-white'}`}>
        <div className="font-semibold text-sm">{sender}</div>
        <div className="mt-1">{content}</div>
        <div className="text-xs mt-1 opacity-70 text-right">{formattedTime}</div>
      </div>
    </div>
  );
}