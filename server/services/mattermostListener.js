const WebSocket = require('ws');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Integration = require('../models/Integration');

let ws = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const BACKOFF_FACTOR = 2;

let wsUrl = '';
let token = '';
let targetUserId = '';
let isExplicitlyStopped = false;

/**
 * Start the Mattermost WebSocket listener
 */
async function start(userId) {
  // If there's an active connection, close it first
  stop();
  
  isExplicitlyStopped = false;

  try {
    const integration = await Integration.findOne({ userId });
    if (!integration || !integration.mattermost_ws_url || !integration.mmauthtoken) {
      console.warn(`[Mattermost Service] No valid integration config found for user ${userId}. Cannot start listener.`);
      return false;
    }

    wsUrl = integration.mattermost_ws_url;
    token = integration.mmauthtoken;
    targetUserId = userId;
    reconnectDelay = INITIAL_RECONNECT_DELAY;

    console.log(`[Mattermost Service] Starting listener for user ${userId} targeting ${wsUrl}`);
    connect();
    return true;
  } catch (err) {
    console.error('[Mattermost Service] Error starting listener:', err);
    return false;
  }
}

/**
 * Stop the Mattermost WebSocket listener
 */
function stop() {
  isExplicitlyStopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    console.log('[Mattermost Service] Stopping listener and closing WebSocket connection...');
    ws.terminate(); // Force close
    ws = null;
  }
}

/**
 * Connect to the Mattermost WebSocket
 */
function connect() {
  if (isExplicitlyStopped) return;

  console.log(`[Mattermost Service] Connecting to WebSocket at ${wsUrl}...`);
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('[Mattermost Service] Connection opened. Authenticating...');
    reconnectDelay = INITIAL_RECONNECT_DELAY; // Reset backoff delay on success
    
    // Authenticate using the session token
    const authPayload = {
      seq: 1,
      action: 'authentication_challenge',
      data: {
        token: token
      }
    };
    ws.send(JSON.stringify(authPayload));
  });

  ws.on('message', (rawData) => {
    try {
      const event = JSON.parse(rawData);
      handleMattermostEvent(event);
    } catch (err) {
      console.error('[Mattermost Service] Error parsing incoming event:', err);
    }
  });

  ws.on('error', (err) => {
    console.error('[Mattermost Service] WebSocket error:', err.message);
  });

  ws.on('close', (code, reason) => {
    ws = null;
    if (!isExplicitlyStopped) {
      console.warn(`[Mattermost Service] Connection closed (Code: ${code}, Reason: ${reason || 'None'}). Reconnecting in ${reconnectDelay / 1000}s...`);
      scheduleReconnect();
    } else {
      console.log('[Mattermost Service] Connection closed cleanly.');
    }
  });
}

/**
 * Schedule reconnect with exponential backoff
 */
function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * BACKOFF_FACTOR, MAX_RECONNECT_DELAY);
    connect();
  }, reconnectDelay);
}

/**
 * Parse and process raw Mattermost gateway events
 */
async function handleMattermostEvent(event) {
  if (event.event !== 'posted') return;

  try {
    const postData = JSON.parse(event.data.post);
    const rawMessage = postData.message || '';
    const senderId = postData.user_id;

    // Filter for the trigger keyword
    const triggerKeyword = '#task';
    if (!rawMessage.toLowerCase().includes(triggerKeyword)) return;

    console.log(`[Mattermost Service] Trigger keyword detected in post ID ${postData.id} from user ${senderId}.`);

    // Clean the string: Remove '#task' tag and extra spaces
    const regex = new RegExp(triggerKeyword, 'gi');
    const cleanedMessage = rawMessage.replace(regex, '').replace(/\s+/g, ' ').trim();

    if (!cleanedMessage) {
      console.warn('[Mattermost Service] Extracted task content is empty. Skipping.');
      return;
    }

    await saveTaskToDatabase(cleanedMessage);
  } catch (err) {
    console.error('[Mattermost Service] Error parsing post object from event data:', err);
  }
}

/**
 * Parse the message and save it to MongoDB directly
 */
async function saveTaskToDatabase(rawMessage) {
  try {
    // Matches text between single quotes
    const matches = [...rawMessage.matchAll(/'([^']+)'/g)].map(m => m[1]);

    let projectName = 'Inbox';
    let parsedTitle = '';

    if (matches.length >= 2) {
      projectName = matches[0].trim();
      parsedTitle = matches[1].trim();
    } else if (matches.length === 1) {
      parsedTitle = matches[0].trim();
    } else {
      parsedTitle = rawMessage.replace(/deadline:\s*'([^']+)'/i, '').replace(/deadline:\s*(\w+)/i, '').trim();
    }

    if (!parsedTitle) {
      console.warn('[Mattermost Service] Failed to parse title from message.');
      return;
    }

    // Parse deadline
    const deadlineMatch = rawMessage.match(/deadline:\s*'([^']+)'/i) || rawMessage.match(/deadline:\s*(\w+)/i);
    let dueDate = null;
    if (deadlineMatch) {
      const val = deadlineMatch[1].toLowerCase().trim();
      const today = new Date();
      if (val === 'today') {
        dueDate = today.toISOString().split('T')[0];
      } else if (val === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        dueDate = tomorrow.toISOString().split('T')[0];
      } else {
        dueDate = val; 
      }
    }

    // Locate or create Project
    let project = await Project.findOne({ 
      userId: targetUserId, 
      name: { $regex: new RegExp(`^${projectName}$`, 'i') } 
    });

    if (!project) {
      const PROJECT_COLORS = ['#6366f1', '#a078ff', '#00d2ff', '#fbbf24', '#ff6b81', '#34d399'];
      const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

      project = new Project({
        id: 'proj_' + Date.now() + Math.random().toString(36).substring(2, 6),
        userId: targetUserId,
        name: projectName,
        color: randomColor
      });
      await project.save();
      console.log(`[Mattermost Service] Created new project "${projectName}" for user ${targetUserId}`);
    }

    // Create and save Task
    const taskId = 'task_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const task = new Task({
      userId: targetUserId,
      projectId: project.id,
      id: taskId,
      title: parsedTitle,
      priority: 'medium',
      completed: false,
      dueDate: dueDate || undefined
    });
    await task.save();

    console.log(`[Mattermost Service] Successfully logged task "${parsedTitle}" to project "${projectName}" directly in MongoDB.`);
  } catch (err) {
    console.error('[Mattermost Service] Error saving task to database:', err);
  }
}

/**
 * Automatically boot active integrations on server start
 */
async function init() {
  if (process.env.VERCEL) {
    console.log('[Mattermost Service] Running in Vercel serverless environment. Skipping persistent live sync daemon.');
    return;
  }
  
  try {
    const integrations = await Integration.find({ enabled: true });
    console.log(`[Mattermost Service] Found ${integrations.length} active integrations to start on boot.`);
    for (const integration of integrations) {
      start(integration.userId);
    }
  } catch (err) {
    console.error('[Mattermost Service] Error initializing integrations on boot:', err);
  }
}

module.exports = {
  start,
  stop,
  init
};
