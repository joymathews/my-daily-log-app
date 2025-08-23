# My Daily Log App

A full-stack application for logging and viewing daily events, featuring AWS integration, local development with Docker, and mock/test data support. This app can be used as a personal journal to record and review your daily experiences.

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- Docker & Docker Compose (for AWS emulation)
- npm

---

## Quick Start

### 1. Clone the repository
```sh
 git clone https://github.com/joymathews/my-daily-log-app.git
 cd my-daily-log-app
```

### 2. Start DynamoDB and Localstack individually (for AWS emulation)

#### Start DynamoDB (local)
```sh
 docker-compose up dynamodb
```

#### Start Localstack (for S3 emulation)
```sh
 docker-compose up localstack
```

### 3. Start Backend and Frontend (without Docker)

#### Start Backend
```sh
cd backend
npm install
npm start
```
- Uses the script: `"start": "node local-bootstrap.js"` from `backend/package.json`

#### Start Frontend
```sh
cd frontend
npm install
npm run dev
```
- Uses the script: `"dev": "vite"` from `frontend/package.json`

---

## Running Unit Tests

### Backend
- Run tests and coverage:
```sh
 cd backend
 npm install
 npm test
```
- Test script (from `backend/package.json`):
```json
"test": "jest --runInBand --coverage"
```

### Frontend
- Run tests and coverage:
```sh
 cd frontend
 npm install
 npm test
```
- Test script (from `frontend/package.json`):
```json
"test": "jest --coverage"
```

---

## Environment Variables

> **Note:** Environment files are not committed to the repo. You must create them manually.

### Frontend (`frontend/.env.local`)
Example content:
```
VITE_API_BASE_URL=http://localhost:3001
```
- `VITE_API_BASE_URL`: The base URL for the backend API. Set to your backend service address.

### Backend (`backend/.env`)
Create a file with the following keys (do not include secrets):
```
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://localhost:8000
S3_ENDPOINT=http://localhost:4566
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
S3_BUCKET_NAME=my-daily-log-files
DYNAMODB_TABLE_NAME=DailyLogEvents
```
- Adjust values as needed for your local setup. Do not include any real AWS credentials or secrets.

---

## Docker Compose Overview
- `docker-compose.yml` is mainly used to start DynamoDB and Localstack to mimic AWS S3 and DynamoDB locally.
- Backend and frontend containers are also defined for local development, but you can run them directly as shown above.
