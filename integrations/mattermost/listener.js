/**
 * Mattermost Stealth WebSocket Listener (User-Bot)
 * Intercepts user chats and logs '#task' messages to the Web App.
 * Run this locally as a background daemon (e.g. using pm2).
 */

import WebSocket from 'ws';

// CONFIGURATION
const API_BASE = process.env.PRAXIS_API_URL || 'http://localhost:5001';
const CONFIG = {
  // Fallbacks (if config endpoint is empty)
  MATTERMOST_WS_URL: '',
  MMAUTHTOKEN: '',
  
  // API endpoints
  CONFIG_API_URL: `${API_BASE}/api/tasks/external/config`,
  WEB_APP_API_URL: `${API_BASE}/api/tasks/external`,
  
  // Reconnection Rules
  RECONNECT_INITIAL_DELAY: 1000, // 1 second
  RECONNECT_MAX_DELAY: 30000,    // 30 seconds
  RECONNECT_BACKOFF_FACTOR: 2    // Exponential backoff multiplier
};

let ws = null;
let reconnectDelay = CONFIG.RECONNECT_INITIAL_DELAY;
let wsUrl = '';
let token = '';

/**
 * Fetch config details from the Web App API on boot
 */
async function initializeAndConnect() {
  console.log(`[Listener] Fetching configuration from web app API at ${CONFIG.CONFIG_API_URL}...`);
  try {
    const res = await fetch(CONFIG.CONFIG_API_URL);
    const config = await res.json();
    
    wsUrl = config.mattermost_ws_url || CONFIG.MATTERMOST_WS_URL;
    token = config.mmauthtoken || CONFIG.MMAUTHTOKEN;

    if (!wsUrl || !token) {
      console.error('\n[Listener] Error: Mattermost WS URL and Session Token must be configured in the web app UI first!');
      console.error(`Please open http://localhost:5173 (or your dev web server) -> Profile Modal -> Integrations, paste details, save, and restart this listener.\n`);
      process.exit(1);
    }
    
    console.log('[Listener] Configuration loaded successfully.');
    connect();
  } catch (err) {
    console.warn(`[Listener] Warning: Failed to connect to configuration API (${err.message}). Using hardcoded fallback values if present.`);
    wsUrl = CONFIG.MATTERMOST_WS_URL;
    token = CONFIG.MMAUTHTOKEN;
    
    if (!wsUrl || !token) {
      console.error('[Listener] Error: Fallback configuration is empty. Exiting.');
      process.exit(1);
    }
    connect();
  }
}

/**
 * Initializes the WebSocket connection to Mattermost
 */
function connect() {
  console.log(`[Listener] Connecting to Mattermost WebSocket at ${wsUrl}...`);
  
  ws = new WebSocket(wsUrl);

  // Connection opened
  ws.on('open', () => {
    console.log('[Listener] WebSocket connection opened. Authenticating...');
    reconnectDelay = CONFIG.RECONNECT_INITIAL_DELAY; // Reset backoff delay on success
    
    // Authenticate using the browser session token
    const authPayload = {
      seq: 1,
      action: 'authentication_challenge',
      data: {
        token: token
      }
    };
    ws.send(JSON.stringify(authPayload));
  });

  // Handle incoming messages
  ws.on('message', (rawData) => {
    try {
      const event = JSON.parse(rawData);
      handleMattermostEvent(event);
    } catch (err) {
      console.error('[Listener] Error parsing incoming WebSocket event:', err);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('[Listener] WebSocket error encountered:', error.message);
  });

  // Handle socket closure (disconnect/network drops)
  ws.on('close', (code, reason) => {
    console.warn(`[Listener] Connection closed (Code: ${code}, Reason: ${reason || 'None'}). Attempting reconnect...`);
    scheduleReconnect();
  });
}

/**
 * Schedule reconnect using exponential backoff
 */
function scheduleReconnect() {
  console.log(`[Listener] Reconnecting in ${reconnectDelay / 1000}s...`);
  setTimeout(() => {
    // Increase delay exponentially for the next attempt
    reconnectDelay = Math.min(reconnectDelay * CONFIG.RECONNECT_BACKOFF_FACTOR, CONFIG.RECONNECT_MAX_DELAY);
    connect();
  }, reconnectDelay);
}

/**
 * Parse and process raw Mattermost gateway events
 */
function handleMattermostEvent(event) {
  // We are only interested in 'posted' events (new chat messages)
  if (event.event !== 'posted') return;

  try {
    // Mattermost serializes post metadata as a JSON string inside the data object
    const postData = JSON.parse(event.data.post);
    const rawMessage = postData.message || '';
    const senderId = postData.user_id;

    // Filter for the trigger keyword
    const triggerKeyword = '#task';
    if (!rawMessage.toLowerCase().includes(triggerKeyword)) return;

    console.log(`[Listener] Trigger keyword detected in post ID ${postData.id} from user ${senderId}.`);

    // Clean the string: Remove '#task' tag (case-insensitive) and fix formatting/whitespace
    const regex = new RegExp(triggerKeyword, 'gi');
    const cleanedMessage = rawMessage.replace(regex, '').replace(/\s+/g, ' ').trim();

    if (!cleanedMessage) {
      console.warn('[Listener] Extracted task is empty. Skipping.');
      return;
    }

    forwardTaskToWebApp(cleanedMessage);
  } catch (err) {
    console.error('[Listener] Error parsing post object from event data:', err);
  }
}

/**
 * Forwards the cleaned task to the web application API endpoint
 */
async function forwardTaskToWebApp(taskTitle) {
  const payload = {
    task_title: taskTitle,
    source: 'Mattermost'
  };

  try {
    console.log(`[Listener] Forwarding task to API: "${taskTitle}"`);
    const response = await fetch(CONFIG.WEB_APP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201) {
      const result = await response.json();
      console.log(`[Listener] Task logged successfully:`, result);
    } else {
      console.error(`[Listener] API returned error status ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[Listener] Failed to connect to Web App API at ${CONFIG.WEB_APP_API_URL}:`, err.message);
  }
}

// Start listener config fetch
initializeAndConnect();
