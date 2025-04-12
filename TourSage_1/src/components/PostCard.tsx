'use client';
import Link from 'next/link';
import { PostType } from '../app/types';

export default function PostCard({ post }: { post: PostType }) {
  return (
    <div className="p-4 bg-white border border-[#dadce0] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
      <h2 className="text-[#202124] text-xl font-normal mb-2">{post.name}</h2>
      <p className="text-[#5f6368] mb-3">{post.message}</p>
      
      <div className="flex items-center text-sm text-[#5f6368] mb-3">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 mr-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
        {post.latitude.toFixed(6)}, {post.longitude.toFixed(6)}
      </div>

      <Link 
        href={`/posts/${post.id}`} 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[#1a73e8] hover:bg-[#f1f3f4] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
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
        Message Creator
      </Link>
    </div>
  );
}