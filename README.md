# SmartLearn AI

SmartLearn AI is a full-stack learning platform with a React/Vite frontend and an Express/MongoDB backend. It combines course delivery, user accounts, admin management, AI-assisted test generation, interview practice, roadmap generation, reviews, blog content, careers, and newsletter/contact workflows.

## Project Structure

```text
SmartLearn AI/
|- client/   # React + Vite frontend
|- server/   # Express API + MongoDB backend
```

## Core Features

- User registration, OTP verification, login, Google sign-in, password reset
- Course catalog, course detail pages, lectures, progress tracking, dashboard
- Free and paid enrollment flows with Razorpay integration
- AI-generated MCQ tests with difficulty levels, caching, and performance analysis
- AI interview practice, chatbot support, and roadmap generation
- Admin dashboard for courses, users, blog posts, about content, careers, contacts, and newsletter campaigns
- Public pages for blog, about, FAQ, contact, careers, privacy, terms, and cookies

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- React Hot Toast

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Nodemailer
- Razorpay
- Groq and Gemini API integrations

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string
- Razorpay account and API keys
- Groq API key
- Gemini API key
- Gmail app password or equivalent SMTP credentials for email flows
- Google OAuth client ID for frontend and backend Google sign-in

## Environment Variables

Create a `server/.env` file with the values your deployment needs.

```env
PORT=5000
NODE_ENV=development
DB=mongodb+srv://...
CORS_ORIGIN=http://localhost:5173
frontendurl=http://localhost:5173

Jwt_Sec=your_jwt_secret
Activation_Secret=your_activation_secret
Forgot_Secret=your_forgot_password_secret

Gmail=your-email@example.com
Password=your-app-password
ADMIN_EMAIL=admin@example.com

GOOGLE_CLIENT_ID=your_google_client_id

Razorpay_Key=rzp_test_xxxxx
Razorpay_Secret=your_razorpay_secret
Razorpay_Webhook_Secret=your_razorpay_webhook_secret

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Create a `client/.env` file for frontend-only values.

```env
VITE_SERVER_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Notes:

- The backend currently refuses to start if `GROQ_API_KEY`, `GEMINI_API_KEY`, `Razorpay_Key`, or `Razorpay_Secret` are missing.
- In production, the backend also rejects Razorpay test keys.

## Installation

Install dependencies in both apps:

```bash
cd client
npm install
```

```bash
cd server
npm install
```

## Running Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Available Scripts

### Client

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run preview` serves the built frontend locally
- `npm run lint` runs ESLint

### Server

- `npm run dev` starts the API with Nodemon
- `npm start` starts the API with Node

## API Overview

The backend exposes routes for:

- Authentication and profile management under `/api/user/*`
- Courses, lectures, enrollments, checkout, and payment verification under `/api/*`
- Admin-only course, user, blog, newsletter, about, contact, and job management under `/api/*`
- Reviews under `/api/reviews`
- Public content such as contact, newsletter, blog, about, and jobs under `/api/public`
- AI endpoints for chatbot, interview turns, roadmap generation, test generation, and test analysis

## Deployment Notes

- Set `CORS_ORIGIN` to the frontend origin.
- Set `frontendurl` to the public frontend URL so email links resolve correctly.
- Configure Razorpay webhook delivery to `POST /api/razorpay/webhook`.
- Ensure the server can write uploaded assets if you rely on file uploads.

## Current Gaps

- There is no root-level automated test setup documented in the repo.
- `client/README.md` is still the default Vite template and can be updated separately if you want package-specific docs.
