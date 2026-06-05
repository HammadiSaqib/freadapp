import { Router, Request, Response } from 'express';
import { getQuery, runQuery, allQuery } from '../database/databaseAdapter.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AuthRequest } from '../controllers/authController.js';

const router = Router();

// Get all groups (public and user's groups)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const groupsQuery = `
      SELECT 
        g.id,
        g.name,
        g.description,
        g.privacy,
        g.member_count,
        g.post_count,
        g.avatar_url,
        g.cover_url,
        g.created_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        gm.role as user_role
      FROM \`groups\` g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      WHERE g.privacy = 'public' OR gm.user_id = ?
      ORDER BY g.created_at DESC
    `;
    
    const groups = await allQuery(groupsQuery, [userId, userId]);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group (admin only)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, privacy = 'public' } = req.body;
    const userId = req.user!.id;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    if (name.length > 255) {
      return res.status(400).json({ error: 'Group name must be less than 255 characters' });
    }
    
    if (!['public', 'private', 'secret'].includes(privacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting' });
    }
    
    // Create the group
    const createGroupQuery = `
      INSERT INTO \`groups\` (name, description, privacy, created_by)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await runQuery(createGroupQuery, [name.trim(), description || null, privacy, userId]);
    const groupId = result.insertId;
    
    // Add creator as admin member
    const addMemberQuery = `
      INSERT INTO group_members (group_id, user_id, role, invited_by)
      VALUES (?, ?, 'admin', ?)
    `;
    
    await runQuery(addMemberQuery, [groupId, userId, userId]);
    
    // Get the created group with details
    const getGroupQuery = `
      SELECT 
        g.id,
        g.name,
        g.description,
        g.privacy,
        g.member_count,
        g.post_count,
        g.avatar_url,
        g.cover_url,
        g.created_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM \`groups\` g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
    `;
    
    const group = await getQuery(getGroupQuery, [groupId]);
    
    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get group details
router.get('/:groupId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user!.id;
    
    const groupQuery = `
      SELECT 
        g.id,
        g.name,
        g.description,
        g.privacy,
        g.member_count,
        g.post_count,
        g.avatar_url,
        g.cover_url,
        g.created_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        gm.role as user_role
      FROM \`groups\` g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      WHERE g.id = ? AND (g.privacy = 'public' OR gm.user_id = ?)
    `;
    
    const group = await getQuery(groupQuery, [userId, groupId, userId]);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Get group members
router.get('/:groupId/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user!.id;
    
    // Check if user has access to the group
    const accessQuery = `
      SELECT g.privacy, gm.user_id
      FROM \`groups\` g
      LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      WHERE g.id = ?
    `;
    
    const access = await getQuery(accessQuery, [userId, groupId]);
    
    if (!access || (access.privacy !== 'public' && !access.user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const membersQuery = `
      SELECT 
        gm.id,
        gm.role,
        gm.joined_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at ASC
    `;
    
    const members = await allQuery(membersQuery, [groupId]);
    res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// Join a group
router.post('/:groupId/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user!.id;
    
    // Check if group exists and is public
    const groupQuery = 'SELECT privacy FROM `groups` WHERE id = ?';
    const group = await getQuery(groupQuery, [groupId]);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (group.privacy !== 'public') {
      return res.status(403).json({ error: 'Cannot join private or secret groups without invitation' });
    }
    
    // Check if already a member
    const memberQuery = 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?';
    const existingMember = await getQuery(memberQuery, [groupId, userId]);
    
    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }
    
    // Add user to group
    const joinQuery = `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (?, ?, 'member')
    `;
    
    await runQuery(joinQuery, [groupId, userId]);
    
    // Update member count
    const updateCountQuery = 'UPDATE `groups` SET member_count = member_count + 1 WHERE id = ?';
    await runQuery(updateCountQuery, [groupId]);
    
    res.json({ message: 'Successfully joined the group' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave a group
router.post('/:groupId/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user!.id;
    
    // Check if user is a member
    const memberQuery = 'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?';
    const member = await getQuery(memberQuery, [groupId, userId]);
    
    if (!member) {
      return res.status(400).json({ error: 'Not a member of this group' });
    }
    
    // Check if user is the only admin
    if (member.role === 'admin') {
      const adminCountQuery = 'SELECT COUNT(*) as admin_count FROM group_members WHERE group_id = ? AND role = "admin"';
      const adminCount = await getQuery(adminCountQuery, [groupId]);
      
      if (adminCount && adminCount.admin_count === 1) {
        return res.status(400).json({ error: 'Cannot leave group as the only admin. Transfer admin role first.' });
      }
    }
    
    // Remove user from group
    const leaveQuery = 'DELETE FROM group_members WHERE group_id = ? AND user_id = ?';
    await runQuery(leaveQuery, [groupId, userId]);
    
    // Update member count
    const updateCountQuery = 'UPDATE `groups` SET member_count = member_count - 1 WHERE id = ?';
    await runQuery(updateCountQuery, [groupId]);
    
    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

export default router;