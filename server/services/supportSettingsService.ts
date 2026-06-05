import { executeQuery, getAllMySQLQuery, getMySQLQuery, runMySQLQuery } from '../database/mysqlSchema';
import type {
  SupportTeamMember,
  SupportNotificationSettings,
  SupportWorkingHours,
  SupportGeneralSettings
} from '../database/mysqlSchema';

export class SupportSettingsService {
  // Team Members CRUD Operations
  async getAllTeamMembers(): Promise<SupportTeamMember[]> {
    const query = `
      SELECT id, name, email, role, status, permissions, avatar, phone, 
             department, hire_date, last_active, created_at, updated_at
      FROM support_team_members 
      ORDER BY created_at DESC
    `;
    const members = await getAllMySQLQuery<SupportTeamMember>(query);
    
    // Parse JSON permissions for each member
    return members.map(member => ({
      ...member,
      permissions: typeof member.permissions === 'string' 
        ? JSON.parse(member.permissions) 
        : member.permissions
    }));
  }

  async getTeamMemberById(id: number): Promise<SupportTeamMember | null> {
    const query = `
      SELECT id, name, email, role, status, permissions, avatar, phone, 
             department, hire_date, last_active, created_at, updated_at
      FROM support_team_members 
      WHERE id = ?
    `;
    const member = await getMySQLQuery<SupportTeamMember>(query, [id]);
    
    if (member && typeof member.permissions === 'string') {
      member.permissions = JSON.parse(member.permissions);
    }
    
    return member;
  }

  async createTeamMember(memberData: Omit<SupportTeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const query = `
      INSERT INTO support_team_members 
      (name, email, role, status, permissions, avatar, phone, department, hire_date, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const permissionsJson = typeof memberData.permissions === 'string' 
      ? memberData.permissions 
      : JSON.stringify(memberData.permissions);
    
    const result = await runMySQLQuery(query, [
      memberData.name,
      memberData.email,
      memberData.role,
      memberData.status,
      permissionsJson,
      memberData.avatar || null,
      memberData.phone || null,
      memberData.department || null,
      memberData.hire_date || null,
      memberData.last_active || null
    ]);
    
    return result.lastID;
  }

  async updateTeamMember(id: number, memberData: Partial<SupportTeamMember>): Promise<boolean> {
    const fields = [];
    const values = [];
    
    if (memberData.name !== undefined) {
      fields.push('name = ?');
      values.push(memberData.name);
    }
    if (memberData.email !== undefined) {
      fields.push('email = ?');
      values.push(memberData.email);
    }
    if (memberData.role !== undefined) {
      fields.push('role = ?');
      values.push(memberData.role);
    }
    if (memberData.status !== undefined) {
      fields.push('status = ?');
      values.push(memberData.status);
    }
    if (memberData.permissions !== undefined) {
      fields.push('permissions = ?');
      const permissionsJson = typeof memberData.permissions === 'string' 
        ? memberData.permissions 
        : JSON.stringify(memberData.permissions);
      values.push(permissionsJson);
    }
    if (memberData.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(memberData.avatar);
    }
    if (memberData.phone !== undefined) {
      fields.push('phone = ?');
      values.push(memberData.phone);
    }
    if (memberData.department !== undefined) {
      fields.push('department = ?');
      values.push(memberData.department);
    }
    if (memberData.hire_date !== undefined) {
      fields.push('hire_date = ?');
      values.push(memberData.hire_date);
    }
    if (memberData.last_active !== undefined) {
      fields.push('last_active = ?');
      values.push(memberData.last_active);
    }
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE support_team_members SET ${fields.join(', ')} WHERE id = ?`;
    const result = await runMySQLQuery(query, values);
    
    return result.changes > 0;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const query = 'DELETE FROM support_team_members WHERE id = ?';
    const result = await runMySQLQuery(query, [id]);
    return result.changes > 0;
  }

