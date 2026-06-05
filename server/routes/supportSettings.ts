import express from 'express';
import { supportSettingsService } from '../services/supportSettingsService';
import { authenticateToken } from '../middleware/authMiddleware';
import type {
  SupportTeamMember,
  SupportNotificationSettings,
  SupportWorkingHours,
  SupportGeneralSettings
} from '../database/mysqlSchema';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Team Members Routes
router.get('/team-members', async (req, res) => {
  try {
    const teamMembers = await supportSettingsService.getAllTeamMembers();
    res.json({ success: true, data: teamMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team members' });
  }
});

router.get('/team-members/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid team member ID' });
    }

    const teamMember = await supportSettingsService.getTeamMemberById(id);
    if (!teamMember) {
      return res.status(404).json({ success: false, error: 'Team member not found' });
    }

    res.json({ success: true, data: teamMember });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team member' });
  }
});

router.post('/team-members', async (req, res) => {
  try {
    const memberData: Omit<SupportTeamMember, 'id' | 'created_at' | 'updated_at'> = req.body;
    
    // Validate required fields
    if (!memberData.name || !memberData.email || !memberData.role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, and role are required' 
      });
    }

    const memberId = await supportSettingsService.createTeamMember(memberData);
    const newMember = await supportSettingsService.getTeamMemberById(memberId);
    
    res.status(201).json({ success: true, data: newMember });
  } catch (error) {
    console.error('Error creating team member:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create team member' });
    }
  }
});

router.put('/team-members/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid team member ID' });
    }

    const memberData: Partial<SupportTeamMember> = req.body;
    const updated = await supportSettingsService.updateTeamMember(id, memberData);
    
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Team member not found' });
    }

    const updatedMember = await supportSettingsService.getTeamMemberById(id);
    res.json({ success: true, data: updatedMember });
  } catch (error) {
    console.error('Error updating team member:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update team member' });
    }
  }
});

router.delete('/team-members/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid team member ID' });
    }

    const deleted = await supportSettingsService.deleteTeamMember(id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Team member not found' });
    }

    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ success: false, error: 'Failed to delete team member' });
  }
});

// Notification Settings Routes
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const settings = await supportSettingsService.getNotificationSettings(userId);
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification settings' });
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const settingsData: Omit<SupportNotificationSettings, 'id' | 'created_at' | 'updated_at'> = req.body;
    
    const settingsId = await supportSettingsService.createOrUpdateNotificationSettings(settingsData);
    const updatedSettings = await supportSettingsService.getNotificationSettings(settingsData.user_id);
    
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save notification settings' });
  }
});

// Working Hours Routes
router.get('/working-hours', async (req, res) => {
  try {
    const workingHours = await supportSettingsService.getAllWorkingHours();
    res.json({ success: true, data: workingHours });
  } catch (error) {
    console.error('Error fetching working hours:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch working hours' });
  }
});

router.get('/working-hours/:day', async (req, res) => {
  try {
    const day = req.params.day.toLowerCase();
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    if (!validDays.includes(day)) {
      return res.status(400).json({ success: false, error: 'Invalid day of week' });
    }

    const workingHours = await supportSettingsService.getWorkingHoursByDay(day);
    res.json({ success: true, data: workingHours });
  } catch (error) {
    console.error('Error fetching working hours for day:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch working hours' });
  }
});

router.post('/working-hours', async (req, res) => {
  try {
    const hoursArray: Omit<SupportWorkingHours, 'id' | 'created_at' | 'updated_at'>[] = req.body;
    
    if (!Array.isArray(hoursArray)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request body must be an array of working hours' 
      });
    }

    const success = await supportSettingsService.updateAllWorkingHours(hoursArray);
    
    if (!success) {
      return res.status(500).json({ success: false, error: 'Failed to update working hours' });
    }

    const updatedHours = await supportSettingsService.getAllWorkingHours();
    res.json({ success: true, data: updatedHours });
  } catch (error) {
    console.error('Error updating working hours:', error);
    res.status(500).json({ success: false, error: 'Failed to update working hours' });
  }
});

router.put('/working-hours/:day', async (req, res) => {
  try {
    const day = req.params.day.toLowerCase();
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    if (!validDays.includes(day)) {
      return res.status(400).json({ success: false, error: 'Invalid day of week' });
    }

    const hoursData: Omit<SupportWorkingHours, 'id' | 'created_at' | 'updated_at'> = {
      ...req.body,
      day_of_week: day
    };

    const hoursId = await supportSettingsService.createOrUpdateWorkingHours(hoursData);
    const updatedHours = await supportSettingsService.getWorkingHoursByDay(day);
    
    res.json({ success: true, data: updatedHours });
  } catch (error) {
    console.error('Error updating working hours for day:', error);
    res.status(500).json({ success: false, error: 'Failed to update working hours' });
  }
});

// General Settings Routes
router.get('/general', async (req, res) => {
  try {
    const settings = await supportSettingsService.getGeneralSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching general settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch general settings' });
  }
});

router.post('/general', async (req, res) => {
  try {
    const settingsData: Omit<SupportGeneralSettings, 'id' | 'created_at' | 'updated_at'> = req.body;
    
    // Validate required fields
    if (!settingsData.company_name || !settingsData.support_email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company name and support email are required' 
      });
    }

    const settingsId = await supportSettingsService.createOrUpdateGeneralSettings(settingsData);
    const updatedSettings = await supportSettingsService.getGeneralSettings();
    
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error('Error saving general settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save general settings' });
  }
});

// Initialize default settings
router.post('/initialize', async (req, res) => {
  try {
    await supportSettingsService.initializeDefaultSettings();
    res.json({ success: true, message: 'Default settings initialized successfully' });
  } catch (error) {
    console.error('Error initializing default settings:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize default settings' });
  }
});

// Get all settings in one request
router.get('/all', async (req, res) => {
  try {
    const [teamMembers, notifications, workingHours, general] = await Promise.all([
      supportSettingsService.getAllTeamMembers(),
      supportSettingsService.getNotificationSettings(),
      supportSettingsService.getAllWorkingHours(),
      supportSettingsService.getGeneralSettings()
    ]);

    res.json({
      success: true,
      data: {
        teamMembers,
        notifications,
        workingHours,
        general
      }
    });
  } catch (error) {
    console.error('Error fetching all settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

export default router;