"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("./generated/prisma/client");
const buildings_1 = __importDefault(require("./routes/buildings"));
const rooms_1 = __importDefault(require("./routes/rooms"));
const seats_1 = __importDefault(require("./routes/seats"));
const students_1 = __importDefault(require("./routes/students"));
const plan_1 = __importDefault(require("./routes/plan"));
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const port = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/api', (req, res) => {
    res.json({ message: 'SeatPlanner API is running!' });
});
app.use('/api/buildings', buildings_1.default);
app.use('/api/rooms', rooms_1.default);
app.use('/api/seats', seats_1.default);
app.use('/api/students', students_1.default);
app.use('/api/plan', plan_1.default);
app.listen(port, () => {
    console.log(`SeatPlanner backend listening at http://localhost:${port}`);
});
