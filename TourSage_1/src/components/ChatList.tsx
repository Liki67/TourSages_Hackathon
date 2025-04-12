import UserCard from './UserCard';

export default function ChatList({ currentUser }: { currentUser: string }) {
  const users = ['friend@example.com', 'demo@example.com'].filter((u) => u !== currentUser);

  return (
    <aside className="w-64 border-r border-[#dadce0] bg-white">
      <div className="p-4">
        <h2 className="text-[#202124] text-lg font-normal mb-4 flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-[#1a73e8]" 
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
          Messages
        </h2>
        <div className="space-y-1">
          {users.map((user) => (
            <UserCard key={user} email={user} />
          ))}
        </div>
      </div>
    </aside>
  );
}