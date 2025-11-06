Of course, here is a comprehensive high-level implementation plan for both the frontend and backend of the "SeatPlanner" application.

### **Frontend Implementation Plan (React)**

This plan breaks down the frontend development into logical, independent tasks that can be developed in parallel where appropriate.

#### **Phase 1: Foundation and Core UI**

*   **Task 1: Project Initialization & Setup (Independent)**
    *   **Subtask 1.1:** Initialize a new React project using Vite for a fast development experience.
    *   **Subtask 1.2:** Install and configure core dependencies: `react-router-dom` for navigation, `axios` for API requests, and a state management library like `Zustand` for its simplicity and minimal boilerplate.
    *   **Subtask 1.3:** Establish a clear folder structure: `/pages`, `/components`, `/services`, `/hooks`, `/store`, and `/utils`.
    *   **Subtask 1.4:** Set up a UI component library such as Material-UI or Ant Design to ensure a consistent and clean look.

*   **Task 2: User Authentication & Routing (Independent)**
    *   **Subtask 2.1:** Develop the UI for Login and Signup pages with forms and client-side validation using a library like `Formik` or `React Hook Form`.
    *   **Subtask 2.2:** Create an authentication service (`/services/authService.js`) to handle API calls for login/signup and to manage JWTs securely in `localStorage` or `sessionStorage`.
    *   **Subtask 2.3:** Implement a `PrivateRoute` component that checks for a valid JWT and user role before rendering a protected page, otherwise redirecting to the login page.
    *   **Subtask 2.4:** Configure all application routes in `App.js` using `react-router-dom`, including public routes, private routes, and a 404-Not-Found page.

#### **Phase 2: Feature Development**

*   **Task 3: Buildings & Rooms Management (Independent)**
    *   **Subtask 3.1:** Create the `/buildings` page to fetch and display a list of all buildings and their respective room counts. Implement loading, empty, and error states using a custom `useApi` hook.
    *   **Subtask 3.2:** Develop the `/buildings/:id/rooms` page to display the rooms for a selected building, showing their capacity and the number of available seats.
    *   **Subtask 3.3:** Build reusable modal components for creating new buildings and rooms, with appropriate form validation.

*   **Task 4: Student Management (CRUD) (Independent)**
    *   **Subtask 4.1:** Develop the `/students` page to display a table of all students.
    *   **Subtask 4.2:** Implement full CRUD functionality (Create, Read, Update, Delete) for students using modals for creating and editing, with confirmation dialogues for deletion.
    *   **Subtask 4.3:** Ensure the student form includes fields for `name`, `email`, `tags`, and `accessibility_needs` with appropriate validation.

*   **Task 5: Interactive Seat Map (Independent)**
    *   **Subtask 5.1:** Design and build the `/rooms/:id` page to render a dynamic seat map as a grid or table.
    *   **Subtask 5.2:** Fetch seat data for the room and visually represent the status of each seat (e.g., color-coded for `available`, `allocated`, `broken`).
    *   **Subtask 5.3:** For admin users, enable clicking on a seat to open a modal or context menu with actions to change its status (`available`, `broken`, `blocked`).
    *   **Subtask 5.4:** On hovering over an allocated seat, display a tooltip with the assigned student's name and details.

*   **Task 6: Allocation Planning & Visualization (Independent)**
    *   **Subtask 6.1:** Create the `/planning` page with a clear user interface for initiating the automatic allocation process.
    *   **Subtask 6.2:** After running an allocation, display a summary of the results: total students placed, a list of unplaced students with reasons, and room utilization percentages.
    *   **Subtask 6.3:** Add a button to trigger the `rebalance` API, with a modal to show the outcome of the rebalancing.

#### **Phase 3: Real-time Features and Refinements**

*   **Task 7: Live Seat Updates (Optional - Independent)**
    *   **Subtask 7.1:** Integrate `socket.io-client` or use the browser's native `EventSource` API to establish a connection with the backend.
    *   **Subtask 7.2:** On the `/rooms/:id` page, listen for events related to seat status changes and update the seat map in real-time without requiring a page refresh.

### **Backend Implementation Plan (Node.js)**

This plan outlines the backend development, with a focus on creating a robust, secure, and scalable API.

#### **Phase 1: Setup and Core API**

*   **Task 1: Project & Database Setup (Independent)**
    *   **Subtask 1.1:** Initialize a Node.js project using Express.js.
    *   **Subtask 1.2:** Set up Prisma as the ORM to interact with the PostgreSQL database. Define the complete database schema in `schema.prisma`.
    *   **Subtask 1.3:** Create initial database migrations using `prisma migrate dev`.
    *   **Subtask 1.4:** Establish a modular structure for routes, controllers, services, and middleware.

