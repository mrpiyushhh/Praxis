const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

const CONFIG_PATH = path.join(__dirname, '../config/integration.json');

// Helper to ensure config dir exists
function ensureDirExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * GET /api/tasks/external/config
 * Retrieves the saved configuration for Mattermost integration.
 * Requires user authentication.
 */
router.get('/config', auth, (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return res.json({ mattermost_ws_url: '', mmauthtoken: '' });
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const data = JSON.parse(raw);
    return res.json(data);
  } catch (err) {
    console.error('[API Integration] Error reading config:', err);
    return res.status(500).json({ error: 'Failed to read integration config' });
  }
});

/**
 * POST /api/tasks/external/config
 * Saves/Updates the Mattermost integration configuration.
 * Requires user authentication and stores the user's ID.
 */
router.post('/config', auth, (req, res) => {
  try {
    const { mattermost_ws_url, mmauthtoken } = req.body;
    const data = {
      userId: req.user.id, // Store who configured this integration
      mattermost_ws_url: mattermost_ws_url || '',
      mmauthtoken: mmauthtoken || ''
    };
    ensureDirExists(CONFIG_PATH);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[API Integration] Saved configuration for user ${req.user.id}`);
    return res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (err) {
    console.error('[API Integration] Error saving config:', err);
    return res.status(500).json({ error: 'Failed to save integration config' });
  }
});

/**
 * POST /api/tasks/external
 * Endpoint to receive tasks from external integrations (like Mattermost)
 */
router.post('/', async (req, res, next) => {
  try {
    const { task_title, source } = req.body;

    // 1. INPUT VALIDATION LOGIC
    if (!task_title || typeof task_title !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Failed: "task_title" is required and must be a string.'
      });
    }

    const rawMessage = task_title.trim();
    if (rawMessage.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Failed: "task_title" cannot be empty.'
      });
    }

    // Load integration config to resolve the userId
    if (!fs.existsSync(CONFIG_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Integration is not configured. Please configure via the web UI.'
      });
    }
    const configRaw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configRaw);
    const targetUserId = config.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'No userId found in integration configuration. Please re-configure via UI.'
      });
    }

    // --- PARSING LOGIC ---
    // Format: #task 'project name' 'task title' deadline: 'today/tomorrow'
    // Extract everything between single quotes:
    const matches = [...rawMessage.matchAll(/'([^']+)'/g)].map(m => m[1]);

    let projectName = 'Inbox';
    let parsedTitle = '';

    if (matches.length >= 2) {
      projectName = matches[0].trim();
      parsedTitle = matches[1].trim();
    } else if (matches.length === 1) {
      parsedTitle = matches[0].trim();
    } else {
      // Fallback: If no single quotes are used, treat the whole message (excluding deadline) as the title
      parsedTitle = rawMessage.replace(/deadline:\s*'([^']+)'/i, '').replace(/deadline:\s*(\w+)/i, '').trim();
    }

    if (!parsedTitle) {
      return res.status(400).json({
        success: false,
        error: 'Validation Failed: Could not parse task title from message.'
      });
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
        // Try parsing custom date values or validate them
        dueDate = val; 
      }
    }

    // --- MONGO DB INSERTION ---
    // 1. Locate or create Project
    let project = await Project.findOne({ 
      userId: targetUserId, 
      name: { $regex: new RegExp(`^${projectName}$`, 'i') } 
    });

    if (!project) {
      // Create random color for new projects
      const PROJECT_COLORS = ['#6366f1', '#a078ff', '#00d2ff', '#fbbf24', '#ff6b81', '#34d399'];
      const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

      project = new Project({
        id: 'proj_' + Date.now() + Math.random().toString(36).substring(2, 6),
        userId: targetUserId,
        name: projectName,
        color: randomColor
      });
      await project.save();
      console.log(`[API Integration] Created new project "${projectName}" for user ${targetUserId}`);
    }

    // 2. Create and save the Task
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

    console.log(`[API Integration] Saved task "${parsedTitle}" to project "${projectName}" (ID: ${project.id}) for user ${targetUserId}`);

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        id: taskId,
        title: parsedTitle,
        projectName,
        dueDate,
        source: source || 'Mattermost'
      }
    });

  } catch (error) {
    console.error('[API Integration] Error processing task:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
});

module.exports = router;
