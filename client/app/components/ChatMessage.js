'use client';

import React from 'react';

export default function ChatMessage({ message }) {
  const { sender, content, timestamp, isAI, isTyping } = message;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className={`flex flex-col mb-6 ${isAI ? 'items-start' : 'items-end'} animate-fade-in`}>
    
      <div className={`flex items-center gap-2 mb-1 px-1 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        <span className="text-xs font-medium text-gray-600">{sender}</span>
        <span className="text-xs text-gray-500">{formattedTime}</span>
      </div>
    
      <div className={`relative max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
        isAI 
          ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-md' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-md'
      }`}>
      
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </div>
        
       
        <div className={`absolute top-0 w-3 h-3 ${
          isAI 
            ? 'left-0 -translate-x-1 bg-white border-l border-t border-gray-200 rounded-tl-full' 
            : 'right-0 translate-x-1 bg-blue-500 rounded-tr-full'
        }`} />
      </div>
      
   
      {!isAI && (
        <div className="flex items-center gap-1 mt-1 px-1">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          </div>
          <span className="text-xs text-gray-500">Sent</span>
        </div>
      )}
    </div>
  );
}