*   **Task 2: Authentication & Authorization (Independent)**
    *   **Subtask 2.1:** Implement `POST /api/auth/signup` and `POST /api/auth/login` endpoints. Use `bcrypt` for password hashing and `jsonwebtoken` to generate JWTs.
    *   **Subtask 2.2:** Create an authentication middleware to verify the JWT on protected routes.
    *   **Subtask 2.3:** Implement a role-based authorization middleware (e.g., `isAdmin`) to restrict access to administrative endpoints.

*   **Task 3: Core CRUD APIs (Can be developed in parallel)**
    *   **Subtask 3.1:** Implement the `buildings` API endpoints: `GET` and `POST /api/buildings`.
    *   **Subtask 3.2:** Implement the `rooms` API endpoints: `GET /api/buildings/:id/rooms` and `POST /api/rooms`.
    *   **Subtask 3.3:** Implement the `seats` API endpoints: `GET /api/rooms/:id/seats`, `POST /api/seats` (with bulk creation support), and `PATCH /api/seats/:id/status`.
    *   **Subtask 3.4:** Implement the `students` API endpoints: `GET`, `POST`, `PATCH /:id`, and `DELETE /:id` at `/api/students`.
    *   **Subtask 3.5:** Implement the `allocations` API endpoints: `GET /api/allocations` (with filtering by `studentId` or `roomId`) and `DELETE /api/allocations/:id`.

#### **Phase 2: Business Logic and Advanced Features**

*   **Task 4: Automatic Allocation Logic (Independent)**
    *   **Subtask 4.1:** Develop a `GreedyAllocationService` that implements the primary deterministic allocation algorithm. This service will fetch all students and available seats, and iterate through them to create assignments while respecting constraints.
    *   **Subtask 4.2:** Incorporate logic to handle student constraints, such as matching `accessibility_needs` with seat `features`.
    *   **Subtask 4.3:** Implement the `POST /api/plan/allocate` endpoint. This endpoint will be idempotent by first clearing any existing active allocations before running the new allocation process.
    *   **Subtask 4.4:** In the allocation response, provide a detailed summary including the number of students allocated, unallocated students with reasons (e.g., "no available seats with required accessibility features"), and room utilization metrics.

*   **Task 5: Rebalancing and Atomic Updates (Independent)**
    *   **Subtask 5.1:** When handling `PATCH /api/seats/:id/status`, if a seat is marked as `broken`, wrap the logic in a database transaction to update the seat's status and simultaneously deactivate any active allocation associated with that seat.
    *   **Subtask 5.2:** Implement the `POST /api/plan/rebalance` endpoint, which will attempt to find new seats for any students who were unassigned due to seat status changes.

*   **Task 6: Concurrency Control (Independent)**
    *   **Subtask 6.1:** Implement optimistic locking on the `seats` table. Before updating a seat, the service layer will check if the `version` number in the request matches the one in the database. If not, it will return a conflict error, forcing the client to refetch the latest data.

#### **Phase 3: Performance, Security, and Testing**

*   **Task 7: Caching with Redis (Independent)**
    *   **Subtask 7.1:** Integrate an `ioredis` client into the application.
    *   **Subtask 7.2:** Implement caching middleware for frequently accessed, read-only endpoints like `GET /api/buildings` and `GET /api/rooms/:id/seats`.
    *   **Subtask 7.3:** Implement cache invalidation logic. For example, after a `POST /api/rooms` request for a specific building, invalidate the cache for `GET /api/buildings/:id/rooms` for that building.

*   **Task 8: Security and Validation (Integrated throughout development)**
    *   **Subtask 8.1:** Use a validation library like `express-validator` or `Joi` in all endpoints to sanitize and validate incoming data.
    *   **Subtask 8.2:** Add the `helmet` middleware to set essential security headers.
    *   **Subtask 8.3:** Implement rate limiting on sensitive endpoints, especially `/api/plan/allocate` and the login endpoints, using a library like `express-rate-limit`.

*   **Task 9: Comprehensive Testing (Independent)**
    *   **Subtask 9.1:** Write unit tests for the allocation algorithm using a framework like Jest, covering scenarios with sufficient seats, insufficient seats, and various student constraints.
    *   **Subtask 9.2:** Write integration tests to verify the behavior of API endpoints, especially the atomicity of marking a seat as broken and the concurrency handling of allocation requests.

#### **Phase 4: Deployment and Documentation**

*   **Task 10: Dockerization (Independent)**
    *   **Subtask 10.1:** Create a `Dockerfile` for the Node.js backend.
    *   **Subtask 10.2:** Create a `docker-compose.yml` file to set up the entire local development environment, including `api`, `web`, `postgres`, and `redis` services.
    *   **Subtask 10.3:** Write a database seeding script (`seed.js`) that can be executed to populate the database with sample data for development and testing.

*   **Task 11: Documentation (Independent)**
    *   **Subtask 11.1:** Create a detailed `README.md` file explaining how to set up and run the project locally, environment variable configuration, and a brief overview of the API.
    *   **Subtask 11.2:** Create an `infra.md` file outlining the deployment plan on AWS, as specified in the requirements.