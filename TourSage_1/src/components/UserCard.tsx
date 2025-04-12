'use client';
import Link from 'next/link';

interface UserCardProps {
  email: string;
}

export default function UserCard({ email }: UserCardProps) {
  return (
    <Link 
      href={`/messaging/chat/${encodeURIComponent(email)}`}
      className="flex items-center p-3 hover:bg-[#f1f3f4] rounded-lg transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
    >
      <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center text-white font-normal shadow-sm group-hover:shadow transition-shadow duration-200">
        {email.charAt(0).toUpperCase()}
      </div>
      <div className="ml-3">
        <p className="text-[#202124] font-normal">{email}</p>
        <p className="text-sm text-[#5f6368] flex items-center gap-1">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
          Click to chat
        </p>
      </div>
    </Link>
  );
}