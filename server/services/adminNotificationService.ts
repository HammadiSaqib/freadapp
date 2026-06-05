import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { AdminNotification } from '../database/superAdminSchema.js';

export interface CreateNotificationData {
  recipient_id: number;
  sender_id?: number;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'system';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  action_text?: string;
  expires_at?: string;
}

export class AdminNotificationService {
  private getDatabaseConnection() {
    return getDatabaseAdapter();
  }

  // Create a new notification
  async createNotification(data: CreateNotificationData): Promise<number> {
    try {
      const insertQuery = `
        INSERT INTO admin_notifications (
          recipient_id, sender_id, title, message, type, priority, 
          action_url, action_text, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await this.db.executeQuery(insertQuery, [
        data.recipient_id,
        data.sender_id || null,
        data.title,
        data.message,
        data.type || 'info',
        data.priority || 'medium',
        data.action_url || null,
        data.action_text || null,
        data.expires_at || null
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async createNotification(
    recipient_id: number,
    sender_id: number | null,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' | 'system' = 'info',
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    action_url?: string,
    action_text?: string,
    expires_at?: string
  ): Promise<void> {
    const db = getDatabaseAdapter();
    const insertQuery = `
      INSERT INTO admin_notifications (
        recipient_id, sender_id, title, message, type, priority, 
        action_url, action_text, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.executeQuery(insertQuery, [
      recipient_id,
      sender_id,
      title,
      message,
      type,
      priority,
      action_url || null,
      action_text || null,
      expires_at || null
    ]);
  }

  // Create user login notification
  static async createUserLoginNotification(email: string, ipAddress: string): Promise<void> {
    try {
      const db = getDatabaseAdapter();
      
      // Get all admin users to notify
      const adminUsers = await this.getAllAdminUsers();
      
      const title = 'User Login Activity';
      const message = `User ${email} logged in from IP: ${ipAddress}`;
      
      // Create notification for all admins
      for (const admin of adminUsers) {
        await this.createNotification(
          admin.id,
          null,
          title,
          message,
          'info',
          'low',
          '/admin/users',
          'View Users'
        );
      }
    } catch (error) {
      console.error('Error creating user login notification:', error);
    }
  }

  // Create notification for new user registration
  static async createNewUserNotification(email: string, firstName: string, lastName: string): Promise<void> {
    try {
      const adminUsers = await this.getAllAdminUsers();
      
      const title = 'New User Registration';
      const message = `New user registered: ${firstName} ${lastName} (${email})`;
      
      for (const admin of adminUsers) {
        await this.createNotification(
          admin.id,
          null,
          title,
          message,
          'success',
          'medium',
          '/admin/users',
          'View User'
        );
      }
    } catch (error) {
      console.error('Error creating new user notification:', error);
    }
  }

  // Create notification for customer activity
  static async createCustomerActivityNotification(userId: number, userEmail: string, activity: string): Promise<void> {
    try {
      const adminUsers = await this.getAllAdminUsers();
      
      const title = 'Customer Activity';
      const message = `Customer ${userEmail} ${activity}`;
      
      for (const admin of adminUsers) {
        await this.createNotification(
          admin.id,
          null,
          title,
          message,
          'info',
          'low',
          '/admin/customers',
          'View Customers'
        );
      }
    } catch (error) {
      console.error('Error creating customer activity notification:', error);
    }
  }

  // Create notification for system alerts
  static async createSystemAlert(alertType: string, message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Promise<void> {
    try {
      const adminUsers = await this.getAllAdminUsers();
      
      const title = `System Alert: ${alertType}`;
      
      for (const admin of adminUsers) {
        await this.createNotification(
          admin.id,
          null,
          title,
          message,
          'warning',
          priority,
          '/admin/system',
          'View System'
        );
      }
    } catch (error) {
      console.error('Error creating system alert notification:', error);
    }
  }

  // Create notification for affiliate activity
  static async createAffiliateActivityNotification(affiliateId: number, affiliateEmail: string, activity: string): Promise<void> {
    try {
      const adminUsers = await this.getAllAdminUsers();
      
      const title = 'Affiliate Activity';
      const message = `Affiliate ${affiliateEmail} ${activity}`;
      
      for (const admin of adminUsers) {
        await this.createNotification(
          admin.id,
          null,
          title,
          message,
          'info',
          'low',
          '/admin/affiliates',
          'View Affiliates'
        );
      }
    } catch (error) {
      console.error('Error creating affiliate activity notification:', error);
    }
  }

  // Get all admin users to send notifications to
  static async getAllAdminUsers(): Promise<Array<{ id: number; email: string }>> {
    try {
      const db = getDatabaseAdapter();
      const query = `
        SELECT id, email 
        FROM users 
        WHERE role = 'admin' AND is_active = TRUE
      `;
      
      const admins = await db.allQuery(query, []);
      return admins;
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  }

  // Broadcast notification to all admins
  static async broadcastToAllAdmins(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' | 'system' = 'info',
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    actionUrl?: string,
    actionText?: string
  ): Promise<void> {
    try {
      const adminUsers = await this.getAllAdminUsers();
      
      for (const admin of adminUsers) {
        await this.createNotification(
          admin.id,
          null,
          title,
          message,
          type,
          priority,
          actionUrl,
          actionText
        );
      }
    } catch (error) {
      console.error('Error broadcasting notification to all admins:', error);
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const deleteQuery = `
        DELETE FROM admin_notifications 
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
      `;
      
      await this.db.executeQuery(deleteQuery, []);
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const db = getDatabaseAdapter();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await db.deleteMany('admin_notifications', {
        where: {
          created_at: { lt: thirtyDaysAgo }
        }
      });
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

export const adminNotificationService = new AdminNotificationService();