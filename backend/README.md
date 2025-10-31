# SeatPlanner Backend

A Node.js backend API for the SeatPlanner application, built with Express.js, Prisma ORM, and PostgreSQL.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin/Student)
- **Building & Room Management**: CRUD operations for buildings and rooms
- **Seat Management**: Seat allocation, status updates, and real-time synchronization
- **Student Management**: Student CRUD operations with accessibility needs support
- **Automatic Allocation**: Intelligent seat allocation algorithm
- **Caching**: Redis-based caching for improved performance
- **Real-time Updates**: Socket.io integration for live seat map updates
- **Security**: Helmet middleware, rate limiting, input validation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Upstash Redis (REST API)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: express-validator
- **Real-time**: Socket.io
- **Security**: Helmet, CORS, rate limiting

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Upstash Redis account (or local Redis)

### Installation

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.local` and update the values:
   ```bash
   cp .env.local .env
   ```

   Required environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token
   - `JWT_SECRET`: Secret key for JWT signing

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`.

## Docker Setup

### Using Docker Compose

1. Ensure Docker and Docker Compose are installed
2. Update the environment variables in `docker-compose.yml`
3. Run the application:
   ```bash
   docker-compose up --build
   ```

This will start the API, PostgreSQL, and Redis services.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Buildings
- `GET /api/buildings` - List all buildings
- `POST /api/buildings` - Create a new building (Admin only)
- `GET /api/buildings/:id/rooms` - Get rooms in a building

### Rooms
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create a new room (Admin only)
- `GET /api/rooms/:id/seats` - Get seats in a room

### Seats
- `PATCH /api/seats/:id/status` - Update seat status

### Students
- `GET /api/students` - List all students
- `POST /api/students` - Create a new student
- `PATCH /api/students/:id` - Update a student
- `DELETE /api/students/:id` - Delete a student

### Planning
- `POST /api/plan/allocate` - Run automatic seat allocation
- `POST /api/plan/rebalance` - Rebalance allocations after seat changes

## Database Schema

The application uses the following main entities:
- **User**: Authentication and authorization
- **Building**: Physical buildings containing rooms
- **Room**: Rooms within buildings containing seats
- **Seat**: Individual seats with status and features
- **Student**: Students with accessibility needs and tags

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Testing
```bash
npm test
```

### Code Quality
```bash
npm run lint
```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm start
   ```

## Security Considerations

- All sensitive endpoints require authentication
- Admin-only operations are protected with role-based middleware
- Passwords are hashed with bcrypt
- Rate limiting is implemented on sensitive endpoints
- Input validation prevents malicious data
- CORS is configured for frontend origin
- Security headers are set with Helmet

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting PRs

## License

This project is part of the SeatPlanner application.
