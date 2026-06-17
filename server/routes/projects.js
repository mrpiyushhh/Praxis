const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Get all projects for a user
router.get('/:userId', async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.params.userId });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or update a project
router.post('/', async (req, res) => {
  const { userId, id, name } = req.body;
  try {
    let project = await Project.findOne({ userId, id });
    if (project) {
      project.name = name;
      await project.save();
    } else {
      project = new Project({ userId, id, name });
      await project.save();
    }
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a project
router.delete('/:userId/:id', async (req, res) => {
  try {
    await Project.deleteOne({ userId: req.params.userId, id: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
