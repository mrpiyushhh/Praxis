const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Get all tasks for a user
router.get('/:userId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or update a task
router.post('/', auth, async (req, res) => {
  const { projectId, id, title, description, priority, dueDate, completed, archivedAt } = req.body;
  const userId = req.user.id; // Enforce security

  try {
    let task = await Task.findOne({ userId, id });
    if (task) {
      Object.assign(task, { title, description, priority, dueDate, completed, archivedAt });
      await task.save();
    } else {
      task = new Task({ userId, projectId, id, title, description, priority, dueDate, completed, archivedAt });
      await task.save();
    }
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a task
router.delete('/:userId/:id', auth, async (req, res) => {
  try {
    await Task.deleteOne({ userId: req.user.id, id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
