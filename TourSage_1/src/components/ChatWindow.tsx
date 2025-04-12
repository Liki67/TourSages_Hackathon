import { MessageType } from '../app/types';

export default function ChatWindow({ messages, currentUser }: { messages: MessageType[]; currentUser: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.sender === currentUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`p-3 rounded-2xl max-w-xs break-words ${
              msg.sender === currentUser 
                ? 'bg-[#1a73e8] text-white rounded-tr-sm' 
                : 'bg-white text-[#202124] border border-[#dadce0] rounded-tl-sm shadow-sm'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}