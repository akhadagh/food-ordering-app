# FoodGH - Ghanaian Food Ordering & Delivery Web App

A full-stack food ordering and tracking web application featuring authentic Ghanaian local foods with Mobile Money payments and AI chatbot support.

## Tech Stack

- **Frontend:** React.js, Tailwind CSS, React Router, Recharts
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Auth:** JWT (JSON Web Tokens)

## Features

### Customer Side
- User registration & login
- Interactive menu with categories (Local Favorites, Rice Dishes, Soups, Drinks, Sides)
- Custom options (protein choice, spice level, portion size)
- Shopping cart with quantity management
- Multiple Ghanaian payment methods (MTN MoMo, Vodafone Cash, AirtelTigo Money, Cash on Delivery, Card, Bank Transfer)
- Promo code system
- Live order status tracking with visual progress bar
- Order history
- AI chatbot for instant help

### Admin Dashboard
- Revenue & order statistics overview
- Order management (update statuses)
- Menu management (add/edit/delete items & categories)
- Sales reports with charts (bar, line, pie)
- CSV export of sales data
- Promo code management

## Ghanaian Menu Items

- Banku with Okra Soup - GH₵35
- Banku with Tilapia - GH₵45
- Fufu with Light Soup - GH₵40
- Jollof Rice - GH₵40
- Waakye and Stew - GH₵35
- Rice Ball with Groundnut Soup - GH₵38
- Kenkey with Fried Fish - GH₵30
- And many more...

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env   # Edit with your DB credentials
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup Database

```bash
# Create PostgreSQL database
createdb food_ordering

# Run migrations
cd backend
npm run migrate

# Seed with sample data
npm run seed
```

### 3. Run the App

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 4. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodgh.com | admin123 |
| Customer | kwame@example.com | password123 |

## Project Structure

```
food-ordering-app/
├── backend/
│   ├── config/          # DB config & migrations
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── seeds/           # Seed data
│   ├── utils/           # Utilities
│   └── server.js        # Entry point
├── frontend/
│   └── src/
│       ├── components/  # React components
│       │   ├── auth/    # Auth forms
│       │   ├── cart/    # Cart components
│       │   ├── chatbot/ # AI chatbot
│       │   ├── layout/  # Navbar, Footer
│       │   ├── menu/    # Menu components
│       │   └── tracking/# Order tracking
│       ├── context/     # React contexts
│       ├── pages/       # Page components
│       ├── services/    # API service
│       └── App.js       # Main app
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Get profile |
| PUT | /api/auth/profile | Update profile |
| GET | /api/menu/categories | List categories |
| GET | /api/menu/items | List menu items |
| POST | /api/orders | Create order |
| GET | /api/orders/my-orders | My orders |
| GET | /api/orders/:id | Order details |
| GET | /api/admin/dashboard | Dashboard stats |
| GET | /api/admin/sales | Sales data |
| GET | /api/admin/sales/export | Download CSV |

## Environment Variables

See `.env.example` in the backend directory for all required variables.

## Git Workflow

Use these commands to start working with Git, create branches, and publish the project to a new remote repository.

### 1. Create a local repository

If this folder is not already a Git repository, initialize it first:

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Create a branch

Create a new branch for your work and switch to it:

```bash
git checkout -b feature/your-branch-name
```

To see all branches, run:

```bash
git branch
```

### 3. Commit your changes

After editing files, stage and commit them:

```bash
git add .
git commit -m "Describe your changes"
```

### 4. Create a new remote repository

Create a new repository on GitHub, GitLab, or Bitbucket, then connect it to this project:

```bash
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main
```

If you prefer the GitHub CLI, you can create and publish the repo in one step:

```bash
gh repo create your-repo-name --private --source=. --remote=origin --push
```
