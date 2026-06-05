import { Request } from 'express';

export interface LoginInfo {
  ipAddress: string;
  location: string;
  userAgent: string;
  deviceInfo: string;
  loginTime: string;
}

/**
 * Extract login information from request
 */
export function extractLoginInfo(req: Request): LoginInfo {
  // Get IP address (handle proxy headers)
  const ipAddress = (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'Unknown'
  ).toString().split(',')[0].trim();

  // Get user agent
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Parse device info from user agent
  const deviceInfo = parseDeviceInfo(userAgent);

  // Get location (simplified - in production you'd use a geolocation service)
  const location = getLocationFromIP(ipAddress);

  // Get current time
  const loginTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  return {
    ipAddress,
    location,
    userAgent,
    deviceInfo,
    loginTime
  };
}

/**
 * Parse device information from user agent string
 */
function parseDeviceInfo(userAgent: string): string {
  if (!userAgent || userAgent === 'Unknown') {
    return 'Unknown Device';
  }

  // Detect operating system
  let os = 'Unknown OS';
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS X')) {
    const macMatch = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    os = macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
  }
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) {
    const androidMatch = userAgent.match(/Android (\d+\.?\d*)/);
    os = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
  }
  else if (userAgent.includes('iPhone OS')) {
    const iosMatch = userAgent.match(/iPhone OS (\d+[._]\d+[._]?\d*)/);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  }

  // Detect browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Edg/')) {
    const edgeMatch = userAgent.match(/Edg\/(\d+\.?\d*)/);
    browser = edgeMatch ? `Microsoft Edge ${edgeMatch[1]}` : 'Microsoft Edge';
  }
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    const chromeMatch = userAgent.match(/Chrome\/(\d+\.?\d*)/);
    browser = chromeMatch ? `Google Chrome ${chromeMatch[1]}` : 'Google Chrome';
  }
  else if (userAgent.includes('Firefox/')) {
    const firefoxMatch = userAgent.match(/Firefox\/(\d+\.?\d*)/);
    browser = firefoxMatch ? `Mozilla Firefox ${firefoxMatch[1]}` : 'Mozilla Firefox';
  }
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    const safariMatch = userAgent.match(/Version\/(\d+\.?\d*)/);
    browser = safariMatch ? `Safari ${safariMatch[1]}` : 'Safari';
  }

  // Detect device type
  let deviceType = 'Desktop';
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceType = 'Mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceType = 'Tablet';
  }

  return `${deviceType} - ${os} - ${browser}`;
}

/**
 * Get location from IP address (simplified version)
 * In production, you would use a service like MaxMind GeoIP2, ipapi.co, or similar
 */
function getLocationFromIP(ipAddress: string): string {
  // For localhost/development
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress === 'Unknown') {
    return 'Local Development Environment';
  }

  // For production, you would implement actual geolocation
  // Example with a free service (you'd need to make an HTTP request):
  // const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
  // const data = await response.json();
  // return `${data.city}, ${data.regionName}, ${data.country}`;

  // Placeholder for now
  return 'Location lookup not configured';
}

/**
 * Async version that could use external geolocation services
 */
export async function getLocationFromIPAsync(ipAddress: string): Promise<string> {
  try {
    // For localhost/development
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress === 'Unknown') {
      return 'Local Development Environment';
    }

    // In production, you could use a service like this:
    // const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,timezone`);
    // const data = await response.json();
    // 
    // if (data.status === 'success') {
    //   return `${data.city}, ${data.regionName}, ${data.country}`;
    // }

    return 'Location lookup not configured';
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return 'Location unavailable';
  }
}