import express from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Define COOKIE_OPTIONS at the top level of your file
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

router.post('/signup', async (req, res) => {
  try {
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    const newUser = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hash,
    });

    const { password, ...userWithoutPassword } = newUser._doc;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  console.log('Login request received:', {
    body: req.body,
    headers: req.headers
  });

  try {
    if (!req.body.email || !req.body.password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const user = await User.findOne({ email: req.body.email });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const correctPassword = await bcrypt.compare(req.body.password, user.password);
    console.log('Password correct:', correctPassword);

    if (!correctPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT,
      { expiresIn: '24h' }
    );

    console.log('Setting cookie with options:', COOKIE_OPTIONS);

    res.cookie('access_token', token, COOKIE_OPTIONS);
    
    console.log('Cookie set, sending response');
    
    const { password, ...userWithoutPassword } = user._doc;
    return res.status(200).json(userWithoutPassword);

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/logout', (req, res) => {
  try {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    let savedUser;
    if (user) {
      savedUser = user;
    } else {
      const newUser = new User({
        ...req.body,
        fromGoogle: true
      });
      savedUser = await newUser.save();
    }

    const token = jwt.sign(
      { id: savedUser._id },
      process.env.JWT,
      { expiresIn: '24h' }
    );

    res.cookie('access_token', token, COOKIE_OPTIONS);
    
    return res.status(200).json(savedUser._doc);
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ message: error.message });
  }
});

export default router;