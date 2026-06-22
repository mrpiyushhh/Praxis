const express = require('express');
const router = express.Router();

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
