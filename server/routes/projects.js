const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// Get all projects for a user
router.get('/:userId', auth, async (req, res) => {
  // Ignore req.params.userId and enforce security using req.user.id from the token
  try {
    const projects = await Project.find({ userId: req.user.id });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or update a project
router.post('/', auth, async (req, res) => {
  const { id, name } = req.body;
  const userId = req.user.id; // Enforce security using token

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
router.delete('/:userId/:id', auth, async (req, res) => {
  try {
    await Project.deleteOne({ userId: req.user.id, id: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
