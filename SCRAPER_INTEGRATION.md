# Credit Report Scraper Integration Guide

## Overview

This guide explains how to use the `test-scraper.cjs` script with the web interface at `http://localhost:3001/credit-reports/scraper`.

## Setup

### Prerequisites

- Node.js installed
- Project dependencies installed (`npm install`)
- Main application server running (`npm run dev`)

### Running the Scraper

There are two ways to use the credit report scraper:

#### 1. Command Line Usage

Run the scraper directly from the command line:

```bash
node test-scraper.cjs <username> <password> [clientId]
```

Example:
```bash
node test-scraper.cjs Kristabadi2021@gmail.com Badi2021!! 1
```

#### 2. With Local Test Server

Start the scraper with a local test server that can be used by the web interface:

```bash
node test-scraper.cjs <username> <password> [clientId] --server
```

This will start a local server at `http://localhost:3002` with an API endpoint at `/api/test-scraper` that can be used by the web interface.

## Web Interface Integration

The web interface at `http://localhost:3001/credit-reports/scraper` can be used to interact with the scraper. When the local test server is running, the web interface can send requests to it.

### How It Works

1. The main application server runs on port 3001
2. The test scraper server runs on port 3002
3. The web interface sends requests to the main server, which can forward them to the test scraper server

## API Endpoints

### Test Scraper Server (Port 3002)

- **POST /api/test-scraper**
  - Request body: `{ "username": "...", "password": "...", "clientId": "..." }`
  - Response: `{ "success": true, "data": { ... } }` or `{ "success": false, "error": "..." }`

## Troubleshooting

- If you encounter CORS issues, make sure the main server is configured to allow requests from the test server
- If the scraper fails, check the console output for error messages
- Make sure you have the required dependencies installed (`express` and `cors`)

## Notes

- The scraper outputs results to the `./scraper-output` directory
- Screenshots and HTML files are saved if the options are enabled
- Client ID is optional but recommended for tracking purposes