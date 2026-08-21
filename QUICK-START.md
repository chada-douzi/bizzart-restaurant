# 🚀 Quick Start Guide - BIZZ'ART Monastir

## Prerequisites

### Required
- ✅ **Node.js 20+** and npm
- ✅ **MongoDB** (local or Atlas)

### Optional (for later)
- Cloudinary account (media storage)
- Email service account (Gmail, SendGrid, etc.)

---

## 🛠️ Installation

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

---

## 🗄️ MongoDB Setup

### Option A: Local MongoDB (Recommended for Development)

1. **Install MongoDB Community Edition**
   - Windows: https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`

2. **Start MongoDB**
   - Windows Service: MongoDB should start automatically
   - Or manually: `mongod`

3. **Verify Connection**
   ```bash
   mongosh
   # Should connect to mongodb://localhost:27017
   ```

### Option B: MongoDB Atlas (Cloud)

1. Create free account: https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Create database user
4. Whitelist your IP (or use 0.0.0.0/0 for development)
5. Get connection string
6. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bizzart?retryWrites=true&w=majority
   ```

---

## ⚙️ Environment Configuration

### Backend Configuration

The `backend/.env` file is already created with development defaults:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bizzart
JWT_SECRET=<set-in-environment>
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
```

**For now, only MongoDB needs to be configured.**

Cloudinary and Email can be configured later when needed.

---

## 🚀 Run the Application

### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```

**Expected output:**
```
✅ MongoDB connected successfully
📊 Database: bizzart
☁️  Cloudinary configured
🚀 ============================================
🍕 BIZZ'ART Monastir API
🌍 Server running on port 3000
📍 Environment: development
🔗 API URL: http://localhost:3000
💚 Health check: http://localhost:3000/health
🚀 ============================================
```

**Test the backend:**
- Open browser: http://localhost:3000/health
- Should see: `{"success":true,"message":"BIZZ'ART API is running","timestamp":"..."}`

### Terminal 2: Start Frontend
```bash
cd frontend
npm start
```

**Expected output:**
```
✔ Browser application bundle generation complete.
Initial Chunk Files | Names | Raw Size
...
Application bundle generation complete. [X.XXX seconds]

Watch mode enabled. Watching for file changes...
➜  Local:   http://localhost:4200/
```

**Test the frontend:**
- Open browser: http://localhost:4200
- Should see BIZZ'ART homepage

---

## 🧪 Verify Everything Works

### ✅ Backend Health Check
```bash
curl http://localhost:3000/health
```
Or open in browser: http://localhost:3000/health

### ✅ Backend API Info
```bash
curl http://localhost:3000/api
```
Or open in browser: http://localhost:3000/api

### ✅ Frontend Homepage
Open browser: http://localhost:4200

You should see:
- "BIZZ'ART Monastir" hero section
- "Restaurant Italien & Fruits de Mer" subtitle
- "Voir le Menu" and "Réserver une Table" buttons
- Three feature cards (Italian food, Seafood, Location)

---

## 📁 Project Structure

```
bizzart-restaurant/
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Database, Cloudinary, Constants
│   │   ├── server.ts     # Main entry point
│   │   └── ...
│   ├── .env              # Environment variables
│   └── package.json
│
├── frontend/             # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/    # Services, guards, interceptors
│   │   │   ├── shared/  # Reusable components
│   │   │   ├── features/# Home, Menu, Reservation
│   │   │   └── admin/   # Admin dashboard
│   │   ├── environments/
│   │   └── styles.css
│   └── package.json
│
├── README.md
├── QUICK-START.md
└── PHASE-2-SUMMARY.md
```

---

## 🐛 Troubleshooting

### Backend won't start

**Error: "MongooseError: The `uri` parameter to `openUri()` must be a string"**
- Solution: Check that MongoDB is running
- Local: `mongod` or check Windows Services
- Atlas: Verify connection string in `.env`

**Error: "Error: listen EADDRINUSE: address already in use :::3000"**
- Solution: Port 3000 is already in use
- Change port in `backend/.env`: `PORT=3001`
- Or kill process using port 3000

**Error: "connect ECONNREFUSED 127.0.0.1:27017"**
- Solution: MongoDB is not running
- Start MongoDB service or `mongod`

### Frontend won't start

**Error: "Port 4200 is already in use"**
- Solution: Kill process or change port
- Change port: `ng serve --port 4201`

**Error: "Module not found"**
- Solution: Reinstall dependencies
- `cd frontend && npm install`

---

## 🔄 Development Workflow

### Hot Reload is Enabled

**Backend:**
- Nodemon watches for file changes in `src/**/*`
- Server restarts automatically on changes
- No need to manually restart

**Frontend:**
- Angular dev server watches for changes
- Browser auto-refreshes on save
- No need to manually refresh

### Making Changes

1. Edit files
2. Save
3. Check terminal for compilation errors
4. Browser/API automatically updates

---

## 📝 Available NPM Scripts

### Backend
```bash
npm run dev        # Start development server with nodemon
npm run build      # Compile TypeScript to JavaScript
npm start          # Run compiled JavaScript (production)
npm test           # Run tests (coming soon)
```

### Frontend
```bash
npm start          # Start development server (ng serve)
npm run build      # Build for production
npm test           # Run unit tests
```

---

## ✅ Current Status

### ✅ Working
- Backend server running
- Frontend application running
- MongoDB connection
- TypeScript compilation
- Hot reload (both sides)
- Basic routing
- API health check
- Homepage display

### 🔨 In Progress (Phase 3)
- Database models
- Authentication system
- API endpoints
- UI components
- Admin dashboard

---

## 🎯 Next Steps

Once everything is running:

1. **Phase 3**: Build design system and public pages
2. **Phase 4**: Implement backend functionality (auth, reservations, menu)
3. **Phase 5**: Build admin dashboard
4. **Phase 6**: SEO, performance, security optimization
5. **Phase 7**: Testing and production deployment

---

## 📞 Need Help?

Check the full documentation in `README.md` for detailed information.

---

**Last Updated**: August 14, 2026
**Status**: Phase 2 Complete ✅
