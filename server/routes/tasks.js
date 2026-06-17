const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Get all tasks for a user
router.get('/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or update a task
router.post('/', async (req, res) => {
  const { userId, projectId, id, title, description, priority, dueDate, completed, archivedAt } = req.body;
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
router.delete('/:userId/:id', async (req, res) => {
  try {
    await Task.deleteOne({ userId: req.params.userId, id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
