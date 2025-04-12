'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/firebase/firestore';
import LocationPicker from '@/components/LocationPicker';

export default function PostForm() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const handleSubmit = async () => {
    if (!name || !message) return alert('Please fill in all fields.');
    if (!location || location.lat === 0 || location.lng === 0)
      return alert('Please pick a location before submitting');
  
    try {
      setIsSubmitting(true);
      await createPost({
        name,
        message,
        latitude: location.lat,
        longitude: location.lng,
        createdBy: user.email,
        timestamp: new Date(),
      });
      router.push('/?success=true');
    } catch (error) {
      console.error('Post creation failed:', error);
      alert('Failed to create post. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-[#dadce0]">
      <h2 className="text-[#202124] text-xl font-normal mb-6">Create New Post</h2>
      
      <div className="space-y-4">
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Post title"
            className="w-full px-4 py-2 bg-[#f1f3f4] rounded-md text-[#202124] placeholder-[#5f6368] border-none focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:bg-white transition-colors duration-200"
          />
        </div>

        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            rows={4}
            className="w-full px-4 py-2 bg-[#f1f3f4] rounded-md text-[#202124] placeholder-[#5f6368] border-none focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:bg-white transition-colors duration-200 resize-none"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-[#5f6368]">
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
          </svg>
          {location.lat === 0 ? 'No location selected' : `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
        </div>

        <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !message || location.lat === 0}
            className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2 disabled:bg-[#dadce0] disabled:hover:bg-[#dadce0] disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/60 border-t-white"></div>
                Submitting...
              </>
            ) : (
              'Create Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
