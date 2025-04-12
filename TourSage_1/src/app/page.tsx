"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { startPeriodicCleanup } from "../firebase/firestore";
import Header from "@/app/Header/page";
import Image from "next/image";
import EventMap from "./components/EventMap";

const eventCategories = [
  "Cultural Events",
  "Art and Entertainment Events",
  "Music and Dance Festivals",
  "Festivals and Fairs",
  "Historical and Heritage Events",
  "Tourism Promotion Events",
  "Sports and Adventure Events",
  "Nature and Eco-Tourism Events",
  "Educational and Intellectual Events",
];

interface Post {
  docId: string;
  eventName?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  textMessage?: string;
  message?: string;
  voiceMessage?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  createdBy?: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
  distance?: number;
  distanceInKm?: number;
  categories?: string[];
  [key: string]: any;
}

interface Event {
  id: string;
  eventName: string;
  startDate: string;
  endDate: string;
  textMessage: string;
  voiceMessage: string;
  images: string[];
  latitude: number;
  longitude: number;
  createdBy: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "latest">("latest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Initialize periodic cleanup
    startPeriodicCleanup();

    // Check for success parameter
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
      // Remove the success parameter from URL
      router.replace("/");
      // Hide success message after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/messaging/login");
      } else {
        // Type-safe property access with optional chaining and fallbacks
        setCurrentUserName(user?.displayName || user?.email || "User");
        setCurrentUserEmail(user?.email || null);
      }
    });

    const fetchPosts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        const postList: Post[] = querySnapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        }));

        // Filter out posts only if we have current user email
        const filteredPosts = currentUserEmail
          ? postList.filter(
              (post) => post.createdBy && post.createdBy !== currentUserEmail
            )
          : postList;

        // Calculate distances if user location is available
        const postsWithDistances = userLocation
          ? filteredPosts.map((post) => ({
              ...post,
              distance:
                post.latitude && post.longitude
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      post.latitude,
                      post.longitude
                    )
                  : undefined,
            }))
          : filteredPosts;

        setPosts(postsWithDistances);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch posts regardless of user email status
    fetchPosts();

    return () => unsubscribe();
  }, [router, searchParams]);

  // Function to calculate distance in kilometers
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Function to format distance
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} meters`;
    } else {
      const km = Math.floor(distance);
      const meters = Math.round((distance - km) * 1000);
      return `${km}km ${meters}m`;
    }
  };

  // Update posts with distances when user location changes
  useEffect(() => {
    if (userLocation) {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (!post.latitude || !post.longitude) return post;

          const distanceInKm = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            post.latitude,
            post.longitude
          );

          return {
            ...post,
            distance: distanceInKm,
            distanceInKm,
          };
        })
      );
    }
  }, [userLocation]);

  // Filter and sort posts based on sort option
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Sort based on the selected option
    if (sortBy === "latest") {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
    } else if (sortBy === "distance" && userLocation) {
      result.sort((a, b) => {
        if (!a.latitude || !a.longitude || !b.latitude || !b.longitude)
          return 0;
        const distanceA = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          a.latitude,
          a.longitude
        );
        const distanceB = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          b.latitude,
          b.longitude
        );
        return distanceA - distanceB; // Closest first
      });
    }

    // Filter by search query
    const searchFiltered = result.filter((post) => {
      const matchesSearch =
        searchQuery === "" ||
        post.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.textMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.message?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Filter by categories
    const categoryFiltered = searchFiltered.filter((post) => {
      const matchesCategories =
        selectedCategories.length === 0 ||
        (post.categories &&
          post.categories.some((category) =>
            selectedCategories.includes(category)
          ));
      return matchesCategories;
    });

    return categoryFiltered;
  }, [posts, sortBy, userLocation, searchQuery, selectedCategories]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Safely handle the email parameter
  const openChatWithUser = (userEmail: string | undefined) => {
    if (userEmail) {
      router.push(`/messaging/chat/${encodeURIComponent(userEmail)}`);
    } else {
      console.error("Cannot open chat: no email provided");
    }
  };

  const EventCard = ({ event }: { event: Post }) => {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);

    const handleCardClick = (e: React.MouseEvent) => {
      // Prevent navigation if clicking on the chat button
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      router.push(`/events/${event.docId}`);
    };

    const handleChatClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsChatOpen(true);
      // Redirect to chat page instead of showing modal
      router.push(
        `/messaging/chat/${encodeURIComponent(event.createdBy || "")}`
      );
    };

    // Check if current user is the event creator
    const isEventCreator = currentUserEmail === event.createdBy;

    return (
      <div
        className="bg-white rounded-lg border border-[#dadce0] shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        <div className="relative h-48">
          {event.images && event.images.length > 0 && !imageError ? (
            <Image
              src={event.images[0]}
              alt={event.eventName || "Untitled Event"}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              priority
            />
          ) : (
            <div className="w-full h-full bg-[#f1f3f4] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-[#5f6368]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="text-xl font-normal text-white">
              {event.eventName || "Untitled Event"}
            </h3>
            <p className="text-gray-100 text-sm mt-1">
              {new Date(event.startDate || "").toLocaleDateString()} -{" "}
              {new Date(event.endDate || "").toLocaleDateString()}
            </p>

            {event.distance && (
              <p className="text-gray-100 text-sm mt-1 flex items-center">
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
                {event.distance} away
              </p>
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="text-[#202124] line-clamp-2">
            {event.textMessage || event.message || ""}
          </p>

          {/* Categories Section */}
          {event.categories && event.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {event.categories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[#e8f0fe] text-[#1a73e8] text-xs rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {event.createdBy?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <span className="text-[#5f6368] text-sm">
                {event.createdBy || "Anonymous"}
              </span>
            </div>

            {!isEventCreator && (
              <button
                onClick={handleChatClick}
                className="px-4 py-2 text-[#1a73e8] hover:bg-[#f1f3f4] rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
              >
                Chat
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((cat) => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
          <p className="mt-4 text-[#5f6368]">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-[#e6f4ea] border border-[#34a853] text-[#34a853] px-6 py-3 rounded-lg shadow-sm z-50 flex items-center gap-2">
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
              d="M5 13l4 4L19 7"
            />
          </svg>
          Event created successfully!
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Section */}
        <div className="mb-8">
          {/* Search Header */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="w-full md:w-96">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dadce0] rounded-full text-[#202124] placeholder-[#5f6368] focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all duration-200"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5f6368]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2 whitespace-nowrap ${
                showFilters
                  ? "bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#e8f0fe]/80"
                  : "bg-[#1a73e8] text-white hover:bg-[#1557b0]"
              }`}
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
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white border border-[#dadce0] rounded-lg p-6 mb-4 animate-slideDown">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#202124] text-lg font-normal">
                  Filter by Categories
                </h3>
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-[#1a73e8] text-sm hover:bg-[#f1f3f4] px-3 py-1 rounded-full transition-colors duration-200"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {eventCategories.map((category) => (
                  <label
                    key={category}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedCategories.includes(category)
                        ? "bg-[#e8f0fe] text-[#1a73e8] ring-1 ring-[#1a73e8]"
                        : "bg-[#f8f9fa] text-[#5f6368] hover:bg-[#f1f3f4]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="form-checkbox h-4 w-4 text-[#1a73e8] rounded border-[#5f6368] focus:ring-[#1a73e8] transition-colors duration-200"
                    />
                    <span className="ml-2 text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-[#5f6368] bg-[#f8f9fa] px-4 py-2 rounded-lg">
            <span>
              Showing{" "}
              <strong className="text-[#202124]">{filteredPosts.length}</strong>{" "}
              of <strong className="text-[#202124]">{posts.length}</strong>{" "}
              events
            </span>
            {selectedCategories.length > 0 && (
              <span>
                {selectedCategories.length}{" "}
                {selectedCategories.length === 1 ? "filter" : "filters"} applied
              </span>
            )}
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-normal text-[#202124] flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#1a73e8]"
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
              Event Locations
              <span className="text-sm text-[#5f6368] font-normal ml-2">
                ({posts.length} locations)
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 text-[#1a73e8] hover:bg-[#f1f3f4] rounded-full transition-colors duration-200 flex items-center gap-2 text-sm"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                      setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      });
                    });
                  }
                }}
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Update Location
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-sm">
            <div className="relative ml-10 mr-10 mb-10 mt-5">
              {!userLocation && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-[#fce8e6] text-[#d93025] px-4 py-2 flex items-center gap-2 text-sm border-b border-[#fadad7]">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Enable location services to see your position on the map
                </div>
              )}
              <div className="h-[500px]">
                <EventMap
                  events={posts.map((post) => ({
                    id: post.docId,
                    eventName: post.eventName || "Unnamed Event",
                    latitude: post.latitude || 0,
                    longitude: post.longitude || 0,
                    createdBy: post.createdBy || "Anonymous",
                    imageUrl: post.images?.[0] || null,
                    distance: post.distance?.toString() || "0",
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-[#5f6368]">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "distance" | "latest")
              }
              className="bg-white border border-[#dadce0] text-[#202124] px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
            >
              <option value="latest">Latest</option>
              <option value="distance">Distance</option>
            </select>
          </div>
          {sortBy === "distance" && !userLocation && (
            <p className="text-[#d93025] text-sm flex items-center gap-2">
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
              Please allow location access to sort by distance
            </p>
          )}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <EventCard key={post.docId} event={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
