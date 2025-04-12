'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { auth, db } from '../../../../firebase/config'
import { onAuthStateChanged, User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore'

// Define types for messages and user data
interface Message {
  id: string
  sender: string
  receiver: string
  message: string
  timestamp: Timestamp | null
  participants: string[]
}

interface UserData {
  displayName?: string
  status?: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherUserEmail = decodeURIComponent(params.user as string)
  
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [otherUserName, setOtherUserName] = useState<string>('User')
  const [otherUserStatus, setOtherUserStatus] = useState<string>('offline')
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showEmoji, setShowEmoji] = useState<boolean>(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (user && user.email) {
        setCurrentUser(user.email)
        await fetchOtherUserName(otherUserEmail)
        listenToMessages(user.email)
        setLoading(false)
      } else {
        router.push('/messaging/login')
      }
    })
    
    return () => unsubscribeAuth()
  }, [otherUserEmail, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const fetchOtherUserName = async (email: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', email))
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData
        setOtherUserName(data.displayName || email)
        setOtherUserStatus(data.status || 'offline')
      } else {
        setOtherUserName(email)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const listenToMessages = (currentEmail: string) => {
    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentEmail),
      orderBy('timestamp')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
        .filter(
          (msg) =>
            (msg.sender === currentEmail && msg.receiver === otherUserEmail) ||
            (msg.sender === otherUserEmail && msg.receiver === currentEmail)
        )

      setMessages(msgs)
    })

    return unsubscribe
  }

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return

    await addDoc(collection(db, 'messages'), {
      sender: currentUser,
      receiver: otherUserEmail,
      message: message.trim(),
      participants: [currentUser, otherUserEmail],
      timestamp: serverTimestamp(),
      read: false
    })

    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Add typing indicator handler
  const handleTyping = () => {
    if (!currentUser) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status to true
    setIsTyping(true);

    // Update typing status in Firestore
    const typingRef = doc(db, 'typing', `${currentUser}_${otherUserEmail}`);
    setDoc(typingRef, {
      isTyping: true,
      timestamp: serverTimestamp()
    });

    // Set timeout to mark as not typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setDoc(typingRef, {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    }, 3000);
  };

  // Listen for other user's typing status
  useEffect(() => {
    if (!currentUser) return;

    const typingRef = doc(db, 'typing', `${otherUserEmail}_${currentUser}`);
    const unsubscribe = onSnapshot(typingRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setOtherUserTyping(data.isTyping);
      }
    });

    return () => unsubscribe();
  }, [currentUser, otherUserEmail]);

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (currentUser) {
        const typingRef = doc(db, 'typing', `${currentUser}_${otherUserEmail}`);
        setDoc(typingRef, {
          isTyping: false,
          timestamp: serverTimestamp()
        });
      }
    };
  }, [currentUser, otherUserEmail]);

  // Add function to mark messages as read
  const markMessagesAsRead = async () => {
    if (!currentUser) return;

    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('receiver', '==', currentUser),
        where('sender', '==', otherUserEmail),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Update useEffect to mark messages as read when chat is opened
  useEffect(() => {
    if (currentUser && otherUserEmail) {
      markMessagesAsRead();
    }
  }, [currentUser, otherUserEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm py-4 px-6 flex items-center border-b border-[#dadce0]">
        <div className="relative mr-3">
          <div className="w-10 h-10 rounded-full bg-[#e8f0fe] flex items-center justify-center text-xl font-medium text-[#1a73e8]">
            {otherUserName.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
            otherUserStatus === 'online' ? 'bg-[#34a853]' : 'bg-[#5f6368]'
          } border-2 border-white`}></div>
        </div>
        <div>
          <h2 className="font-medium text-[#202124] text-lg">{otherUserName}</h2>
          <p className="text-xs text-[#5f6368]">{otherUserStatus}</p>
        </div>
        <button className="ml-auto text-[#5f6368] hover:text-[#202124] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f9fa]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dadce0' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {messages.map((msg, idx) => {
          const isCurrentUser = msg.sender === currentUser
          const prevMessage = messages[idx - 1]
          const showDate = idx === 0 || (
            prevMessage?.timestamp && 
            msg.timestamp && 
            prevMessage.timestamp.toDate().toDateString() !== 
            msg.timestamp.toDate().toDateString()
          )
          
          return (
            <div key={msg.id}>
              {showDate && msg.timestamp && (
                <div className="flex justify-center my-4">
                  <span className="text-xs bg-[#f1f3f4] rounded-full px-4 py-1 text-[#5f6368]">
                    {msg.timestamp.toDate().toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                {!isCurrentUser && (
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] flex items-center justify-center text-sm font-medium text-[#1a73e8] mr-2 mt-1">
                    {otherUserName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div 
                  className={`max-w-xs md:max-w-md rounded-lg py-2 px-4 ${
                    isCurrentUser 
                      ? 'bg-[#1a73e8] text-white rounded-br-none' 
                      : 'bg-white border border-[#dadce0] rounded-bl-none'
                  }`}
                >
                  <div className={`text-sm ${!isCurrentUser && 'text-[#202124]'}`}>{msg.message}</div>
                  <div className={`text-xs mt-1 ${isCurrentUser ? 'text-white/80' : 'text-[#5f6368]'} text-right`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <div className="flex items-center space-x-2 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#e8f0fe] flex items-center justify-center text-sm font-medium text-[#1a73e8]">
              {otherUserName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white border border-[#dadce0] rounded-lg py-2 px-4 rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#5f6368] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[#5f6368] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[#5f6368] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-[#dadce0] p-4">
        <div className="flex items-center bg-[#f1f3f4] rounded-full p-1">
          <button 
            className="p-2 rounded-full text-[#5f6368] hover:text-[#202124] focus:outline-none transition-colors"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-2 rounded-full text-[#5f6368] hover:text-[#202124] focus:outline-none transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none mx-2 py-2 h-10 max-h-32 overflow-auto text-[#202124] placeholder-[#5f6368]"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              autoResizeTextarea()
              handleTyping()
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className={`rounded-full p-2 focus:outline-none transition-all ${
              message.trim() 
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white' 
                : 'bg-[#f1f3f4] text-[#5f6368] cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}