import express from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const salt = bcrypt.genSaltSync(10);


    if (!req.body.username || !req.body.email || !req.body.password ) {
      return res.status(400).send('req body is missing fields');
    }
    const hash = bcrypt.hashSync(req.body.password, salt);

    const newUser = {
      username: req.body.username,
      email: req.body.email,
      password: hash,
    };

    const user = await User.create(newUser);

    return res.status(201).send(user);

  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const salt = bcrypt.genSaltSync(10);


    if (!req.body.email || !req.body.password ) {
      return res.status(400).send('req body is missing fields');
    } else {
      const user = await User.findOne({ email: req.body.email });
  
      // check for existing user
      if (!user) {
          return res.status(400).send('User could not be found');
      } else {

        const correctPassword = await bcrypt.compare(req.body.password, user.password);
        if (correctPassword) {
            const token = jwt.sign({
                id: user._id,
                email: user.email
            },
                process.env.JWT,
                // { expiresIn: '2h' }
            );

            // const userResponse = {
            //     _id: user._id,
            //     email: user.email,
            // };
            const { password, ...others } = user._doc;

            res.cookie("access_token", token, {
              httpOnly: true
            }).status(200).json(others);

        
            // return response.status(200).json({
            //     token,
            //     userResponse
            // });                       
        } else {
            return res.status(400).send('Incorrect password');
        }
  
      }            
    }

  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

router.post('/logout', async (req, res) => {
  res.clearCookie('access_token');
  return res.status(200).json({ message: 'Logged out successfully' });
});

// router.post('/signin', )

router.post('/google', async (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://accounts.google.com; " +
    "frame-src 'self' https://accounts.google.com;"
  );
  
  try {
    const user = await User.findOne( { email: req.body.email } )
    if (user) {
      const token = jwt.sign( { id: user._id }, process.env.JWT );
      res.cookie("access_token", token, {
        httpOnly: true,
      })
      .status(200)
      .json(user._doc);
    } else {
      const newUser = new User ({
        ...req.body,
        fromGoogle: true
      })
      const savedUser = await newUser.save();    
      const token = jwt.sign( { id: savedUser._id }, process.env.JWT );
      res.cookie("access_token", token, {
        httpOnly: true,
      })
      .status(200)
      .json(savedUser._doc);
    }
  } 
  catch (error) {
    next(error);
  }
});

export default router;