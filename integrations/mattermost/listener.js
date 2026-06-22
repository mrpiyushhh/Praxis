/**
 * Mattermost Stealth WebSocket Listener (User-Bot)
 * Intercepts user chats and logs '#task' messages to the Web App.
 * Run this locally as a background daemon (e.g. using pm2).
 */

const WebSocket = require('ws');

// Use global native fetch (Node 18+) or fallback to node-fetch if available
const customFetch = typeof globalThis.fetch === 'function' 
  ? globalThis.fetch 
  : (() => {
      try {
        return require('node-fetch');
      } catch (err) {
        console.error('[Listener] Error: node-fetch is required on Node versions < 18. Run "npm install node-fetch".');
        process.exit(1);
      }
    })();

// CONFIGURATION
const CONFIG = {
  // Mattermost Settings
  MATTERMOST_WS_URL: 'wss://your-mattermost-instance.com/api/v4/websocket',
  MMAUTHTOKEN: 'your_mmauthtoken_here', // Extract from browser cookies
  
  // Custom Web App Settings (matching our Praxis endpoint)
  WEB_APP_API_URL: 'http://localhost:3000/api/tasks/external',
  
  // Reconnection Rules
  RECONNECT_INITIAL_DELAY: 1000, // 1 second
  RECONNECT_MAX_DELAY: 30000,    // 30 seconds
  RECONNECT_BACKOFF_FACTOR: 2    // Exponential backoff multiplier
};

let ws = null;
let reconnectDelay = CONFIG.RECONNECT_INITIAL_DELAY;

/**
 * Initializes the WebSocket connection to Mattermost
 */
function connect() {
  console.log(`[Listener] Connecting to Mattermost WebSocket at ${CONFIG.MATTERMOST_WS_URL}...`);
  
  ws = new WebSocket(CONFIG.MATTERMOST_WS_URL);

  // Connection opened
  ws.on('open', () => {
    console.log('[Listener] WebSocket connection opened. Authenticating...');
    reconnectDelay = CONFIG.RECONNECT_INITIAL_DELAY; // Reset backoff delay on success
    
    // Authenticate using the browser session token
    const authPayload = {
      seq: 1,
      action: 'authentication_challenge',
      data: {
        token: CONFIG.MMAUTHTOKEN
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
    const response = await customFetch(CONFIG.WEB_APP_API_URL, {
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

// Start listener
connect();
