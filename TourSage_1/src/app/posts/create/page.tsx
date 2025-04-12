'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '../../../firebase/firestore';
import LocationPicker from '../../../components/LocationPicker';

export default function CreatePostPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [voiceMessage, setVoiceMessage] = useState<Blob | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const eventCategories = [
    "Cultural Events",
    "Art and Entertainment Events",
    "Music and Dance Festivals",
    "Festivals and Fairs",
    "Historical and Heritage Events",
    "Tourism Promotion Events",
    "Sports and Adventure Events",
    "Nature and Eco-Tourism Events",
    "Educational and Intellectual Events"
  ];

  useEffect(() => {
    // Client-side only code
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

  const startRecording = async () => {
    try {
      // Stop any existing recording first
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      // Clean up previous recording
      if (voiceMessage) {
        URL.revokeObjectURL(URL.createObjectURL(voiceMessage));
        setVoiceMessage(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setVoiceMessage(audioBlob);
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      
      // Check each image size
      const oversizedImages = newImages.filter(file => file.size > 1024 * 1024); // 1MB in bytes
      
      if (oversizedImages.length > 0) {
        setError(`The following images exceed 1MB limit: ${oversizedImages.map(img => img.name).join(', ')}`);
        return;
      }
      
      setImages([...images, ...newImages]);
      setError(null);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('Start date cannot be in the past');
      return;
    }

    // If end date is already set and is before the new start date, clear it
    if (endDate && new Date(endDate) < selectedDate) {
      setEndDate('');
    }

    setStartDate(e.target.value);
    setError(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const startDateObj = new Date(startDate);

    if (selectedDate < startDateObj) {
      setError('End date must be after start date');
      return;
    }

    setEndDate(e.target.value);
    setError(null);
  };

  const handleCategoryChange = (category: string) => {
    setCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSubmit = async () => {
    if (!user || !user.email || !user.uid) {
      setError('Please log in to create an event');
      router.push('/messaging/login');
      return;
    }

    if (!eventName || !startDate || !endDate || (!textMessage && !voiceMessage) || categories.length === 0) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!location || location.lat === 0 || location.lng === 0) {
      setError('Please pick a location before submitting.');
      return;
    }

    const totalSize = images.reduce((total, file) => total + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      setError('Total size of all images cannot exceed 10MB');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const postData = {
        eventName,
        startDate,
        endDate,
        textMessage,
        voiceMessage,
        images,
        latitude: location.lat,
        longitude: location.lng,
        createdBy: user.email,
        creatorName: user.displayName || user.email.split('@')[0] || 'User',
        userId: user.uid,
        categories
      };

      console.log('Submitting post data:', postData);

      const postId = await createPost(postData);
      console.log('Post created successfully with ID:', postId);
      
      setSuccess('Event created successfully!');
      router.push('/?success=true');
    } catch (error: any) {
      console.error('Post creation failed:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to create events. Please log in again.');
        router.push('/messaging/login');
      } else if (error.code === 'unauthenticated') {
        setError('Please log in to create an event');
        router.push('/messaging/login');
      } else {
        setError('Failed to create post. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Background pattern overlay */}
      <div className="fixed inset-0 z-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dadce0' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-[#dadce0] p-6">
            <h1 className="text-2xl font-normal text-[#202124] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1a73e8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Create a New Event
            </h1>
            <p className="text-[#5f6368] mt-1">Share your event with the community</p>

            {error && (
              <div className="mt-4 p-4 bg-[#fce8e6] border border-[#d93025] rounded-lg text-[#d93025] text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mt-4 p-4 bg-[#e6f4ea] border border-[#34a853] rounded-lg text-[#34a853] text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="eventName" className="block text-sm font-medium text-[#202124]">Event Name*</label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="Enter event name"
                  className="w-full px-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-[#202124] placeholder-[#5f6368]"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#202124]">Categories*</label>
                <div className="grid grid-cols-2 gap-2">
                  {eventCategories.map((cat) => (
                    <label key={cat} className="flex items-center space-x-2 p-2 bg-[#f1f3f4] rounded-md hover:bg-[#e8f0fe] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categories.includes(cat)}
                        onChange={() => handleCategoryChange(cat)}
                        className="form-checkbox h-5 w-5 text-[#1a73e8] rounded focus:ring-[#1a73e8]"
                      />
                      <span className="text-[#202124]">{cat}</span>
                    </label>
                  ))}
                </div>
                {categories.length === 0 && (
                  <p className="text-sm text-[#d93025] mt-1">Please select at least one category</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="startDate" className="block text-sm font-medium text-[#202124]">Start Date*</label>
                  <input
                    id="startDate"
                    type="datetime-local"
                    className="w-full px-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-[#202124]"
                    value={startDate}
                    onChange={handleStartDateChange}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="endDate" className="block text-sm font-medium text-[#202124]">End Date*</label>
                  <input
                    id="endDate"
                    type="datetime-local"
                    className="w-full px-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-[#202124]"
                    value={endDate}
                    onChange={handleEndDateChange}
                    min={startDate || new Date().toISOString().slice(0, 16)}
                    disabled={!startDate}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="textMessage" className="block text-sm font-medium text-[#202124]">Text Message</label>
                <textarea
                  id="textMessage"
                  placeholder="What would you like to share?"
                  rows={5}
                  className="w-full px-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-[#202124] placeholder-[#5f6368] resize-none"
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#202124]">Voice Message</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-4 py-2 rounded-md ${
                      isRecording 
                        ? 'bg-[#d93025] hover:bg-[#c5221f] text-white' 
                        : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
                    } transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8]`}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  {voiceMessage && (
                    <audio controls className="flex-1">
                      <source src={URL.createObjectURL(voiceMessage)} type="audio/wav" />
                    </audio>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#202124]">
                  Upload Images
                  <span className="text-xs text-[#5f6368] ml-2">(Max 1MB per image, 10MB total)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full px-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-[#202124]"
                />
                {images.length > 0 && (
                  <div className="mt-2">
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md border border-[#dadce0]"
                          />
                          <button
                            onClick={() => {
                              const newImages = [...images];
                              newImages.splice(index, 1);
                              setImages(newImages);
                            }}
                            className="absolute top-1 right-1 bg-[#d93025] text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-[#c5221f]"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {(image.size / 1024).toFixed(1)}KB
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-[#5f6368]">
                      Total size: {(images.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)}MB
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#202124]">Location*</label>
                <div className="bg-white border border-[#dadce0] rounded-md overflow-hidden">
                  <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />
                </div>
                <p className="text-xs text-[#5f6368]">
                  {location.lat !== 0 && location.lng !== 0 
                    ? `Selected: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` 
                    : 'Click on the map to select your location'}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-6 border-t border-[#dadce0]">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 border border-[#dadce0] hover:bg-[#f1f3f4] text-[#5f6368] rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !eventName || !startDate || !endDate || (!textMessage && !voiceMessage) || location.lat === 0 || categories.length === 0}
                  className={`px-6 py-2 rounded-md text-white font-medium flex items-center gap-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2
                    ${(!eventName || !startDate || !endDate || (!textMessage && !voiceMessage) || location.lat === 0 || categories.length === 0)
                      ? 'bg-[#dadce0] text-[#5f6368] cursor-not-allowed'
                      : 'bg-[#1a73e8] hover:bg-[#1557b0]'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Publish Event</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}