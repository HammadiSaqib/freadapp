# CreditRepairPro API Documentation

## Base URL

```
http://localhost:5173/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Authentication

#### POST /auth/login

Login with email and password

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company_name": "The Score Machine",
    "role": "admin"
  }
}
```

#### POST /auth/register

Register a new user

```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "The Score Machine",
  "role": "agent"
}
```

#### GET /auth/profile

Get current user profile (Protected)

#### PUT /auth/profile

Update user profile (Protected)

### Client Management

#### GET /clients

Get all clients for the authenticated user (Protected)
Query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `search`: Search term for name/email
- `status`: Filter by status (active, inactive, completed, on_hold)

#### GET /clients/:id

Get single client (Protected)

#### POST /clients

Create new client (Protected)

```json
{
  "first_name": "Sarah",
  "last_name": "Johnson",
  "email": "sarah.johnson@email.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St, City, State 12345",
  "ssn_last_four": "1234",
  "date_of_birth": "1990-01-15",
  "employment_status": "employed",
  "annual_income": 50000,
  "credit_score": 650,
  "previous_credit_score": 580,
  "notes": "Client notes here"
}
```

#### PUT /clients/:id

Update client (Protected)

#### DELETE /clients/:id

Delete client (Protected)

#### GET /clients/stats

Get client statistics (Protected)

### Dispute Management

#### GET /disputes

Get all disputes (Protected)
Query parameters:

- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `bureau`: Filter by bureau
- `client_id`: Filter by client

#### GET /disputes/:id

Get single dispute (Protected)

#### POST /disputes

Create new dispute (Protected)

```json
{
  "client_id": 1,
  "bureau": "experian",
  "account_name": "ABC Medical",
  "dispute_reason": "Not mine - never had services",
  "filed_date": "2024-01-15"
}
```

#### PUT /disputes/:id

Update dispute (Protected)

#### DELETE /disputes/:id

Delete dispute (Protected)

#### GET /disputes/stats

Get dispute statistics (Protected)

#### GET /disputes/:dispute_id/letter

Generate AI dispute letter (Protected)

### Analytics

#### GET /analytics/dashboard

Get dashboard overview analytics (Protected)

#### GET /analytics/revenue

Get revenue analytics (Protected)
Query parameters:

- `period`: daily, weekly, monthly (default: monthly)

#### GET /analytics/performance

Get performance metrics (Protected)

#### GET /analytics/clients

Get client analytics (Protected)

#### GET /analytics/financial

Get financial insights (Protected)

#### GET /analytics/activities

Get recent activities (Protected)
Query parameters:

- `limit`: Number of activities (default: 10)

### AI Features

#### GET /ai/recommendations

Get AI-powered recommendations (Protected)

#### GET /ai/insights

Get AI insights (Protected)

### Compliance

#### GET /compliance/status

Get compliance status (Protected)

### Automation

#### GET /automation/workflows

Get automation workflows (Protected)

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details (for validation errors)"
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (no token or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

## Database Schema

### Users

- id, email, password_hash, first_name, last_name, company_name, role, created_at, updated_at, last_login, is_active

### Clients

- id, user_id, first_name, last_name, email, phone, address, ssn_last_four, date_of_birth, employment_status, annual_income, status, credit_score, previous_credit_score, notes, created_at, updated_at

### Disputes

- id, client_id, bureau, account_name, dispute_reason, status, filed_date, response_date, result, created_at, updated_at

### Activities

- id, user_id, client_id, type, description, metadata, created_at

### Analytics

- id, user_id, metric_type, value, period, date, created_at

## Demo Account

Email: `demo@creditrepairpro.com`
Password: `demo123`
