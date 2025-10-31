
import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/client';
import buildingsRouter from './routes/buildings';
import roomsRouter from './routes/rooms';
import seatsRouter from './routes/seats';
import studentsRouter from './routes/students';
import planRouter from './routes/plan';


const prisma = new PrismaClient();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'SeatPlanner API is running!' });
});

app.use('/api/buildings', buildingsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/seats', seatsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/plan', planRouter);

app.listen(port, () => {
  console.log(`SeatPlanner backend listening at http://localhost:${port}`);
});
