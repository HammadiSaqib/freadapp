import express, { Response } from 'express';
import { z } from 'zod';
import { getQuery, allQuery, runQuery } from '../database/databaseAdapter.js';
import { AuthRequest, requireRole } from '../middleware/authMiddleware.js';
import PDFDocument from 'pdfkit';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Serve uploaded documents
export async function serveDocument(req: AuthRequest, res: Response) {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/funding-documents', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get the funding request that owns this document
    const documentQuery = `
      SELECT fr.*, u.id as user_id
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.driver_license_file_path LIKE ? 
         OR fr.ein_confirmation_file_path LIKE ?
         OR fr.articles_from_state_file_path LIKE ?
    `;
    
    const searchPattern = `%${filename}`;
    const request = await getQuery(documentQuery, [searchPattern, searchPattern, searchPattern]);
    
    if (!request) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check permissions - users can only access their own documents, funding managers can access all
    if (req.user!.role !== 'funding_manager' && request.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ error: 'Failed to serve document' });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/funding-documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}.pdf`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Validation schemas
const fundingRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  purpose: z.enum(['equipment', 'marketing', 'expansion', 'inventory', 'technology', 'training', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// Done for You form validation schema
const doneForYouSchema = z.object({
  funding_type: z.enum(['done-for-you', 'diy']),
  title_position: z.string().optional(),
  intended_use: z.string().optional(),
  business_name: z.string().optional(),
  business_phone: z.string().optional(),
  business_email: z.string().email().optional(),
  business_address: z.string().optional(),
  business_city: z.string().optional(),
  business_state: z.string().optional(),
  business_zip: z.string().optional(),
  date_commenced: z.string().optional(), // Will be converted to date
  business_website: z.string().optional(),
  business_industry: z.string().optional(),
  entity_type: z.enum(['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship']).optional(),
  incorporation_state: z.string().optional(),
  number_of_employees: z.number().optional(),
  ein: z.string().optional(),
  monthly_gross_sales: z.number().optional(),
  projected_annual_revenue: z.number().optional(),
  
  // Personal Information
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().optional(), // Will be converted to date
  birth_city: z.string().optional(),
  ssn: z.string().optional(),
  mothers_maiden_name: z.string().optional(),
  home_address: z.string().optional(),
  personal_city: z.string().optional(),
  personal_state: z.string().optional(),
  personal_zip: z.string().optional(),
  home_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  housing_status: z.enum(['rent', 'own', 'other']).optional(),
  monthly_housing_payment: z.number().optional(),
  years_at_address: z.number().optional(),
  drivers_license: z.string().optional(),
  issuing_state: z.string().optional(),
  issue_date: z.string().optional(), // Will be converted to date
  expiration_date: z.string().optional(), // Will be converted to date
  
  // Employment Information
  current_employer: z.string().optional(),
  position: z.string().optional(),
  years_at_employer: z.number().optional(),
  employer_phone: z.string().optional(),
  employer_address: z.string().optional(),
  
  // Financial Information
  personal_bank_name: z.string().optional(),
  personal_bank_balance: z.number().optional(),
  business_bank_name: z.string().optional(),
  business_bank_balance: z.number().optional(),
  us_citizen: z.enum(['yes', 'no']).optional(),
  savings_account: z.enum(['yes', 'no']).optional(),
  investment_accounts: z.enum(['yes', 'no']).optional(),
  military_affiliation: z.enum(['yes', 'no']).optional(),
  other_income: z.enum(['yes', 'no']).optional(),
  other_assets: z.enum(['yes', 'no']).optional(),
  banks_to_ignore: z.array(z.string()).optional(),
});

// Combined schema for funding requests
const combinedFundingRequestSchema = fundingRequestSchema.merge(doneForYouSchema.partial());

const updateFundingRequestSchema = fundingRequestSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'rejected', 'under_review']).optional(),
  reviewer_notes: z.string().optional(),
});

// Get all funding requests (funding managers see all, others see only their own)
export async function getFundingRequests(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 50, search, status, priority } = req.query;
    // Sanitize and inline pagination values to avoid ER_WRONG_ARGUMENTS with prepared statements
    const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const offsetNum = Math.max((pageNum - 1) * limitNum, 0);
    
    // Funding managers can see all requests, others see only their own
    let query = `
      SELECT fr.*, u.first_name, u.last_name, u.email as user_email,
             r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      LEFT JOIN users r ON fr.reviewer_id = r.id
    `;
    let params: any[] = [];
    
    if (req.user!.role !== 'funding_manager') {
      query += ' WHERE fr.user_id = ?';
      params.push(req.user!.id);
    }
    
    // Add filters
    if (status) {
      query += req.user!.role === 'funding_manager' ? ' WHERE fr.status = ?' : ' AND fr.status = ?';
      params.push(status as string);
    }
    
    if (priority) {
      const priorityCondition = ' fr.priority = ?';
      if (req.user!.role === 'funding_manager' && !status) {
        query += ' WHERE' + priorityCondition;
      } else {
        query += ' AND' + priorityCondition;
      }
      params.push(priority as string);
    }
    
    if (search) {
      const searchCondition = ' (fr.title LIKE ? OR fr.description LIKE ?)';
      if (req.user!.role === 'funding_manager' && !status && !priority) {
        query += ' WHERE' + searchCondition;
      } else {
        query += ' AND' + searchCondition;
      }
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }
    
    // Add pagination with sanitized, inlined numbers
    query += ` ORDER BY fr.requested_date DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const requests = await allQuery(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM funding_requests fr';
    let countParams: any[] = [];
    
    if (req.user!.role !== 'funding_manager') {
      countQuery += ' WHERE fr.user_id = ?';
      countParams.push(req.user!.id);
    }
    
    if (status) {
      countQuery += req.user!.role === 'funding_manager' ? ' WHERE fr.status = ?' : ' AND fr.status = ?';
      countParams.push(status as string);
    }
    
    if (priority) {
      const priorityCondition = ' fr.priority = ?';
      if (req.user!.role === 'funding_manager' && !status) {
        countQuery += ' WHERE' + priorityCondition;
      } else {
        countQuery += ' AND' + priorityCondition;
      }
      countParams.push(priority as string);
    }
    
    if (search) {
      const searchCondition = ' (fr.title LIKE ? OR fr.description LIKE ?)';
      if (req.user!.role === 'funding_manager' && !status && !priority) {
        countQuery += ' WHERE' + searchCondition;
      } else {
        countQuery += ' AND' + searchCondition;
      }
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam);
    }
    
    const countResult = await getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching funding requests:', error);
    res.status(500).json({ error: 'Failed to fetch funding requests' });
  }
}

