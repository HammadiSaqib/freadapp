import { Request, Response, NextFunction } from 'express';
import { AdminNotificationService } from '../services/adminNotificationService';

// Middleware to create notification when user logs in
export const notifyUserLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only proceed if login was successful (check response status)
    const originalSend = res.send;
    res.send = function(data) {
      // Check if this is a successful login response
      if (res.statusCode === 200 && req.body.email) {
        // Create notification asynchronously (don't block response)
        AdminNotificationService.createUserLoginNotification(
          req.body.email,
          req.ip || 'Unknown IP'
        ).catch(error => {
          console.error('Failed to create login notification:', error);
        });
      }
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in notifyUserLogin middleware:', error);
    next(); // Continue even if notification fails
  }
};

// Middleware to create notification when new user registers
export const notifyUserRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const originalSend = res.send;
    res.send = function(data) {
      // Check if this is a successful registration response
      if (res.statusCode === 201 && req.body.email) {
        // Create notification asynchronously
        AdminNotificationService.createNewUserNotification(
          req.body.email,
          req.body.first_name || 'New',
          req.body.last_name || 'User'
        ).catch(error => {
          console.error('Failed to create registration notification:', error);
        });
      }
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in notifyUserRegistration middleware:', error);
    next();
  }
};

// Middleware to create notification for customer activities
export const notifyCustomerActivity = (activityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalSend = res.send;
      res.send = function(data) {
        // Check if this is a successful activity response
        if (res.statusCode === 200 || res.statusCode === 201) {
          const userId = req.user?.id || req.body.user_id || req.params.userId;
          const userEmail = req.user?.email || req.body.email;
          
          if (userId || userEmail) {
            // Create notification asynchronously
            AdminNotificationService.createCustomerActivityNotification(
              userId,
              userEmail || 'Unknown User',
              activityType
            ).catch(error => {
              console.error('Failed to create customer activity notification:', error);
            });
          }
        }
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in notifyCustomerActivity middleware:', error);
      next();
    }
  };
};

// Middleware to create notification for affiliate activities
export const notifyAffiliateActivity = (activityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalSend = res.send;
      res.send = function(data) {
        // Check if this is a successful activity response
        if (res.statusCode === 200 || res.statusCode === 201) {
          const affiliateId = req.user?.id || req.body.affiliate_id || req.params.affiliateId;
          const affiliateEmail = req.user?.email || req.body.email;
          
          if (affiliateId || affiliateEmail) {
            // Create notification asynchronously
            AdminNotificationService.createAffiliateActivityNotification(
              affiliateId,
              affiliateEmail || 'Unknown Affiliate',
              activityType
            ).catch(error => {
              console.error('Failed to create affiliate activity notification:', error);
            });
          }
        }
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in notifyAffiliateActivity middleware:', error);
      next();
    }
  };
};

// Middleware to create system alert notifications
export const notifySystemAlert = (alertType: string, message: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Create system alert notification
      AdminNotificationService.createSystemAlert(alertType, message).catch(error => {
        console.error('Failed to create system alert notification:', error);
      });
      
      next();
    } catch (error) {
      console.error('Error in notifySystemAlert middleware:', error);
      next();
    }
  };
};