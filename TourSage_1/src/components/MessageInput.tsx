'use client';
import { useState } from 'react';

interface Props {
  onSend: (text: string) => void;
}

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-[#dadce0] bg-white flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1 px-4 py-2 bg-[#f1f3f4] rounded-full text-[#202124] placeholder-[#5f6368] border-none focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:bg-white transition-colors duration-200"
        placeholder="Type a message..."
      />
      <button 
        onClick={handleSend}
        disabled={!text.trim()}
        className="p-2 rounded-full hover:bg-[#f1f3f4] text-[#1a73e8] disabled:text-[#5f6368] disabled:hover:bg-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
          />
        </svg>
      </button>
    </div>
  );
}