// Get a single funding request
export async function getFundingRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT fr.*, u.first_name, u.last_name, u.email as user_email,
             r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      LEFT JOIN users r ON fr.reviewer_id = r.id
      WHERE fr.id = ?
    `;
    let params: any[] = [id];
    
    // Non-funding managers can only see their own requests
    if (req.user!.role !== 'funding_manager') {
      query += ' AND fr.user_id = ?';
      params.push(req.user!.id);
    }
    
    const request = await getQuery(query, params);
    
    if (!request) {
      return res.status(404).json({ error: 'Funding request not found' });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error fetching funding request:', error);
    res.status(500).json({ error: 'Failed to fetch funding request' });
  }
}

// Create a new funding request
export async function createFundingRequest(req: AuthRequest, res: Response) {
  try {
    // Use combined schema for validation
    const validatedData = combinedFundingRequestSchema.parse(req.body);
    
    // Convert date strings to proper format
    const dateFields = ['date_commenced', 'date_of_birth', 'issue_date', 'expiration_date'];
    dateFields.forEach(field => {
      if (validatedData[field as keyof typeof validatedData]) {
        const dateValue = validatedData[field as keyof typeof validatedData] as string;
        if (dateValue && dateValue !== '') {
          // Convert to MySQL date format (YYYY-MM-DD)
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            (validatedData as any)[field] = date.toISOString().split('T')[0];
          }
        }
      }
    });

    // Convert banks_to_ignore array to JSON string
    if (validatedData.banks_to_ignore && Array.isArray(validatedData.banks_to_ignore)) {
      (validatedData as any).banks_to_ignore = JSON.stringify(validatedData.banks_to_ignore);
    }

    // Build dynamic insert query based on provided fields
    const fields = [];
    const placeholders = [];
    const values = [];

    // Always include required fields
    fields.push('user_id');
    placeholders.push('?');
    values.push(req.user!.id);

    // Add all provided fields
    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined && value !== null && value !== '') {
        fields.push(key);
        placeholders.push('?');
        values.push(value);
      }
    }

    const query = `
      INSERT INTO funding_requests (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;
    
    const result = await runQuery(query, values);
    
    // Fetch the created request with user details
    const createdRequest = await getQuery(`
      SELECT fr.*, u.first_name, u.last_name, u.email as user_email
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?
    `, [result.insertId]);
    
    res.status(201).json(createdRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating funding request:', error);
    res.status(500).json({ error: 'Failed to create funding request' });
  }
}

