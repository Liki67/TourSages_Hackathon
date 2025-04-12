'use client';
import React from 'react';

export default function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const handleSelectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (latitude && longitude) {
          onPick(latitude, longitude);
        } else {
          alert("Unable to fetch location values");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get your location");
      }
    );
  };

  return (
    <button
      onClick={handleSelectLocation}
      className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
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
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
      Use Current Location
    </button>
  );
}
