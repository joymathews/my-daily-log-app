# My Daily Log App Requirements

## Overview
A personal app for logging daily events in natural language with file upload capabilities as supporting documents and chronological event viewing.

## Functional Requirements
- Text-based natural language entry for daily events
- File upload functionality: .txt, pdf, images, MS Office documents
- Chronological viewing of past entries
- Simple search/filter capabilities by date and content

## Technology Stack
- **Frontend**: React.js with Material-UI (lightweight, open-source)
  - **Testing**: Jest and React Testing Library for component testing
  - **Hosting**: AWS Amplify (static site hosting, free tier)
- **Backend**: Node.js with Express (minimal resource requirements)
  - **Node.js Version**: 22.x
  - **Testing**: Mocha and Chai for API testing
  - **Hosting**: AWS Lambda + API Gateway (serverless, free tier)
- **Database**: DynamoDB (AWS serverless, free tier)
- **Authentication**: AWS Cognito (free tier for up to 50,000 monthly active users)
- **File Storage**: AWS S3 (free tier for first 5GB)
- **Development Environment**: Docker for consistent local development experience
  - Dockerfiles configured to use Node.js version 22.x
- **Version Control & CI/CD**:
  - **Repository**: GitHub for source code management
  - **Build & Deployment**: GitHub Actions for automated CI/CD pipelines

## Non-Functional Requirements
- Designed for personal use (1-4 users maximum)
- Minimal hosting costs (preferably free tier services)
- Local development and testing capability with minimal setup
- Comprehensive test coverage (unit, integration, and end-to-end tests)
- The app must be runnable and fully testable locally before deployment to AWS
- Frontend and backend must be decoupled and maintained in separate folders
- Automated CI/CD using GitHub Actions with separate deployment pipelines for frontend and backend
- Version parity: Ensure Node.js version 22.x is used across all environments (local development, testing, and production)