/**
 * Keep-alive ping to prevent Render free-tier cold starts.
 * 
 * Render free instances spin down after 15 minutes of inactivity.
 * This sends a self-ping every 14 minutes to keep the instance warm.
 * 
 * Usage: Import and call startKeepAlive() after server starts.
 */

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

export function startKeepAlive(serverUrl) {
  if (!serverUrl) {
    console.log('ℹ️ No SERVER_URL set — keep-alive disabled (local dev)');
    return;
  }

  console.log(`🏓 Keep-alive enabled: pinging ${serverUrl} every 14 minutes`);

  const ping = async () => {
    try {
      const response = await fetch(serverUrl);
      if (response.ok) {
        console.log(`🏓 Keep-alive ping OK (${new Date().toISOString()})`);
      }
    } catch (error) {
      console.warn('🏓 Keep-alive ping failed:', error.message);
    }
  };

  // Initial ping after 1 minute (let server fully start)
  setTimeout(ping, 60_000);

  // Then every 14 minutes
  const interval = setInterval(ping, PING_INTERVAL);
  interval.unref?.(); // Don't prevent Node.js from exiting
}
