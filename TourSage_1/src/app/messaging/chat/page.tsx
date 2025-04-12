'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../../firebase/config'
import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  setDoc,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore'
import Header from '@/app/Header/page'

interface UserEntry {
  email: string
  displayName: string
  lastMessage?: string
  timestamp?: Date
  unread?: number
  status?: string
  photoURL?: string
}

export default function ChatListPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userList, setUserList] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email)
        setUserName(user.displayName || user.email?.split('@')[0] || 'User')

        // Save current user info to Firestore
        await setDoc(doc(db, 'users', user.email!), {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          status: 'online',
          lastSeen: new Date(),
        }, { merge: true })

        await fetchUserList(user.email!)
        setLoading(false)
      } else {
        // Redirect to login if not authenticated
        router.push('/messaging/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchUserList = async (currentEmail: string) => {
    try {
      const messagesRef = collection(db, 'messages')
      const q = query(messagesRef)
      const snapshot = await getDocs(q)

      const uniqueEmails = new Map<string, { lastMessage: string; timestamp: Date; unread: number }>()

      snapshot.forEach((doc) => {
        const data = doc.data()
        const timestamp = data.timestamp?.toDate() || new Date(0)
        
        if (data.sender === currentEmail) {
          if (!uniqueEmails.has(data.receiver) || 
              timestamp > uniqueEmails.get(data.receiver)!.timestamp) {
            uniqueEmails.set(data.receiver, {
              lastMessage: data.message,
              timestamp,
              unread: 0
            })
          }
        } else if (data.receiver === currentEmail) {
          if (!uniqueEmails.has(data.sender) || 
              timestamp > uniqueEmails.get(data.sender)!.timestamp) {
            const unread = data.read === false ? 1 : 0
            uniqueEmails.set(data.sender, {
              lastMessage: data.message,
              timestamp,
              unread
            })
          } else if (data.read === false) {
            const existing = uniqueEmails.get(data.sender)!
            uniqueEmails.set(data.sender, {
              ...existing,
              unread: existing.unread + 1
            })
          }
        }
      })

      const emailList: UserEntry[] = []

      for (const [email, messageData] of uniqueEmails.entries()) {
        const userDoc = await getDoc(doc(db, 'users', email))
        let userData: UserEntry = { 
          email, 
          displayName: email,
          lastMessage: messageData.lastMessage,
          timestamp: messageData.timestamp,
          unread: messageData.unread
        }
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          userData = {
            ...userData,
            displayName: data.displayName || email.split('@')[0] || 'Unknown User',
            status: data.status || 'offline',
            photoURL: data.photoURL
          }
        }
        
        emailList.push(userData)
      }

      // Sort by most recent message
      emailList.sort((a, b) => {
        return (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      })

      setUserList(emailList)
    } catch (error) {
      console.error("Error fetching user list:", error)
    }
  }

  // Add real-time listener for unread messages
  useEffect(() => {
    if (!userEmail) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('receiver', '==', userEmail),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      fetchUserList(userEmail);
    });

    return () => unsubscribe();
  }, [userEmail]);

  const handleClick = (email: string) => {
    router.push(`/messaging/chat/${encodeURIComponent(email)}`)
  }

  const handleNewChat = () => {
    // This would typically open a modal to select a new user
    router.push('/')
  }

  const filteredUserList = userList.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTimestamp = (date?: Date) => {
    if (!date) return ''
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date >= today) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (date >= yesterday) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="flex flex-col h-screen bg-white">
        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-[#dadce0]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-[#f1f3f4] rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-[#202124] placeholder-[#5f6368]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-[#5f6368]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* User List */}
        <div
          className="flex-1 overflow-y-auto bg-[#f8f9fa]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dadce0' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        >
          {filteredUserList.length > 0 ? (
            <div className="divide-y divide-[#dadce0]">
              {filteredUserList.map((user, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-[#f1f3f4] cursor-pointer transition-colors"
                  onClick={() => handleClick(user.email)}
                >
                  <div className="flex items-center">
                    {/* Avatar */}
                    <div className="relative mr-3">
                      <div className="w-12 h-12 rounded-full bg-[#e8f0fe] flex items-center justify-center text-xl font-medium text-[#1a73e8]">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                        user.status === 'online' ? 'bg-[#34a853]' : 'bg-[#5f6368]'
                      } border-2 border-white`}></div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium text-[#202124] truncate">
                          {user.displayName}
                        </h3>
                        <span className="text-xs text-[#5f6368] flex-shrink-0 ml-2">
                          {formatTimestamp(user.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-[#5f6368] truncate">
                        {user.lastMessage || "No messages yet"}
                      </p>
                    </div>

                    {/* Notification Badge */}
                    {user.unread ? (
                      <div className="ml-2 bg-[#1a73e8] text-white text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full">
                        {user.unread}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#5f6368] p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center">
                {searchQuery ? 'No conversations match your search' : 'Start messaging with a friend'}
              </p>
              <button
                onClick={handleNewChat}
                className="mt-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
              >
                Find a new conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}