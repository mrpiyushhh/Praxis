const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const missing = ['name', 'email', 'password'].filter((field) => !req.body?.[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing fields: ${missing.join(', ')}. In Postman use Body → raw → JSON (not Text or form-data).`
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: passwordHash
    });

    const savedUser = await newUser.save();

    const token = jwt.sign(
      { id: savedUser._id }, 
      process.env.JWT_SECRET || 'fallback_secret_for_development',
      { expiresIn: '7d' } // token expires in 7 days
    );

    res.json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const missing = ['email', 'password'].filter((field) => !req.body?.[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing fields: ${missing.join(', ')}. In Postman use Body → raw → JSON (not Text or form-data).`
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback_secret_for_development',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