// Update a funding request
export async function updateFundingRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = updateFundingRequestSchema.parse(req.body);
    
    // Check if request exists and user has permission
    let checkQuery = 'SELECT * FROM funding_requests WHERE id = ?';
    let checkParams: any[] = [id];
    
    if (req.user!.role !== 'funding_manager') {
      checkQuery += ' AND user_id = ?';
      checkParams.push(req.user!.id);
    }
    
    const existingRequest = await getQuery(checkQuery, checkParams);
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Funding request not found' });
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];
    
    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(value);
      }
    }
    
    // Add reviewer_id if funding manager is updating
    if (req.user!.role === 'funding_manager' && (validatedData.status || validatedData.reviewer_notes)) {
      updateFields.push('reviewer_id = ?');
      updateParams.push(req.user!.id);
      
      if (validatedData.status) {
        updateFields.push('reviewed_date = CURRENT_TIMESTAMP');
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updateParams.push(id);
    
    const updateQuery = `
      UPDATE funding_requests 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    await runQuery(updateQuery, updateParams);
    
    // Fetch updated request with user details
    const updatedRequest = await getQuery(`
      SELECT fr.*, u.first_name, u.last_name, u.email as user_email,
             r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      LEFT JOIN users r ON fr.reviewer_id = r.id
      WHERE fr.id = ?
    `, [id]);
    
    res.json(updatedRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating funding request:', error);
    res.status(500).json({ error: 'Failed to update funding request' });
  }
}

// Delete a funding request
export async function deleteFundingRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if request exists and user has permission
    let checkQuery = 'SELECT * FROM funding_requests WHERE id = ?';
    let checkParams: any[] = [id];
    
    if (req.user!.role !== 'funding_manager') {
      checkQuery += ' AND user_id = ?';
      checkParams.push(req.user!.id);
    }
    
    const existingRequest = await getQuery(checkQuery, checkParams);
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Funding request not found' });
    }
    
    await runQuery('DELETE FROM funding_requests WHERE id = ?', [id]);
    
    res.json({ message: 'Funding request deleted successfully' });
  } catch (error) {
    console.error('Error deleting funding request:', error);
    res.status(500).json({ error: 'Failed to delete funding request' });
  }
}

// Generate PDF for funding request
export async function generateFundingRequestPDF(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Get funding request details
    const query = `
      SELECT fr.*, u.first_name, u.last_name, u.email as user_email,
             r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      LEFT JOIN users r ON fr.reviewer_id = r.id
      WHERE fr.id = ?
    `;
    
    const request = await getQuery(query, [id]);
    
    if (!request) {
      return res.status(404).json({ error: 'Funding request not found' });
    }
    
    // Check permissions
    if (req.user!.role !== 'funding_manager' && request.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Create PDF document with professional styling
    const doc = new PDFDocument({ 
      margin: 60,
      size: 'A4',
      info: {
        Title: `Funding Request Report - ${id}`,
        Author: 'The Score Machine Solutions',
        Subject: 'Funding Request Analysis Report',
        Keywords: 'funding, credit, business, financial analysis'
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="funding-request-${id}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Define colors
    const primaryColor = '#2563eb'; // Blue
    const secondaryColor = '#64748b'; // Gray
    const accentColor = '#059669'; // Green
    const textColor = '#1f2937'; // Dark gray

    // Add company logo and header
    try {
      const logoPath = path.join(__dirname, '../../public/image.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 60, 60, { width: 80, height: 80 });
      }
    } catch (error) {
      console.log('Logo not found, continuing without logo');
    }

    // Company header
    doc.fillColor(primaryColor)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('CreditRepair', 160, 70);
    
    doc.fillColor(secondaryColor)
       .fontSize(12)
       .font('Helvetica')
       .text('Professional Solutions', 160, 95);

    // Document title
    doc.fillColor(textColor)
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('Funding Request Report', 60, 160, { align: 'center' });

    // Add a decorative line
    doc.strokeColor(primaryColor)
       .lineWidth(3)
       .moveTo(60, 200)
       .lineTo(535, 200)
       .stroke();

    let yPosition = 230;

    // Helper function to add section headers
    const addSectionHeader = (title: string, y: number) => {
      // Check if we need a new page
      if (y > 650) {
        doc.addPage();
        y = 60;
      }
      
      doc.fillColor('#ffffff')
         .rect(60, y, 475, 25)
         .fill(primaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(title, 70, y + 6);
      
      return y + 35;
    };

    // Helper function to add field
    const addField = (label: string, value: string, y: number, isHighlight = false) => {
      // Check if we need a new page
      if (y > 720) {
        doc.addPage();
        y = 60;
      }
      
      const color = isHighlight ? accentColor : textColor;
      const font = isHighlight ? 'Helvetica-Bold' : 'Helvetica';
      
      doc.fillColor(secondaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(label + ':', 70, y);
      
      doc.fillColor(color)
         .fontSize(11)
         .font(font)
         .text(value, 200, y);
      
      return y + 18;
    };

    // Request Information Section
    yPosition = addSectionHeader('Request Information', yPosition);
    yPosition = addField('Request ID', `#${request.id}`, yPosition, true);
    yPosition = addField('Title', request.title, yPosition);
    yPosition = addField('Description', request.description, yPosition);
    yPosition = addField('Amount Requested', `$${request.amount.toLocaleString()}`, yPosition, true);
    yPosition = addField('Purpose', request.purpose.replace('_', ' '), yPosition);
    if (request.funding_type) yPosition = addField('Funding Type', request.funding_type, yPosition);
    if (request.intended_use) yPosition = addField('Intended Use', request.intended_use, yPosition);
    yPosition = addField('Priority', request.priority.toUpperCase(), yPosition);
    yPosition = addField('Status', request.status.replace('_', ' ').toUpperCase(), yPosition);
    yPosition = addField('Requested Date', new Date(request.requested_date).toLocaleDateString(), yPosition);
    
    if (request.reviewed_date) {
      yPosition = addField('Reviewed Date', new Date(request.reviewed_date).toLocaleDateString(), yPosition);
    }
    yPosition += 15;

    // Personal Information Section
    yPosition = addSectionHeader('Personal Information', yPosition);
    if (request.first_name) yPosition = addField('First Name', request.first_name, yPosition);
    if (request.middle_name) yPosition = addField('Middle Name', request.middle_name, yPosition);
    if (request.last_name) yPosition = addField('Last Name', request.last_name, yPosition);
    yPosition = addField('Email Address', request.user_email, yPosition);
    if (request.date_of_birth) yPosition = addField('Date of Birth', new Date(request.date_of_birth).toLocaleDateString(), yPosition);
    if (request.birth_city) yPosition = addField('Birth City', request.birth_city, yPosition);
    if (request.ssn) yPosition = addField('SSN', `***-**-${request.ssn.slice(-4)}`, yPosition);
    if (request.mothers_maiden_name) yPosition = addField('Mother\'s Maiden Name', request.mothers_maiden_name, yPosition);
    if (request.home_address) yPosition = addField('Home Address', request.home_address, yPosition);
    if (request.personal_city) yPosition = addField('Personal City', request.personal_city, yPosition);
    if (request.personal_state) yPosition = addField('Personal State', request.personal_state, yPosition);
    if (request.personal_zip) yPosition = addField('Personal ZIP', request.personal_zip, yPosition);
    if (request.home_phone) yPosition = addField('Home Phone', request.home_phone, yPosition);
    if (request.mobile_phone) yPosition = addField('Mobile Phone', request.mobile_phone, yPosition);
    if (request.housing_status) yPosition = addField('Housing Status', request.housing_status, yPosition);
    if (request.monthly_housing_payment) yPosition = addField('Monthly Housing Payment', `$${request.monthly_housing_payment.toLocaleString()}`, yPosition);
    if (request.years_at_address) yPosition = addField('Years at Address', `${request.years_at_address} years`, yPosition);
    if (request.drivers_license) yPosition = addField('Driver\'s License', request.drivers_license, yPosition);
    if (request.issuing_state) yPosition = addField('Issuing State', request.issuing_state, yPosition);
    if (request.issue_date) yPosition = addField('Issue Date', new Date(request.issue_date).toLocaleDateString(), yPosition);
    if (request.expiration_date) yPosition = addField('Expiration Date', new Date(request.expiration_date).toLocaleDateString(), yPosition);
    if (request.title_position) yPosition = addField('Title/Position', request.title_position, yPosition);
    if (request.us_citizen) yPosition = addField('US Citizen', request.us_citizen.toUpperCase(), yPosition);
    if (request.military_affiliation) yPosition = addField('Military Affiliation', request.military_affiliation.toUpperCase(), yPosition);
    yPosition += 15;

    // Employment Information Section
    if (request.current_employer || request.position || request.years_at_employer || request.employer_phone || request.employer_address) {
      yPosition = addSectionHeader('Employment Information', yPosition);
      if (request.current_employer) yPosition = addField('Current Employer', request.current_employer, yPosition);
      if (request.position) yPosition = addField('Position', request.position, yPosition);
      if (request.years_at_employer) yPosition = addField('Years at Employer', `${request.years_at_employer} years`, yPosition);
      if (request.employer_phone) yPosition = addField('Employer Phone', request.employer_phone, yPosition);
      if (request.employer_address) yPosition = addField('Employer Address', request.employer_address, yPosition);
      yPosition += 15;
    }

    // Business Information Section
    if (request.business_name) {
      yPosition = addSectionHeader('Business Information', yPosition);
      yPosition = addField('Business Name', request.business_name, yPosition);
      if (request.business_phone) yPosition = addField('Business Phone', request.business_phone, yPosition);
      if (request.business_email) yPosition = addField('Business Email', request.business_email, yPosition);
      if (request.business_address) yPosition = addField('Business Address', request.business_address, yPosition);
      if (request.business_city) yPosition = addField('Business City', request.business_city, yPosition);
      if (request.business_state) yPosition = addField('Business State', request.business_state, yPosition);
      if (request.business_zip) yPosition = addField('Business ZIP', request.business_zip, yPosition);
      if (request.date_commenced) yPosition = addField('Date Commenced', new Date(request.date_commenced).toLocaleDateString(), yPosition);
      if (request.business_website) yPosition = addField('Business Website', request.business_website, yPosition);
      if (request.business_industry) yPosition = addField('Industry', request.business_industry, yPosition);
      if (request.entity_type) yPosition = addField('Entity Type', request.entity_type, yPosition);
      if (request.incorporation_state) yPosition = addField('Incorporation State', request.incorporation_state, yPosition);
      if (request.number_of_employees) yPosition = addField('Employees', request.number_of_employees.toString(), yPosition);
      if (request.ein) yPosition = addField('EIN', request.ein, yPosition);
      if (request.monthly_gross_sales) yPosition = addField('Monthly Gross Sales', `$${request.monthly_gross_sales.toLocaleString()}`, yPosition, true);
      if (request.projected_annual_revenue) yPosition = addField('Projected Annual Revenue', `$${request.projected_annual_revenue.toLocaleString()}`, yPosition, true);
      yPosition += 15;
    }

    // Financial Information Section
    yPosition = addSectionHeader('Financial Analysis', yPosition);
    if (request.personal_bank_name) yPosition = addField('Personal Bank Name', request.personal_bank_name, yPosition);
    if (request.personal_bank_balance) yPosition = addField('Personal Bank Balance', `$${request.personal_bank_balance.toLocaleString()}`, yPosition, true);
    if (request.business_bank_name) yPosition = addField('Business Bank Name', request.business_bank_name, yPosition);
    if (request.business_bank_balance) yPosition = addField('Business Bank Balance', `$${request.business_bank_balance.toLocaleString()}`, yPosition, true);
    if (request.savings_account) yPosition = addField('Savings Account', request.savings_account.toUpperCase(), yPosition);
    if (request.investment_accounts) yPosition = addField('Investment Accounts', request.investment_accounts.toUpperCase(), yPosition);
    if (request.other_income) yPosition = addField('Other Income', request.other_income.toUpperCase(), yPosition);
    if (request.other_assets) yPosition = addField('Other Assets', request.other_assets.toUpperCase(), yPosition);
    if (request.banks_to_ignore) {
      try {
        const banksArray = JSON.parse(request.banks_to_ignore);
        if (Array.isArray(banksArray) && banksArray.length > 0) {
          yPosition = addField('Banks to Ignore', banksArray.join(', '), yPosition);
        }
      } catch (e) {
        if (request.banks_to_ignore) {
          yPosition = addField('Banks to Ignore', request.banks_to_ignore, yPosition);
        }
      }
    }
    yPosition += 15;

    // Review Information Section
    if (request.reviewer_notes || request.reviewer_first_name) {
      yPosition = addSectionHeader('Review & Assessment', yPosition);
      if (request.reviewer_first_name) {
        yPosition = addField('Reviewed By', `${request.reviewer_first_name} ${request.reviewer_last_name}`, yPosition);
      }
      if (request.reviewer_notes) {
        yPosition = addField('Reviewer Notes', request.reviewer_notes, yPosition);
      }
      yPosition += 15;
    }

    // Add footer with professional styling
    const footerY = 750;
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(60, footerY)
       .lineTo(535, footerY)
       .stroke();

    doc.fillColor(secondaryColor)
       .fontSize(10)
       .font('Helvetica')
       .text('Generated by The Score Machine', 60, footerY + 10);
    
    doc.text(`Report generated on: ${new Date().toLocaleString()}`, 60, footerY + 25);
    
    doc.text('Confidential Document - For Internal Use Only', 60, footerY + 40);

    // Add page numbers
    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    for (let i = 0; i < pageCount; i++) {
      const pageIndex = range.start + i;
      doc.switchToPage(pageIndex);
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .text(`Page ${i + 1} of ${pageCount}`, 480, footerY + 10);
    }
    
    // Finalize PDF
    doc.end();
    
    // Wait for the PDF to finish writing before sending response
    doc.on('end', () => {
      console.log('PDF generation completed successfully');
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
}

// Send status update email
export async function sendStatusUpdateEmail(req: AuthRequest, res: Response) {
  try {
    const { requestId, status } = req.body;
    
    // Get funding request and client details
    const query = `
      SELECT fr.*, u.first_name, u.last_name, u.email as user_email,
             a.first_name as admin_first_name, a.last_name as admin_last_name, a.email as admin_email
      FROM funding_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      LEFT JOIN users a ON u.admin_id = a.id
      WHERE fr.id = ?
    `;
    
    const request = await getQuery(query, [requestId]);
    
    if (!request) {
      return res.status(404).json({ error: 'Funding request not found' });
    }
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    // Email templates
    const getStatusMessage = (status: string) => {
      switch (status) {
        case 'approved':
          return {
            subject: 'Funding Request Approved',
            message: 'Great news! Your funding request has been approved.',
            color: '#10B981'
          };
        case 'rejected':
          return {
            subject: 'Funding Request Update',
            message: 'We have reviewed your funding request and unfortunately cannot approve it at this time.',
            color: '#EF4444'
          };
        case 'under_review':
          return {
            subject: 'Funding Request Under Review',
            message: 'Your funding request is currently under review by our team.',
            color: '#3B82F6'
          };
        default:
          return {
            subject: 'Funding Request Status Update',
            message: 'Your funding request status has been updated.',
            color: '#6B7280'
          };
      }
    };
    
    const statusInfo = getStatusMessage(status);
    
    // Professional email template
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusInfo.subject}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, ${statusInfo.color}, ${statusInfo.color}dd); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; margin: 10px 0; }
            .approved { background-color: #D1FAE5; color: #065F46; }
            .rejected { background-color: #FEE2E2; color: #991B1B; }
            .under_review { background-color: #DBEAFE; color: #1E40AF; }
            .pending { background-color: #FEF3C7; color: #92400E; }
            .details { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background-color: ${statusInfo.color}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${statusInfo.subject}</h1>
                <p>Request #${request.id}</p>
            </div>
            <div class="content">
                <p>Dear ${request.first_name} ${request.last_name},</p>
                
                <p>${statusInfo.message}</p>
                
                <div class="details">
                    <h3>Request Details:</h3>
                    <p><strong>Title:</strong> ${request.title}</p>
                    <p><strong>Amount:</strong> $${request.amount.toLocaleString()}</p>
                    <p><strong>Purpose:</strong> ${request.purpose.replace('_', ' ')}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${status}">${status.replace('_', ' ')}</span></p>
                    <p><strong>Submitted:</strong> ${new Date(request.requested_date).toLocaleDateString()}</p>
                </div>
                
                ${request.reviewer_notes ? `
                <div class="details">
                    <h3>Additional Notes:</h3>
                    <p>${request.reviewer_notes}</p>
                </div>
                ` : ''}
                
                <p>If you have any questions about your funding request, please don't hesitate to contact our support team.</p>
                
                <p>Best regards,<br>
                Credit Repair Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} Credit Repair System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Send email to client
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@creditrepair.com',
      to: request.user_email,
      subject: statusInfo.subject,
      html: emailTemplate,
    });
    
    // Send email to admin if exists
    if (request.admin_email) {
      const adminEmailTemplate = emailTemplate.replace(
        `Dear ${request.first_name} ${request.last_name},`,
        `Dear ${request.admin_first_name} ${request.admin_last_name},`
      ).replace(
        statusInfo.message,
        `A funding request from your client ${request.first_name} ${request.last_name} has been ${status.replace('_', ' ')}.`
      );
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@creditrepair.com',
        to: request.admin_email,
        subject: `Client ${statusInfo.subject}`,
        html: adminEmailTemplate,
      });
    }
    
    res.json({ message: 'Email notifications sent successfully' });
    
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email notifications' });
  }
}

