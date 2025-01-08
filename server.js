import express from 'express';
import mongoose from 'mongoose';
import moveRoutes from './routes/moveRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'

import cors from 'cors';

dotenv.config()
const app = express();

const PORT = process.env.PORT;
const uri = process.env.MONGO_URI;

//Middleware for parsing request body
app.use(express.json());

//middleware for handling CORS policy (Cross-Origin Resource Sharing)
//CORS policy is a security feature implemented in browsers to prevent malicious websites from making requests to your server

//Allow all origins
// app.use(cors());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN, // Frontend origin
    credentials: true,               // Allow credentials (cookies, HTTP authentication)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  })
);

app.get('/', (req, res) => {
  console.log(req);
  return res.status(200).send('Hello World');
});

app.use(cookieParser())
app.use('/api/auth', authRoutes);
app.use('/api/moves', moveRoutes);
app.use('/api/users', userRoutes);

mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`App is listening to port: ${PORT}`);
    });
  })
  .catch((error) => {
    console.log('Error connecting to MongoDB', error);
  });