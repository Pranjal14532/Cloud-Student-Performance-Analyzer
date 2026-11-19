# Cloud Student Performance Analyzer

A full-stack academic performance application built with React, Vite, Express, JWT, and MySQL. It runs without Docker using direct Node.js/npm and MySQL installations.

## Project structure

```text
backend/
  migrations/
  src/
    config/
    middleware/
    routes/
    utils/
    app.js
    server.js
  test/
  .env.example
  package.json
frontend/
  src/
    components/
    context/
    layouts/
    pages/
    services/
    App.jsx
    main.jsx
    styles.css
  .env.example
  package.json
  vite.config.js
```

## Requirements

- Node.js 20 or newer
- npm
- MySQL Server 8.0 or newer
- Git for source deployment

## Local setup

### 1. Create the MySQL database

Connect with MySQL administrator credentials:

```sql
CREATE DATABASE performance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'analyzer'@'localhost' IDENTIFIED BY 'replace-with-a-local-password';
GRANT ALL PRIVILEGES ON performance.* TO 'analyzer'@'localhost';
FLUSH PRIVILEGES;
```

Run the schema using the MySQL client:

```powershell
mysql -h localhost -u analyzer -p performance < backend/migrations/001_init.sql
```

The migration creates `students`, `users`, `marks`, and `notifications` with foreign keys and indexes. Existing records are preserved; it uses `CREATE TABLE IF NOT EXISTS`.

### 2. Configure the Express backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Edit `backend/.env`:

```env
PORT=4000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=performance
DB_USER=analyzer
DB_PASSWORD=replace-with-a-local-password
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-local-admin-password
```

Backend scripts:

```powershell
npm install
npm run dev
npm start
npm test
```

The API runs at `http://localhost:4000/api`.

### 3. Configure and run the React frontend

In another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

Open `http://localhost:5173`.

Frontend scripts:

```powershell
npm install
npm run dev
npm run build
npm run preview
```

The production bundle is generated in `frontend/dist`.

## Demo data

The server seeds clearly identified demo data only when the database is empty. It creates:

- Admin: `admin` / `admin123`, or the configured `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- Student accounts: `aarav`, `mira`, `kabir`, `isha`
- Student password: `student123`

Change these credentials before exposing the application to a network. Existing MySQL records are never deleted or replaced.

## Database migration

Use [001_init.sql](backend/migrations/001_init.sql) for schema initialization. [002_seed.sql](backend/migrations/002_seed.sql) contains optional demo students only.

For an existing Flask/SQLAlchemy SQLite database:

1. Export users, students, and marks while preserving IDs and relationships.
2. Import students first.
3. Import users, mapping each `student_id` to the new student ID.
4. Import marks, mapping each `student_id`.
5. Rehash Flask password hashes only if the target has no bcrypt-compatible hash. The old Werkzeug hashes are not directly usable by this Express application.

Do not delete source data until login and mark totals are verified in MySQL.

## Main application features

- Admin and student login
- JWT authentication with HTTP-only cookies
- Role-based access control
- Student, user, and marks CRUD
- Search, filtering, sorting and pagination
- Subject, semester, class, and individual analytics
- CSV preview/import/export
- Excel and PDF report downloads
- Rule-based performance classification
- Academic notifications
- Responsive React interface

## API endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `/api/students`
- `/api/users`
- `/api/marks`
- `/api/analytics`
- `/api/imports`
- `/api/reports`
- `/api/notifications`

## AWS EC2 and Amazon RDS deployment

### 1. Create Amazon RDS

1. Create an Amazon RDS for MySQL 8.0 instance.
2. Use private subnet placement where practical.
3. Create a database named `performance`.
4. Create a dedicated database user.
5. Allow inbound MySQL port `3306` only from the EC2 security group.
6. Run the migration from an approved development machine or EC2 instance:

```bash
mysql -h <rds-endpoint> -u <database-user> -p performance < backend/migrations/001_init.sql
```

### 2. Deploy the Express backend on EC2

On a supported Linux EC2 instance:

```bash
sudo apt-get update
sudo apt-get install -y nodejs npm mysql-client
git clone <repository-url>
cd Cloud_Student_Performance_Analyzer/backend
npm install
cp .env.example .env
npm start
```

Configure `backend/.env`:

```env
PORT=4000
NODE_ENV=production
DB_HOST=<rds-endpoint>
DB_PORT=3306
DB_NAME=performance
DB_USER=<rds-user>
DB_PASSWORD=<rds-password>
JWT_SECRET=<long-random-secret>
FRONTEND_URL=https://<amplify-domain>
ADMIN_USERNAME=<production-admin>
ADMIN_PASSWORD=<strong-production-password>
```

Set EC2 security-group inbound rules:

- Port `22`: restricted SSH access
- Port `80`: public HTTP if using a reverse proxy
- Port `443`: public HTTPS if using TLS

Keep port `4000` private unless it is intentionally exposed behind a secured reverse proxy.

For production process continuity, use a Node process manager such as PM2:

```bash
npm install -g pm2
pm2 start src/server.js --name student-performance-api
pm2 startup
pm2 save
```

Terminate TLS using AWS Application Load Balancer/ACM or a maintained reverse proxy such as Nginx. Redirect HTTP to HTTPS and set `NODE_ENV=production`, because the API cookie is secure in production.

### 3. Configure CORS

Set `FRONTEND_URL` to the exact Amplify production origin, for example:

```env
FRONTEND_URL=https://main.d1234567890.amplifyapp.com
```

Do not use wildcard origins when cookies are enabled.

### 4. Build and deploy the React frontend

Create `frontend/.env.production`:

```env
VITE_API_URL=https://api.example.com/api
```

Build locally:

```powershell
cd frontend
npm install
npm run build
```

Upload or connect the repository to AWS Amplify. For Amplify Hosting, use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

In Amplify environment variables, set:

```text
VITE_API_URL=https://api.example.com/api
```

Configure an Amplify rewrite for React Router:

```text
Source: /<*>
Target: /index.html
Type: 200
```

Use a custom domain and HTTPS certificate where required.

## Testing

```powershell
cd backend
npm install
npm test
```

```powershell
cd frontend
npm install
npm run build
```

Before production, verify:

- Admin login
- Student login
- Student-only record access
- Student CRUD
- Marks CRUD
- CSV preview and validation
- CSV rejected-row handling
- Excel, PDF, and CSV downloads
- Dashboard calculations
- Notification behavior
- Logout and cookie expiration
