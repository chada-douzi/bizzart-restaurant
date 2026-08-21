# BIZZ'ART Monastir - Premium Restaurant Platform

A modern, production-ready full-stack web platform for BIZZ'ART Monastir restaurant.

## 🎯 Overview

Premium restaurant website featuring:
- Dynamic menu management
- Online table reservation system
- Media gallery with Cloudinary integration
- Customer reviews management
- Admin dashboard for content management
- SEO optimized for local search
- Mobile-first responsive design

## 🛠️ Technology Stack

### Frontend
- **Angular 17+** (Standalone Components)
- **TypeScript 5+**
- **Tailwind CSS 3+**
- **RxJS** for reactive programming
- **Angular Signals** for state management

### Backend
- **Node.js 20+**
- **Express.js 4+**
- **TypeScript 5+**
- **MongoDB** with Mongoose
- **JWT** authentication
- **Cloudinary** for media storage

## 📁 Project Structure

```
bizzart-restaurant/
├── frontend/          # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # Services, guards, interceptors
│   │   │   ├── shared/       # Reusable components
│   │   │   ├── features/     # Feature modules (lazy loaded)
│   │   │   ├── admin/        # Admin dashboard
│   │   │   └── layout/       # Layout components
│   │   ├── assets/
│   │   └── styles/
│   └── ...
│
├── backend/           # Express API
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── models/           # Mongoose schemas
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── validators/       # Input validation
│   │   ├── utils/            # Utility functions
│   │   └── server.ts         # Entry point
│   └── ...
│
├── .gitignore
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Cloudinary account
- Email service account (Gmail, SendGrid, etc.)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd bizzart-restaurant
```

2. **Setup Backend**
```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Setup Frontend**
```bash
cd frontend
npm install
# Edit src/environments/environment.ts with backend URL
npm start
```

4. **Access the application**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Admin: http://localhost:4200/admin

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- `EMAIL_HOST` - SMTP host
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password

### Optional Variables
- `PORT` - Backend port (default: 3000)
- `FRONTEND_URL` - Frontend URL for CORS
- `JWT_EXPIRES_IN` - Token expiration time

## 📦 Database Setup

### Local MongoDB
```bash
mongosh
use bizzart
```

### MongoDB Atlas
1. Create a cluster
2. Create a database user
3. Whitelist your IP
4. Copy connection string to `.env`

## 🎨 Admin Dashboard

### First Admin User

Create first admin via MongoDB:
```javascript
db.users.insertOne({
  email: "admin@bizzart-monastir.com",
  password: "$2b$12$...", // bcrypt hash
  firstName: "Admin",
  lastName: "BIZZ'ART",
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the seed script (coming soon).

### Admin Features
- Dashboard with statistics
- Reservation management
- Menu & category management
- Media gallery management
- Reviews management
- Restaurant settings

## 🌐 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist/frontend/browser to Vercel
```

### Backend (Render/Railway)
```bash
cd backend
npm run build
# Set environment variables
# Deploy to Render or Railway
```

### Required Services
- **MongoDB Atlas** - Database hosting
- **Cloudinary** - Media storage and CDN
- **Email Service** - SendGrid, Mailgun, or Gmail

## 🔒 Security Features

- JWT authentication with HTTP-only cookies
- bcrypt password hashing (12 rounds)
- Rate limiting on all endpoints
- Input validation and sanitization
- XSS protection
- CSRF protection
- Helmet.js security headers
- MongoDB injection prevention
- CORS configuration
- File upload validation

## 📱 Features

### Public Website
- Homepage with hero and featured dishes
- Complete digital menu with categories
- Table reservation system
- Photo & video gallery
- Customer reviews
- Location with Google Maps
- Social media integration
- Mobile-optimized

### Admin Dashboard
- Reservation management (confirm, reject, cancel)
- Menu management (CRUD operations)
- Category management
- Media upload and management
- Review moderation
- Restaurant settings
- Opening hours configuration

## 🎯 SEO Optimization

- Dynamic meta tags per page
- Schema.org JSON-LD (Restaurant structured data)
- Sitemap.xml generation
- robots.txt
- Semantic HTML
- Image optimization
- Mobile-first design
- Fast page load times

## 📊 Performance Targets

- Lighthouse Performance: ≥90
- Lighthouse SEO: ≥95
- Lighthouse Accessibility: ≥90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 API Documentation

### Public Endpoints
- `GET /api/menu/categories` - Get menu categories
- `GET /api/menu/items` - Get menu items
- `POST /api/reservations` - Create reservation
- `GET /api/reservations/availability` - Check availability
- `GET /api/reviews` - Get published reviews
- `GET /api/settings/public` - Get public settings

### Admin Endpoints (Protected)
- `POST /api/auth/login` - Admin login
- `GET /api/admin/reservations` - List reservations
- `PATCH /api/admin/reservations/:id/status` - Update status
- `POST /api/admin/menu/items` - Create menu item
- `POST /api/admin/media/upload` - Upload media
- ... (see full API docs)

## 🤝 Contributing

This is a private project for BIZZ'ART Monastir.

## 📄 License

Private - All rights reserved

## 📞 Support

For issues or questions, contact: [CONTACT_EMAIL]

---

Built with ❤️ for BIZZ'ART Monastir