  // Notification Settings CRUD Operations
  async getNotificationSettings(userId?: number): Promise<SupportNotificationSettings | null> {
    let query = 'SELECT * FROM support_notification_settings';
    const params = [];
    
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    } else {
      query += ' WHERE user_id IS NULL';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 1';
    
    return await getMySQLQuery<SupportNotificationSettings>(query, params);
  }

  async createOrUpdateNotificationSettings(
    settingsData: Omit<SupportNotificationSettings, 'id' | 'created_at' | 'updated_at'>
  ): Promise<number> {
    // Check if settings already exist
    const existing = await this.getNotificationSettings(settingsData.user_id);
    
    if (existing) {
      // Update existing settings
      const query = `
        UPDATE support_notification_settings 
        SET email_notifications = ?, push_notifications = ?, sms_notifications = ?,
            new_ticket_alerts = ?, ticket_updates = ?, escalation_alerts = ?,
            daily_reports = ?, weekly_reports = ?
        WHERE id = ?
      `;
      
      await runMySQLQuery(query, [
        settingsData.email_notifications,
        settingsData.push_notifications,
        settingsData.sms_notifications,
        settingsData.new_ticket_alerts,
        settingsData.ticket_updates,
        settingsData.escalation_alerts,
        settingsData.daily_reports,
        settingsData.weekly_reports,
        existing.id
      ]);
      
      return existing.id!;
    } else {
      // Create new settings
      const query = `
        INSERT INTO support_notification_settings 
        (user_id, email_notifications, push_notifications, sms_notifications,
         new_ticket_alerts, ticket_updates, escalation_alerts, daily_reports, weekly_reports)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await runMySQLQuery(query, [
        settingsData.user_id || null,
        settingsData.email_notifications,
        settingsData.push_notifications,
        settingsData.sms_notifications,
        settingsData.new_ticket_alerts,
        settingsData.ticket_updates,
        settingsData.escalation_alerts,
        settingsData.daily_reports,
        settingsData.weekly_reports
      ]);
      
      return result.lastID;
    }
  }

  // Working Hours CRUD Operations
  async getAllWorkingHours(): Promise<SupportWorkingHours[]> {
    const query = `
      SELECT * FROM support_working_hours 
      ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    `;
    return await getAllMySQLQuery<SupportWorkingHours>(query);
  }

  async getWorkingHoursByDay(dayOfWeek: string): Promise<SupportWorkingHours | null> {
    const query = 'SELECT * FROM support_working_hours WHERE day_of_week = ?';
    return await getMySQLQuery<SupportWorkingHours>(query, [dayOfWeek]);
  }

  async createOrUpdateWorkingHours(
    hoursData: Omit<SupportWorkingHours, 'id' | 'created_at' | 'updated_at'>
  ): Promise<number> {
    // Check if working hours for this day already exist
    const existing = await this.getWorkingHoursByDay(hoursData.day_of_week);
    
    if (existing) {
      // Update existing hours
      const query = `
        UPDATE support_working_hours 
        SET start_time = ?, end_time = ?, is_working_day = ?
        WHERE day_of_week = ?
      `;
      
      await runMySQLQuery(query, [
        hoursData.start_time,
        hoursData.end_time,
        hoursData.is_working_day,
        hoursData.day_of_week
      ]);
      
      return existing.id!;
    } else {
      // Create new hours
      const query = `
        INSERT INTO support_working_hours (day_of_week, start_time, end_time, is_working_day)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await runMySQLQuery(query, [
        hoursData.day_of_week,
        hoursData.start_time,
        hoursData.end_time,
        hoursData.is_working_day
      ]);
      
      return result.lastID;
    }
  }

