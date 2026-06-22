const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Integration = require('../models/Integration');
const jwt = require('jsonwebtoken');

/**
 * GET /api/tasks/external/config
 * Retrieves the saved configuration for Mattermost integration.
 * Supports token auth or returns the first config for local daemon listener.
 */
router.get('/config', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development');
        userId = verified.id;
      } catch (err) {
        // Ignore token verification errors and proceed as unauthenticated
      }
    }

    let integration;
    if (userId) {
      integration = await Integration.findOne({ userId });
    } else {
      integration = await Integration.findOne({});
    }

    if (!integration) {
      return res.json({ mattermost_ws_url: '', mmauthtoken: '', enabled: false });
    }

    return res.json({
      userId: integration.userId,
      mattermost_ws_url: integration.mattermost_ws_url,
      mmauthtoken: integration.mmauthtoken,
      enabled: integration.enabled || false
    });
  } catch (err) {
    console.error('[API Integration] Error reading config:', err);
    return res.status(500).json({ error: 'Failed to read integration config' });
  }
});

/**
 * POST /api/tasks/external/config
 * Saves/Updates the Mattermost integration configuration.
 * Requires user authentication and stores the user's ID in MongoDB.
 */
router.post('/config', auth, async (req, res) => {
  try {
    const { mattermost_ws_url, mmauthtoken, enabled } = req.body;
    const userId = req.user.id;

    let integration = await Integration.findOne({ userId });
    if (integration) {
      integration.mattermost_ws_url = mattermost_ws_url || '';
      integration.mmauthtoken = mmauthtoken || '';
      if (enabled !== undefined) {
        integration.enabled = enabled;
      }
      await integration.save();
    } else {
      integration = new Integration({
        userId,
        mattermost_ws_url: mattermost_ws_url || '',
        mmauthtoken: mmauthtoken || '',
        enabled: enabled || false
      });
      await integration.save();
    }

    // Start/Stop the backend service dynamically based on toggle state
    const mattermostListener = require('../services/mattermostListener');
    if (integration.enabled) {
      await mattermostListener.start(userId);
    } else {
      mattermostListener.stop();
    }

    console.log(`[API Integration] Saved configuration for user ${userId} to MongoDB (Enabled: ${integration.enabled})`);
    return res.json({ success: true, message: 'Configuration saved successfully', enabled: integration.enabled });
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

    // Load integration config from DB to resolve the userId
    const integration = await Integration.findOne({});
    if (!integration) {
      return res.status(400).json({
        success: false,
        error: 'Integration is not configured. Please configure via the web UI.'
      });
    }
    const targetUserId = integration.userId;

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
