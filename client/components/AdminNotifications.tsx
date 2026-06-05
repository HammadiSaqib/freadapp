import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminNotificationApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';

interface AdminNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
  sender_id?: number;
  sender_first_name?: string;
  sender_last_name?: string;
}

interface NotificationData {
  notifications: AdminNotification[];
  unreadCount: number;
  total: number;
}

interface AdminNotificationsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AdminNotifications: React.FC<AdminNotificationsProps> = ({ open, onOpenChange }) => {
  const { userProfile } = useAuthContext();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = open ?? isOpenInternal;
  const setIsOpen = onOpenChange ?? setIsOpenInternal;
  const canView = !!userProfile && ['admin', 'super_admin', 'user', 'employee', 'funding_manager'].includes(userProfile.role);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      if (!canView) return;
      setLoading(true);
      const response = await adminNotificationApi.getNotifications({ limit: 20 });
      const data: NotificationData = response.data.data;
      const currentUserId = userProfile?.id;
      const currentUserEmail = (userProfile?.email || '').toLowerCase();
      const filtered = (data.notifications || []).filter(n => {
        const sentByMe = typeof n.sender_id === 'number' && currentUserId ? n.sender_id === currentUserId : false;
        const isMyLogin = !!currentUserEmail && (n.title === 'User Login Activity') && n.message?.toLowerCase().includes(currentUserEmail);
        return sentByMe || isMyLogin;
      });
      setNotifications(filtered);
      setUnreadCount(filtered.filter(n => !n.is_read).length);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 403) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await adminNotificationApi.markAsRead(notificationId.toString());
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status !== 403) {
        console.error('Error marking notification as read:', error);
        toast.error('Failed to mark notification as read');
      }
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await adminNotificationApi.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status !== 403) {
        console.error('Error marking all notifications as read:', error);
        toast.error('Failed to mark all notifications as read');
      }
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'system':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Fetch notifications on component mount and when dropdown opens
  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [canView]);

  if (!canView) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-gradient-soft text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-6 px-2"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ocean-blue"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-3 cursor-default hover:bg-muted/50 text-slate-900 dark:text-slate-100 data-[highlighted]:text-slate-900 dark:data-[highlighted]:text-slate-100 ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-2 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          <div className={`w-1 h-1 rounded-full ${getPriorityColor(notification.priority)}`}></div>
                          {notification.sender_first_name && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              by {notification.sender_first_name} {notification.sender_last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="h-6 w-6 p-0 hover:bg-muted"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {notification.action_text && notification.action_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-6 text-xs"
                      disabled
                    >
                      {notification.action_text}
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNotifications}
                className="w-full"
              >
                Refresh notifications
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminNotifications;
