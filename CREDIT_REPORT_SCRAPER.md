# Credit Report Scraper with Client Selection

This document explains how to use the credit report scraper with client selection functionality.

## Overview

The credit report scraper has been enhanced to associate scraped reports with specific clients in the system. This allows for better organization and tracking of credit reports for different clients.

## Using the Scraper

### Web Interface

1. Navigate to the Credit Report Scraper page
2. Select a client from the dropdown menu (optional)
3. Enter the platform credentials (username and password)
4. Click "Scrape Credit Report" or "Fetch Report"
5. The report will be associated with the selected client if one was chosen

### API Endpoints

#### Scrape Report

```
POST /api/credit-reports/scrape?clientId={clientId}
```

Request body:
```json
{
  "platform": "myfreescorenow",
  "credentials": {
    "username": "example@email.com",
    "password": "password123"
  },
  "options": {
    "saveHtml": false,
    "takeScreenshots": false
  }
}
```

#### Fetch Report

```
GET /api/credit-reports/fetch?platform=myfreescorenow&username=example@email.com&password=password123&clientId={clientId}
```

### Command Line Testing

Two test scripts are provided for testing the scraper functionality:

#### 1. Basic Scraper Test

```bash
node test-scraper.cjs [username] [password] [clientId]
```

All parameters are optional. If not provided, default test credentials will be used.

#### 2. Client-Specific Scraper Test

```bash
node test-client-scraper.cjs <clientId>
```

The client ID is required for this test script.

## Database Storage

When a client ID is provided, the scraped report data is stored in the database:

1. Credit report data is saved in the `credit_reports` table
2. Each bureau's score is saved as a separate record
3. The client's `credit_score` field is updated with the highest score
4. The client's previous score is preserved in `previous_credit_score`

## Viewing Reports

Client-specific reports can be viewed in the following ways:

1. Through the Credit Report Scraper UI (shows the most recent report)
2. Via the Credit Report History page (shows all reports for a client)
3. By accessing individual report details through the API