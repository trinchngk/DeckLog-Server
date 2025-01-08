import express from 'express';
import { Move } from '../models/Move.js';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg'
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

router.get('/cloudinary-signature', auth, (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    timestamp: timestamp,
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
  };

  const signature = cloudinary.v2.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({ signature, timestamp });
});

function auth(req, res, next) {
  const token = req.cookies.access_token;
  console.log(req.cookies)
  console.log("this is your token: ", token);
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const compressVideo = (inputPath, outputPath, res) => {
  ffmpeg(inputPath)
    .output(path.join(__dirname, 'uploads', outputPath))
    .videoCodec('libx264')
    .size('50%')
    .on('end', () => {
      console.log('Compression completed!');
      res.send('Video uploaded and compressed successfully!');
    })
    .on('error', (err) => {
      console.error('Compression failed:', err);
      res.status(500).send('Compression failed.');
    })
    .run();
};

const storage = multer.memoryStorage();
const upload = multer({ storage });

  // Wrap upload_stream in a Promise
const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: 'moves/videos',
        resource_type: 'video',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

  // Pipe the file buffer to the upload stream
  uploadStream.end(fileBuffer);
});

router.post('/', auth, upload.single('clip'), async (req, res) => {
  try {
    // Validate required fields
    const { name, desc, tags, finished } = req.body;
    if (!name || !desc || !tags || !finished) {
      return res.status(400).send('Request body is missing required fields');
    }

    if (!req.file) {
      console.log("here");
      return res.status(400).send('No file uploaded');
    }

    // Upload the file
    const cloudRes = await uploadToCloudinary(req.file.buffer);

    // Create a new move with the uploaded video details
    const newMove = {
      userId: req.user.id,
      name,
      desc,
      clips: [
        {
          clipUrl: cloudRes.secure_url, // Secure URL of the uploaded video
          clipId: cloudRes.public_id,   // Public ID of the uploaded video
          desc: '',                     // Optional description field
        },
      ],
      tags: tags.split(','), // Convert comma-separated tags to an array
      finished: finished === 'true', // Convert string to boolean
    };

    const move = await Move.create(newMove);

    return res.status(201).send(move);
  } catch (error) {
    console.error('Error creating move:', error.message);
    return res.status(500).send({ message: error.message });
  }
});


//route for getting all moves from the database
router.get('/', auth, async (req, res) => {
  try {
    const moves = await Move.find({ userId: req.user.id });

    return res.status(200).json( {
      count: moves.length,
      data: moves
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send( { message: error.mesaage });
  }
});

//search by tags
router.get('/tags', auth, async (req, res) => {
  try {
    const tags = req.query.tags.split(",")
    
    const moves = await Move.find({ userId: req.user.id, tags: { $in: tags } }).limit(20);

    return res.status(200).json(moves);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send( { message: error.mesaage });
  }
});

//search by name
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.q
    const moves = await Move.find({ userId: req.user.id, name: { $regex: query, $options: "i" } }).limit(40);

    return res.status(200).json( {
      count: moves.length,
      data: moves
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send( { message: error.mesaage });
  }
});

//route for getting a move by ID 
//attach parameter in route using ":"
router.get('/:id', auth, async (req, res) => {
  try {
    const move = await Move.findById(req.params.id)
    if (move.userId == req.user.id) {
      return res.status(200).json(move);      
    }

    return res.status(403).json({ error: 'You can only access your own moves' });
    
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

//route for updating a move
//app.put() is used to update a resource
router.put('/:id', auth, upload.single('clip'), async (req, res) => {
  try {
    const { name, desc, tags, finished } = req.body;
    if (!name || !desc || !tags || !finished) {
      return res.status(400).send('Request body is missing required fields');
    }

    const move = await Move.findById(req.params.id)
    const cloudRes = await uploadToCloudinary(req.file.buffer);

    let clips = []

    if (req.file) {
      clips = 
        [...move.clips,
          {
            clipUrl: cloudRes.secure_url, // Secure URL of the uploaded video
            clipId: cloudRes.public_id,   // Public ID of the uploaded video
            desc: '',                     // Optional description field
          },         
        ]
    } else {
      clips = move.clips;
    }

    
    const updatedMove = {
      userId: req.user.id,
      name: name,
      desc: desc,
      clips: clips,
      tags: tags.split(','), // Convert comma-separated tags to an array
      finished: finished === 'true', // Convert string to boolean
    };

    if (!move) {
      return res.status(404).json({ message: 'Move not found' });
    } 

    if (req.user.id === move.userId) {
      const result = await Move.findByIdAndUpdate(req.params.id, updatedMove);
      return res.status(200).send({ message: 'Move updated successfully' });      
    }

  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

//route for deleting a move
router.delete('/:id', auth, async (req, res) => {
  try {
    const move = await Move.findById(req.params.id)

    if (move.clips[0]) {

      const clipIds = move.clips.map((clip) => clip.clipId);
      console.log(clipIds);
      await cloudinary.v2.api
      .delete_resources(clipIds, 
        { type: 'upload', resource_type: 'video' })
      .then(console.log);
    }

    if (!move) {
      return res.status(404).json({ message: 'Move not found' });
    } 

    if (req.user.id === move.userId) {
      const result = await Move.findByIdAndDelete(req.params.id, req.body);
      return res.status(200).send({ message: 'Move deleted successfully' });      
    }
    
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});


//add clip to move
router.post('/:id/clips', auth, async (req, res) => {
  try {
    const move = await Move.findById(req.params.id)

    if (!move) {
      return res.status(404).json({ message: 'Move not found' });
    } 

    if (req.user.id === move.userId) {

      const newClip = {
        clipUrl: req.body.clipUrl,
        desc: req.body.desc,
      };
  
      move.clips.push(newClip);
      await move.save();
      return res.status(200).send({ message: 'Clip added successfully' });      
    }

  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

router.put('/:id/clips/:clipId', auth, async (req, res) => {
  try {
    const move = await Move.findById(req.params.id);
    const { clipUrl, desc } = req.body;

    if (!move) {
      return res.status(404).json({ message: 'Move not found' });
    } 

    if (req.user.id === move.userId) {
      const clip = move.clips.id(req.params.clipId);

      if (!clip) {
        return res.status(404).json({ message: 'Clip not found' });
      } 

      if (clipUrl) clip.clipUrl = clipUrl;
      if (desc) clip.desc = desc;

      await move.save();

      return res.status(200).send({ message: 'Clip updated successfully' });      
    }

  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

router.delete('/:id/clips/:clipId', auth, async (req, res) => {
  try {
    const move = await Move.findById(req.params.id);

    if (!move) {
      return res.status(404).json({ message: 'Move not found' });
    } 

    if (req.user.id === move.userId) {
      const clip = move.clips.id(req.params.clipId);

      if (!clip) {
        return res.status(404).json({ message: 'Clip not found' });
      } 

      move.clips.remove(clip);


      await move.save();

      return res.status(200).send({ message: 'Clip removed successfully' });      
    }
    
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  }
});

export default router;