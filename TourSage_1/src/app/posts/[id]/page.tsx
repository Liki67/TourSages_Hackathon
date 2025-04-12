'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPostById } from '../../../firebase/firestore';
import { PostType } from '../../types';

export default function PostDetailsPage() {
  const params = useParams();
  const postId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [post, setPost] = useState<PostType | null>(null);

  useEffect(() => {
    if (postId) {
      getPostById(postId).then((data) => {
        setPost(data as PostType);
      });
    }
  }, [postId]);

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="fixed inset-0 z-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dadce0' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-[#dadce0] p-6">
          <h1 className="text-2xl font-normal text-[#202124] mb-4">{post.name}</h1>
          
          <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6 border border-[#dadce0]">
            <p className="text-[#5f6368] whitespace-pre-wrap">{post.message}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-[#5f6368] text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Posted by: {post.createdBy}</span>
            </div>
            
            <div className="flex items-center text-[#5f6368] text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Location: {post.latitude.toFixed(6)}, {post.longitude.toFixed(6)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
