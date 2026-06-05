import express from 'express';
import { Request, Response } from 'express';
import { runQuery } from '../database/databaseAdapter.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

function getServerBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3001';
  return `${proto}://${host}`;
}

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const intakeLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/intake-logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'intake-logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const intakeLogoUpload = multer({
  storage: intakeLogoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, and WEBP files are allowed.'));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile images
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and GIF files are allowed.'));
    }
  }
});

// Configure multer for gateway logo uploads
const gatewayStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/gateways');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gateway-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const gatewayUpload = multer({
  storage: gatewayStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for gateway logos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and GIF files are allowed.'));
    }
  }
});

const affiliateLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/affiliate-logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'affiliate-logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const affiliateLogoUpload = multer({
  storage: affiliateLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and GIF files are allowed.'));
    }
  }
});

// Upload avatar endpoint
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  console.log('🔄 Avatar upload endpoint called');
  console.log('📁 File info:', req.file);
  console.log('👤 User ID:', req.user?.id);
  
  try {
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Create the avatar URL with full server URL for proper display
    const baseUrl = getServerBaseUrl(req);
    const avatarUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;
    console.log('🔗 Avatar URL created:', avatarUrl);

    // Update avatar in database based on user role
    console.log('💾 Updating database with avatar URL...');
    console.log('👤 User role:', req.user?.role);
    
    let result;
    if (req.user?.role === 'affiliate') {
      // For affiliate users, update the affiliates table
      console.log('🔄 Updating affiliates table...');
      result = await runQuery(
        'UPDATE affiliates SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [avatarUrl, userId]
      );
    } else {
      // For regular users (admin, super_admin, etc.), update the users table
      console.log('🔄 Updating users table...');
      result = await runQuery(
        'UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [avatarUrl, userId]
      );
    }
    
    console.log('✅ Database update result:', result);

    res.json({ 
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarUrl
    });
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ Error uploading avatar:', error);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

// Upload gateway logo endpoint
router.post('/upload-gateway-logo', authenticateToken, gatewayUpload.single('gateway_logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Only allow admin, super_admin, or funding_manager to set gateway logo
    if (!userRole || !['admin', 'super_admin', 'funding_manager'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions to upload gateway logo' });
    }

    const baseUrl = getServerBaseUrl(req);
    const logoUrl = `${baseUrl}/uploads/gateways/${req.file.filename}`;

    await runQuery(
      'UPDATE users SET nmi_gateway_logo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [logoUrl, userId]
    );

    res.json({ 
      message: 'Gateway logo uploaded successfully',
      logoUrl
    });
  } catch (error) {
    console.error('Error uploading gateway logo:', error);
    res.status(500).json({ message: 'Error uploading gateway logo' });
  }
});

router.post('/upload-intake-logo', authenticateToken, intakeLogoUpload.single('intake_logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions to upload intake logo' });
    }

    const baseUrl = getServerBaseUrl(req);
    const logoUrl = `${baseUrl}/uploads/intake-logos/${req.file.filename}`;

    await runQuery(
      'UPDATE users SET intake_logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [logoUrl, userId]
    );

    res.json({
      message: 'Intake logo uploaded successfully',
      logoUrl,
    });
  } catch (error) {
    console.error('Error uploading intake logo:', error);
    res.status(500).json({ message: 'Error uploading intake logo' });
  }
});

router.post('/upload-affiliate-logo', authenticateToken, affiliateLogoUpload.single('affiliate_logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (userRole !== 'affiliate') {
      return res.status(403).json({ message: 'Only affiliates can upload a logo' });
    }

    const baseUrl = getServerBaseUrl(req);
    const logoUrl = `${baseUrl}/uploads/affiliate-logos/${req.file.filename}`;

    await runQuery(
      'UPDATE affiliates SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [logoUrl, userId]
    );

    res.json({
      message: 'Affiliate logo uploaded successfully',
      logoUrl
    });
  } catch (error) {
    console.error('Error uploading affiliate logo:', error);
    res.status(500).json({ message: 'Error uploading affiliate logo' });
  }
});

// Delete avatar endpoint
router.delete('/delete-avatar', authenticateToken, async (req: AuthRequest, res: Response) => {
  console.log('🗑️ Avatar delete endpoint called');
  console.log('👤 User ID:', req.user?.id);
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get current avatar path based on user role
    console.log('🔍 Fetching current avatar from database...');
    console.log('👤 User role:', req.user?.role);
    
    let user;
    if (req.user?.role === 'affiliate') {
      // For affiliate users, get avatar from affiliates table
      console.log('🔍 Querying affiliates table...');
      user = await runQuery('SELECT avatar FROM affiliates WHERE id = ?', [userId]);
    } else {
      // For regular users, get avatar from users table
      console.log('🔍 Querying users table...');
      user = await runQuery('SELECT avatar FROM users WHERE id = ?', [userId]);
    }

    if (user.length > 0 && user[0].avatar) {
      let avatarPath = '';
      try {
        const parsed = new URL(user[0].avatar);
        const rel = parsed.pathname.replace(/^\/+/, '');
        avatarPath = path.join(process.cwd(), rel);
      } catch {
        const rel = String(user[0].avatar).replace(/^\/+/, '');
        avatarPath = path.join(process.cwd(), rel.startsWith('uploads/') ? rel : `uploads/${rel}`);
      }
      console.log('📁 Avatar file path:', avatarPath);

      // Delete file if it exists
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
        console.log('✅ Avatar file deleted from filesystem');
      } else {
        console.log('⚠️ Avatar file not found on filesystem');
      }
    }

    // Update database to remove avatar based on user role
    console.log('💾 Removing avatar from database...');
    let result;
    if (req.user?.role === 'affiliate') {
      // For affiliate users, update the affiliates table
      console.log('🔄 Updating affiliates table...');
      result = await runQuery(
        'UPDATE affiliates SET avatar = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
    } else {
      // For regular users, update the users table
      console.log('🔄 Updating users table...');
      result = await runQuery(
        'UPDATE users SET avatar = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
    }
    
    console.log('✅ Database update result:', result);

    res.json({ message: 'Avatar deleted successfully' });
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ Error deleting avatar:', error);
    res.status(500).json({ message: 'Error deleting avatar' });
  }
});

export default router;
