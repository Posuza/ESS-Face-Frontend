# ESS MO Frontend

This is the frontend for the ESS MO (Employee Self Service - Ministry of Organization) system. It is a modern web application built with React, TypeScript, and Vite, providing a user interface for employee attendance, reporting, and management features.

## Features
- Employee check-in/check-out and attendance module
- Daily Onsite Report MO & Dashboard with charts and reports
- Secure authentication and role-based access
- Responsive UI  mobile

## Development Guide

### Prerequisites
- Node.js (v22 or newer recommended)
- npm (comes with Node.js)

### Clone and Run

```bash
# Clone the repository
 git clone https://github.com/Posuza/ESS_MO_Fronend.git
 cd ESS_MO_Fronend

# Install dependencies
 npm install

# Start the development server
 npm run dev
```

The app will be available at `http://localhost:5173` by default.

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` folder.

### Environment Variables

Copy `.env.development` or `.env.production` and set your API endpoint:

```
VITE_API_URL=https://your-api-endpoint
```

---

For deployment instructions, see the `/deployment` folder in the main project.