// Get funding request statistics
export async function getFundingRequestStats(req: AuthRequest, res: Response) {
  try {
    let whereClause = '';
    let params: any[] = [];
    
    if (req.user!.role !== 'funding_manager') {
      whereClause = 'WHERE user_id = ?';
      params.push(req.user!.id);
    }
    
    // Get basic stats
    const basicStats = await getQuery(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_requests,
        SUM(amount) as total_amount_requested,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_amount_approved,
        AVG(amount) as avg_request_amount
      FROM funding_requests 
      ${whereClause}
    `, params);
    
    // Get recent requests (last 30 days)
    const recentStats = await getQuery(`
      SELECT 
        COUNT(*) as recent_requests
      FROM funding_requests 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} requested_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, params);
    
    // Get priority distribution
    const priorityStats = await allQuery(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM funding_requests 
      ${whereClause}
      GROUP BY priority
    `, params);
    
    // Get purpose distribution
    const purposeStats = await allQuery(`
      SELECT 
        purpose,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM funding_requests 
      ${whereClause}
      GROUP BY purpose
    `, params);
    
    res.json({
      ...basicStats,
      recent_requests: recentStats?.recent_requests || 0,
      priority_distribution: priorityStats,
      purpose_distribution: purposeStats
    });
  } catch (error) {
    console.error('Error fetching funding request stats:', error);
    res.status(500).json({ error: 'Failed to fetch funding request statistics' });
  }
}

// Upload documents for funding request
export async function uploadFundingDocuments(req: AuthRequest, res: Response) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Check if the funding request exists and belongs to the user
    const request = await getQuery(`
      SELECT id, user_id FROM funding_requests WHERE id = ?
    `, [requestId]);

    if (!request) {
      return res.status(404).json({ error: 'Funding request not found' });
    }

    if (req.user!.role !== 'funding_manager' && request.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query for file paths
    const updateFields = [];
    const updateValues = [];

    if (files.driverLicenseFile && files.driverLicenseFile[0]) {
      updateFields.push('driver_license_file_path = ?');
      updateValues.push(`/uploads/funding-documents/${files.driverLicenseFile[0].filename}`);
    }

    if (files.einConfirmationFile && files.einConfirmationFile[0]) {
      updateFields.push('ein_confirmation_file_path = ?');
      updateValues.push(`/uploads/funding-documents/${files.einConfirmationFile[0].filename}`);
    }

    if (files.articlesFromStateFile && files.articlesFromStateFile[0]) {
      updateFields.push('articles_from_state_file_path = ?');
      updateValues.push(`/uploads/funding-documents/${files.articlesFromStateFile[0].filename}`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid files uploaded' });
    }

    // Update the funding request with file paths
    updateValues.push(requestId);
    const updateQuery = `
      UPDATE funding_requests 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateQuery, updateValues);

    // Return the uploaded file paths
    const uploadedFiles = {
      driverLicenseFile: files.driverLicenseFile ? `/uploads/funding-documents/${files.driverLicenseFile[0].filename}` : null,
      einConfirmationFile: files.einConfirmationFile ? `/uploads/funding-documents/${files.einConfirmationFile[0].filename}` : null,
      articlesFromStateFile: files.articlesFromStateFile ? `/uploads/funding-documents/${files.articlesFromStateFile[0].filename}` : null
    };

    res.json({
      message: 'Documents uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading funding documents:', error);
    
    // Clean up uploaded files if there was an error
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (unlinkError) => {
            if (unlinkError) {
              console.error('Error cleaning up uploaded file:', unlinkError);
            }
          });
        });
      });
    }

    res.status(500).json({ error: 'Failed to upload documents' });
  }
}

// Router configuration
const router = express.Router();

// Existing routes
router.get('/', getFundingRequests);
router.get('/stats', getFundingRequestStats);
router.get('/:id', getFundingRequest);
router.post('/', createFundingRequest);
router.put('/:id', updateFundingRequest);
router.delete('/:id', deleteFundingRequest);

// Document upload route
router.post('/upload-documents', upload.fields([
  { name: 'driverLicenseFile', maxCount: 1 },
  { name: 'einConfirmationFile', maxCount: 1 },
  { name: 'articlesFromStateFile', maxCount: 1 }
]), uploadFundingDocuments);

// Document serving route
router.get('/documents/:filename', serveDocument);

// New routes for funding manager
router.get('/:id/pdf', generateFundingRequestPDF);
router.post('/send-status-email', sendStatusUpdateEmail);

// Export the upload middleware for use in server index
export { upload as fundingDocumentsUpload };

export default router;
