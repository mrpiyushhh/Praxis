const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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
 */
router.get('/config', (req, res) => {
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
 */
router.post('/config', (req, res) => {
  try {
    const { mattermost_ws_url, mmauthtoken } = req.body;
    const data = {
      mattermost_ws_url: mattermost_ws_url || '',
      mmauthtoken: mmauthtoken || ''
    };
    ensureDirExists(CONFIG_PATH);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('[API Integration] Updated Mattermost config details.');
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

    const cleanTitle = task_title.trim();
    if (cleanTitle.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Failed: "task_title" cannot be empty.'
      });
    }

    const taskSource = source || 'External';

    console.log(`[API Integration] Received task from ${taskSource}: "${cleanTitle}"`);

    // 2. PLACEHOLDER SECTION FOR DATABASE SAVE/INSERTION
    // Insert your custom ORM/Database operation here.
    // 
    // Example Mongoose (MongoDB) integration for Praxis:
    // ----------------------------------------------------
    // const Task = require('../models/Task');
    // const Project = require('../models/Project');
    // 
    // // 1. Identify which user owns this integration. 
    // // Since this is a stealth listener running in the background, you can associate it
    // // with a specific user ID (e.g., the user whose browser session token was used).
    // const targetUserId = 'guest'; // Replace with a dynamic user mapping or default user ID
    // 
    // // 2. Locate or create a default Project to log external tasks to (e.g., "Inbox")
    // let project = await Project.findOne({ userId: targetUserId, name: 'Inbox' });
    // if (!project) {
    //   project = new Project({
    //     id: 'proj_inbox_' + Date.now(),
    //     userId: targetUserId,
    //     name: 'Inbox',
    //     color: '#a078ff'
    //   });
    //   await project.save();
    // }
    // 
    // // 3. Create the Task entity matching the mongoose schema
    // const newTask = new Task({
    //   userId: targetUserId,
    //   projectId: project.id,
    //   id: 'task_ext_' + Date.now(),
    //   title: cleanTitle,
    //   priority: 'medium',
    //   completed: false
    // });
    // await newTask.save();
    // ----------------------------------------------------

    const dbPlaceholderResult = {
      id: 't_mock_' + Math.random().toString(36).substring(2, 9),
      title: cleanTitle,
      source: taskSource,
      createdAt: new Date().toISOString()
    };

    console.log(`[API Integration] Saved task mock ID: ${dbPlaceholderResult.id}`);

    // 3. RETURN HTTP 201 CREATED UPON SUCCESS
    return res.status(201).json({
      success: true,
      message: 'Task logged successfully',
      data: dbPlaceholderResult
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
