import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface UseWebSocketOptions {
  enabled?: boolean;
  autoConnect?: boolean;
  requireAuth?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onPlanUpdate?: (data: any) => void;
  onSubscriptionUpdate?: (data: any) => void;
  onDashboardStatsUpdate?: (data: any) => void;
  onChatMessage?: (data: any) => void;
  onUserTyping?: (data: any) => void;
  onUserOnlineStatus?: (data: any) => void;
  onScrapeJobUpdate?: (data: any) => void;
  onScrapeJobDone?: (data: any) => void;
  onScrapeJobError?: (data: any) => void;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export function useWebSocket({
  enabled = true,
  autoConnect = true,
  requireAuth = true,
  onConnect,
  onDisconnect,
  onError,
  onPlanUpdate,
  onSubscriptionUpdate,
  onDashboardStatsUpdate,
  onChatMessage,
  onUserTyping,
  onUserOnlineStatus,
  onScrapeJobUpdate,
  onScrapeJobDone,
  onScrapeJobError,
}: UseWebSocketOptions = {}) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds

  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({
    onConnect,
    onDisconnect,
    onError,
    onPlanUpdate,
    onSubscriptionUpdate,
    onDashboardStatsUpdate,
    onChatMessage,
    onUserTyping,
    onUserOnlineStatus,
    onScrapeJobUpdate,
    onScrapeJobDone,
    onScrapeJobError,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onConnect,
      onDisconnect,
      onError,
      onPlanUpdate,
      onSubscriptionUpdate,
      onDashboardStatsUpdate,
      onChatMessage,
      onUserTyping,
      onUserOnlineStatus,
      onScrapeJobUpdate,
      onScrapeJobDone,
      onScrapeJobError,
    };
  }, [onConnect, onDisconnect, onError, onPlanUpdate, onSubscriptionUpdate, onDashboardStatsUpdate, onChatMessage, onUserTyping, onUserOnlineStatus, onScrapeJobUpdate, onScrapeJobDone, onScrapeJobError])

  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    console.log('🔑 WebSocket getAuthToken:', { hasToken: !!token, tokenLength: token?.length });
    return token;
  }, []);

  const clearAuthToken = useCallback(() => {
    localStorage.removeItem('auth_token');
    console.log('🗑️ WebSocket auth token cleared');
  }, []);

  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.connected) return;

    const token = getAuthToken();
    if (requireAuth && !token) {
      setState(prev => ({ ...prev, error: 'No authentication token available' }));
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const serverUrl = import.meta.env.VITE_WS_URL || 
        (typeof window !== 'undefined' ? window.location.origin : 'https://thescoremachine.com');

      const socketConfig: any = {
        transports: ['websocket', 'polling'],
        timeout: 30000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
      };

      // Only add auth if token is available and required
      if (token && requireAuth) {
        socketConfig.auth = { token };
        console.log('🔐 WebSocket connecting with auth token:', { 
          tokenPreview: token.substring(0, 20) + '...', 
          serverUrl,
          requireAuth 
        });
      } else {
        console.log('🔓 WebSocket connecting without auth:', { 
          hasToken: !!token, 
          requireAuth, 
          serverUrl 
        });
      }

      socketRef.current = io(serverUrl, socketConfig);

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setState({ connected: true, connecting: false, error: null });
        reconnectAttempts.current = 0;
        callbacksRef.current.onConnect?.();
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setState(prev => ({ ...prev, connected: false, connecting: false }));
        callbacksRef.current.onDisconnect?.(reason);
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 WebSocket connection error:', error);
        console.error('🔍 Error details:', {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context,
          data: error.data
        });
        reconnectAttempts.current++;
        
        // Batch state updates to prevent React queue issues
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          error: error.message 
        }));
        
        // Handle different types of errors
        if (error.message.includes('Authentication') || error.message.includes('token')) {
          toast.error('Authentication failed. Please log in again.');
          // Clear invalid token
          localStorage.removeItem('auth_token');
          callbacksRef.current.onError?.(error);
          return;
        }
        
        callbacksRef.current.onError?.(error);
        
        if (error.message.includes('timeout')) {
          toast.error('Connection timeout. Retrying...');
        }
        
        // Implement exponential backoff for reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttempts.current - 1),
            maxReconnectDelay
          );
          
          console.log(`⏳ Retrying connection in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled && !socketRef.current?.connected) {
              // Ensure we're not already connecting to prevent state conflicts
              setState(prev => {
                if (prev.connecting) return prev;
                return { ...prev, connecting: true, error: null };
              });
              connect();
            }
          }, delay);
        } else {
          toast.error('Unable to establish real-time connection. Please refresh the page.');
        }
      });

      socket.on('reconnect_failed', () => {
        console.error('🔴 WebSocket reconnection failed after all attempts');
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          error: 'Failed to reconnect after multiple attempts' 
        }));
        toast.error('Real-time connection lost. Please refresh the page to restore functionality.');
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
        setState(prev => ({ ...prev, connecting: true, error: null }));
      });
      
      socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
        reconnectAttempts.current = 0;
        toast.success('Real-time connection restored!');
      });

      // Plan update events
      socket.on('plan_updated', (data) => {
        try {
          console.log('📦 Plan update received:', data);
          
          // Validate data structure
          if (!data || typeof data !== 'object') {
            console.error('Invalid plan update data received:', data);
            return;
          }
          
          callbacksRef.current.onPlanUpdate?.(data);
          
          // Show user-friendly notifications
          if (data.data?.action === 'created' && data.data.plan?.name) {
            toast.success(`New plan "${data.data.plan.name}" created`);
          } else if (data.data?.action === 'updated' && data.data.plan?.name) {
            toast.success(`Plan "${data.data.plan.name}" updated`);
          } else if (data.data?.action === 'deleted' && data.data.plan?.name) {
            toast.info(`Plan "${data.data.plan.name}" deleted`);
          }
        } catch (error) {
          console.error('Error handling plan update:', error);
          toast.error('Failed to process plan update');
        }
      });

      // Subscription update events
      socket.on('subscription_updated', (data) => {
        try {
          console.log('💳 Subscription update received:', data);
          
          // Validate data structure
          if (!data || typeof data !== 'object') {
            console.error('Invalid subscription update data received:', data);
            return;
          }
          
          callbacksRef.current.onSubscriptionUpdate?.(data);
        } catch (error) {
          console.error('Error handling subscription update:', error);
          toast.error('Failed to process subscription update');
        }
      });

      // Dashboard stats update events
      socket.on('dashboard_stats_updated', (data) => {
        try {
          console.log('📊 Dashboard stats update received:', data);
          
          // Validate data structure
          if (!data || typeof data !== 'object') {
            console.error('Invalid dashboard stats data received:', data);
            return;
          }
          
          callbacksRef.current.onDashboardStatsUpdate?.(data);
        } catch (error) {
          console.error('Error handling dashboard stats update:', error);
          toast.error('Failed to process dashboard update');
        }
      });

      // Pricing update events (for public pricing pages)
      socket.on('pricing_updated', (data) => {
        try {
          console.log('💰 Pricing update received:', data);
          
          // Validate data structure
          if (!data || typeof data !== 'object') {
            console.error('Invalid pricing update data received:', data);
            return;
          }
          
          callbacksRef.current.onPlanUpdate?.(data);
        } catch (error) {
          console.error('Error handling pricing update:', error);
          // Don't show toast for pricing updates to avoid spam on public pages
        }
      });

      // Chat message events
      socket.on('chat_message_received', (data) => {
        try {
          console.log('💬 Chat message received:', data);
          
          if (!data || typeof data !== 'object') {
            console.error('Invalid chat message data received:', data);
            return;
          }
          
          callbacksRef.current.onChatMessage?.(data);
        } catch (error) {
          console.error('Error handling chat message:', error);
        }
      });

      // Scrape job events
      socket.on('scrape_job_update', (data) => {
        try {
          console.log('🧪 Scrape job update:', data);
          if (!data || typeof data !== 'object') return;
          callbacksRef.current.onScrapeJobUpdate?.(data);
        } catch (error) {
          console.error('Error handling scrape_job_update:', error);
        }
      });
      socket.on('scrape_job_done', (data) => {
        try {
          console.log('✅ Scrape job done:', data);
          if (!data || typeof data !== 'object') return;
          callbacksRef.current.onScrapeJobDone?.(data);
        } catch (error) {
          console.error('Error handling scrape_job_done:', error);
        }
      });
      socket.on('scrape_job_error', (data) => {
        try {
          console.log('🔴 Scrape job error:', data);
          if (!data || typeof data !== 'object') return;
          callbacksRef.current.onScrapeJobError?.(data);
        } catch (error) {
          console.error('Error handling scrape_job_error:', error);
        }
      });

      // User typing events
      socket.on('user_typing', (data) => {
        try {
          console.log('⌨️ User typing event:', data);
          
          if (!data || typeof data !== 'object') {
            console.error('Invalid typing data received:', data);
            return;
          }
          
          callbacksRef.current.onUserTyping?.(data);
        } catch (error) {
          console.error('Error handling typing event:', error);
        }
      });

      // User online status events
      socket.on('user_online_status', (data) => {
        try {
          console.log('🟢 User online status:', data);
          
          if (!data || typeof data !== 'object') {
            console.error('Invalid online status data received:', data);
            return;
          }
          
          callbacksRef.current.onUserOnlineStatus?.(data);
        } catch (error) {
          console.error('Error handling online status:', error);
        }
      });

      // Server shutdown notification
      socket.on('server_shutdown', (data) => {
        toast.error('Server is shutting down. Please save your work.');
      });

      // Subscription errors
      socket.on('subscription_error', (data) => {
        console.error('🔴 Subscription error:', data);
        toast.error(`Subscription error: ${data.error}`);
      });

    } catch (error) {
      console.error('🔴 Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      callbacksRef.current.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [enabled, getAuthToken]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState({ connected: false, connecting: false, error: null });
  }, []);

  const subscribe = useCallback((stream: string, filters?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { stream, filters });
      console.log(`📡 Subscribed to stream: ${stream}`);
    }
  }, []);

  const unsubscribe = useCallback((stream: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { stream });
      console.log(`📡 Unsubscribed from stream: ${stream}`);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit,
  };
}
