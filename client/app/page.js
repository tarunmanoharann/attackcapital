'use client';

import { LiveKitProvider } from './contexts/LiveKitContext';
import LoginForm from './components/LoginForm';
import ChatInterface from './components/ChatInterface';
import { useState, useEffect } from 'react';
import { useLiveKit } from './contexts/LiveKitContext';

export default function Home() {
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <LiveKitProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm py-4">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold text-gray-800">Memory-Enhanced AI Chat</h1>
            <p className="text-gray-600">Chat with an AI that remembers your conversations</p>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
          <ChatContainer />
        </main>

        <footer className="bg-white border-t py-4">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            Powered by LiveKit and Memory-Enhanced AI
          </div>
        </footer>
      </div>
    </LiveKitProvider>
  );
}

function ChatContainer() {
  const { connected, isLoading } = useLiveKit();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-md overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
      {!connected ? <LoginForm /> : <ChatInterface />}
    </div>
  );
}
