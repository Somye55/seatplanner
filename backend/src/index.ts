import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from './generated/prisma/client';
import authRouter from './routes/auth';
import buildingsRouter from './routes/buildings';
import roomsRouter from './routes/rooms';
import seatsRouter from './routes/seats';
import studentsRouter from './routes/students';
import planRouter from './routes/plan';


const prisma = new PrismaClient();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Corrected frontend port
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
// });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Sensitive endpoints rate limiting
// const sensitiveLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
// });
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/plan/allocate', sensitiveLimiter);
app.use('/api/auth/login', sensitiveLimiter); // if exists

app.get('/api', (req, res) => {
  res.json({ message: 'SeatPlanner API is running!' });
});

app.use('/api/auth', authRouter);
app.use('/api/buildings', buildingsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/seats', seatsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/plan', planRouter);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available in routes
app.set('io', io);

server.listen(port, () => {
  console.log(`SeatPlanner backend listening at http://localhost:${port}`);
});

// Graceful shutdown for nodemon restarts
process.on('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
