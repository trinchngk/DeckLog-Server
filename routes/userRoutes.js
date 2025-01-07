import express from 'express';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

function auth(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};


router.put('/:id', auth, async (req, res) => {
  if (req.params.id == req.user.id) {

    const { id }  = req.params;
    const result = await User.findByIdAndUpdate(id, req.body);

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).send({ message: 'User updated successfully' });

  } else {
    return res.status(403).json({ error: 'You can only update your account' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (req.params.id == req.user.id) {

    const { id }  = req.params;
    const result = await User.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).send({ message: 'User deleted successfully' });

  } else {
    return res.status(403).json({ error: 'You can only delete your account' });
  }
})
// router.get('/find/:id', auth)

export default router;