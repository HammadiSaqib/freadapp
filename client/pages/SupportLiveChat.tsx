import { useState, useEffect, useRef } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  MessageSquare,
  Send,
  Phone,
  Video,
  Paperclip,
  Smile,
  MoreHorizontal,
  Clock,
  User,
  Circle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Ticket,
  Link
} from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  ticket_reference_id?: number;
  is_read: boolean;
  created_at: string;
  sender?: User;
  receiver?: User;
  ticket?: {
    id: number;
    title: string;
    status: string;
  };
}

interface ChatConversation {
  user: User;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isOnline: boolean;
}

interface TypingUser {
  userId: number;
  userEmail: string;
}

export default function SupportLiveChat() {
  const { toast } = useToast();
  const { connected, emit } = useWebSocket({
    enabled: true,
    autoConnect: true,
    requireAuth: true,
    onConnect: () => {
      console.log('WebSocket connected for chat');
    },
    onDisconnect: (reason) => {
      console.log('WebSocket disconnected:', reason);
    },
    onMessage: (data: any) => {
      if (selectedUser && (data.sender_id === selectedUser.id || data.receiver_id === selectedUser.id)) {
        const newMessage: ChatMessage = {
          id: data.id || Date.now(),
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
          message: data.message,
          ticket_reference_id: data.ticket_reference_id,
          is_read: data.is_read || false,
          created_at: data.created_at || new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
      }
    },
    onTyping: (data: { userId: number; userEmail: string; isTyping: boolean }) => {
      if (selectedUser && data.userId === selectedUser.id) {
        if (data.isTyping) {
          setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), {
            userId: data.userId,
            userEmail: data.userEmail
          }]);
        } else {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
      }
    },
    onOnlineStatus: (data: { userId: number; isOnline: boolean }) => {
      setConversations(prev => prev.map(conv => 
        conv.user.id === data.userId 
          ? { ...conv, user: { ...conv.user, isOnline: data.isOnline } }
          : conv
      ));
    }
  });
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ticketReference, setTicketReference] = useState<string>("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get current user from localStorage or context
  const [currentUser, setCurrentUser] = useState<any>({});
  
  // Load current user profile
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        } else {
          // Fallback to localStorage
          const localUser = JSON.parse(localStorage.getItem('user') || '{}');
          setCurrentUser(localUser);
        }
      } catch (error) {
        console.error('Error loading current user:', error);
        // Fallback to localStorage
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(localUser);
      }
    };
    
    loadCurrentUser();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join chat room when user is selected
  useEffect(() => {
    if (selectedUser && connected) {
      emit('join_chat', { receiverId: selectedUser.id });
    }
  }, [selectedUser, connected, emit]);

  // Load all available admin users for chat
  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/support/chat/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform users data to conversation format
        const users = data.users || [];
        const conversationsData = users.map((user: any) => ({
          user: {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            role: user.role
          },
          lastMessage: null,
          unreadCount: user.unread_count || 0,
          isOnline: user.status === 'active'
        }));
        setConversations(conversationsData);
      } else {
        toast({
          title: "Error",
          description: "Failed to load admin users",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading admin users:', error);
      // Ensure conversations remains an array on error
      setConversations([]);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected user
  const loadMessages = async (userId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/support/chat/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure we always set an array
        setMessages(Array.isArray(data) ? data : data.messages || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Ensure messages remains an array on error
      setMessages([]);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const token = localStorage.getItem('auth_token');
      const messageData = {
        receiver_id: selectedUser.id,
        message: newMessage.trim(),
        ticket_reference_id: ticketReference ? parseInt(ticketReference) : undefined
      };

      const response = await fetch('/api/support/chat/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const sentMessage = result.message || result;
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage("");
        setTicketReference("");
        
        // Send via WebSocket for real-time delivery
        if (connected) {
          emit('send_message', {
            receiver_id: selectedUser.id,
            message: sentMessage.message,
            ticket_reference_id: sentMessage.ticket_reference_id,
            id: sentMessage.id,
            sender_id: sentMessage.sender_id,
            created_at: sentMessage.created_at,
            is_read: sentMessage.is_read
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    loadMessages(user.id);
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!selectedUser || !connected) return;
    
    emit('typing_start', { receiverId: selectedUser.id });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      emit('typing_stop', { receiverId: selectedUser.id });
    }, 2000);
  };

  // Update conversation with new message
  const updateConversationLastMessage = (message: ChatMessage) => {
    setConversations(prev => prev.map(conv => {
      const isRelevant = conv.user.id === message.sender_id || conv.user.id === message.receiver_id;
      if (isRelevant) {
        return {
          ...conv,
          lastMessage: message,
          unreadCount: message.sender_id !== currentUser.id ? conv.unreadCount + 1 : conv.unreadCount
        };
      }
      return conv;
    }));
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <SupportLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Loading admin users...</p>
          </div>
        </div>
      </SupportLayout>
    );
  }

  return (
    <SupportLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Live Chat Support</h1>
            <p className="text-gray-600 mt-2">
              Chat with admin users for support and assistance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? "default" : "destructive"}>
              {connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-0 overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="lg:col-span-1 min-h-0">
            <Card className="h-full flex flex-col min-h-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Admin Users</CardTitle>
                  <Badge variant="secondary">{conversations.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search admin users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
                <div className="space-y-1" key="conversations-list">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.user.id}
                      onClick={() => handleUserSelect(conversation.user)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                        selectedUser?.id === conversation.user.id ? "bg-purple-50 border-l-4 border-l-purple-600" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.user.avatar} />
                            <AvatarFallback>
                              {conversation.user.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                            conversation.isOnline ? "bg-green-500" : "bg-gray-400"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">{conversation.user.name}</h4>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{conversation.user.email}</p>
                          {conversation.lastMessage && (
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {conversation.lastMessage.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            {selectedUser ? (
              <Card className="h-full flex flex-col">
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedUser.avatar} />
                          <AvatarFallback>
                            {selectedUser.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                          conversations.find(c => c.user.id === selectedUser.id)?.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{selectedUser.name}</h3>
                        <p className="text-sm text-gray-500">{selectedUser.email}</p>
                      </div>
                      <Badge variant="secondary">{selectedUser.role}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      // Ensure both IDs are numbers for proper comparison
                      const senderId = Number(message.sender_id);
                      const currentUserId = Number(currentUser.id);
                      const isCurrentUser = senderId === currentUserId;
                      

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isCurrentUser
                                ? "bg-blue-500 text-white ml-auto"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            {message.ticket_reference_id && (
                              <div className="flex items-center gap-1 mb-2 text-xs opacity-75">
                                <Ticket className="h-3 w-3" />
                                <span>Ticket #{message.ticket_reference_id}</span>
                              </div>
                            )}
                            <p className="text-sm">{typeof message.message === 'string' ? message.message : JSON.stringify(message.message)}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-70">
                                ID: {message.id} | {new Date(message.created_at).toLocaleString()}
                              </span>
                              {isCurrentUser && (
                                <div className="ml-2">
                                  {message.is_read ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <Circle className="h-3 w-3" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Typing Indicators */}
                    {typingUsers.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                          <p className="text-sm text-gray-600">
                            {typingUsers.map(u => u.userEmail).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  {/* Ticket Reference Input */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Reference ticket ID (optional)"
                        value={ticketReference}
                        onChange={(e) => setTicketReference(e.target.value)}
                        className="flex-1"
                        type="number"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !connected}
                        className="bg-purple-600 hover:bg-purple-700"
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                  <p className="text-gray-500">
                    Choose a conversation from the sidebar to start chatting
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SupportLayout>
  );
}