  async updateAllWorkingHours(hoursArray: Omit<SupportWorkingHours, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      for (const hours of hoursArray) {
        await this.createOrUpdateWorkingHours(hours);
      }
      return true;
    } catch (error) {
      console.error('Error updating working hours:', error);
      return false;
    }
  }

  // General Settings CRUD Operations
  async getGeneralSettings(): Promise<SupportGeneralSettings | null> {
    const query = 'SELECT * FROM support_general_settings ORDER BY created_at DESC LIMIT 1';
    return await getMySQLQuery<SupportGeneralSettings>(query);
  }

  async createOrUpdateGeneralSettings(
    settingsData: Omit<SupportGeneralSettings, 'id' | 'created_at' | 'updated_at'>
  ): Promise<number> {
    // Check if general settings already exist
    const existing = await this.getGeneralSettings();
    
    if (existing) {
      // Update existing settings
      const query = `
        UPDATE support_general_settings 
        SET company_name = ?, support_email = ?, timezone = ?, language = ?,
            auto_assignment = ?, ticket_auto_close_days = ?, max_tickets_per_agent = ?,
            response_time_target = ?, resolution_time_target = ?
        WHERE id = ?
      `;
      
      await runMySQLQuery(query, [
        settingsData.company_name,
        settingsData.support_email,
        settingsData.timezone,
        settingsData.language,
        settingsData.auto_assignment,
        settingsData.ticket_auto_close_days,
        settingsData.max_tickets_per_agent,
        settingsData.response_time_target,
        settingsData.resolution_time_target,
        existing.id
      ]);
      
      return existing.id!;
    } else {
      // Create new settings
      const query = `
        INSERT INTO support_general_settings 
        (company_name, support_email, timezone, language, auto_assignment,
         ticket_auto_close_days, max_tickets_per_agent, response_time_target, resolution_time_target)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await runMySQLQuery(query, [
        settingsData.company_name,
        settingsData.support_email,
        settingsData.timezone,
        settingsData.language,
        settingsData.auto_assignment,
        settingsData.ticket_auto_close_days,
        settingsData.max_tickets_per_agent,
        settingsData.response_time_target,
        settingsData.resolution_time_target
      ]);
      
      return result.lastID;
    }
  }

  // Initialize default settings
  async initializeDefaultSettings(): Promise<void> {
    try {
      // Initialize default working hours if none exist
      const existingHours = await this.getAllWorkingHours();
      if (existingHours.length === 0) {
        const defaultHours = [
          { day_of_week: 'monday', start_time: '09:00', end_time: '17:00', is_working_day: true },
          { day_of_week: 'tuesday', start_time: '09:00', end_time: '17:00', is_working_day: true },
          { day_of_week: 'wednesday', start_time: '09:00', end_time: '17:00', is_working_day: true },
          { day_of_week: 'thursday', start_time: '09:00', end_time: '17:00', is_working_day: true },
          { day_of_week: 'friday', start_time: '09:00', end_time: '17:00', is_working_day: true },
          { day_of_week: 'saturday', start_time: '09:00', end_time: '17:00', is_working_day: false },
          { day_of_week: 'sunday', start_time: '09:00', end_time: '17:00', is_working_day: false }
        ];
        
        await this.updateAllWorkingHours(defaultHours);
      }

      // Initialize default general settings if none exist
      const existingSettings = await this.getGeneralSettings();
      if (!existingSettings) {
        await this.createOrUpdateGeneralSettings({
          company_name: 'Credit Repair Company',
          support_email: 'support@creditrepair.com',
          timezone: 'UTC',
          language: 'en',
          auto_assignment: true,
          ticket_auto_close_days: 30,
          max_tickets_per_agent: 50,
          response_time_target: 24,
          resolution_time_target: 72
        });
      }

      // Initialize default notification settings if none exist
      const existingNotifications = await this.getNotificationSettings();
      if (!existingNotifications) {
        await this.createOrUpdateNotificationSettings({
          user_id: null,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          new_ticket_alerts: true,
          ticket_updates: true,
          escalation_alerts: true,
          daily_reports: false,
          weekly_reports: true
        });
      }
    } catch (error) {
      console.error('Error initializing default settings:', error);
      throw error;
    }
  }
}

export const supportSettingsService = new SupportSettingsService();