'use client';
import { useEffect, useState } from 'react';
import { fetchPosts } from '../firebase/firestore';
import PostCard from './PostCard';
import { PostType } from '../app/types';

export default function PostsFeed() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts()
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        } else {
          setError('Invalid data received');
        }
      })
      .catch((err) => {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
          <p className="mt-4 text-[#5f6368]">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[#fce8e6] border border-[#d93025] rounded-lg text-[#d93025] flex items-center gap-2">
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <div className="p-6 bg-[#f1f3f4] rounded-lg text-[#5f6368] flex items-center justify-center">
          <div className="text-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
              />
            </svg>
            <p>No posts yet.</p>
            <p className="text-sm mt-1">Be the first one to create a post!</p>
          </div>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="transition-transform duration-200 hover:translate-y-[-2px]">
            <PostCard post={post} />
          </div>
        ))
      )}
    </div>
  );
}
