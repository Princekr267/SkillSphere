# SkillSphere — Hyperlocal Freelance Marketplace

SkillSphere is a hyperlocal freelance marketplace. It connects clients with nearby freelancers using real location awareness and features transparent, explainable matches.

## Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide React Icons
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), TypeScript
- **Integrations**: Cloudinary (resume storage/uploads)

---

## Directory Structure
```
skillsphere/
├── client/              # React + Vite (TypeScript, Tailwind CSS)
└── server/              # Node.js + Express (TypeScript, local MongoDB)
```

---

## Setup & Running Instructions

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on your computer

### 1. Database Configuration
Make sure your local MongoDB instance is started. By default, the backend connects to:
`mongodb://127.0.0.1:27017/skillsphere`

### 2. Backend Setup
1. Open a terminal in the `/server` directory.
2. Create a `.env` file (you can copy `.env.example` as a starting point):
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/skillsphere
   JWT_SECRET=your_jwt_secret_here
   CLOUDINARY_CLOUD_NAME=placeholder_cloud_name
   CLOUDINARY_API_KEY=placeholder_api_key
   CLOUDINARY_API_SECRET=placeholder_api_secret
   ```
   > [!NOTE]
   > If Cloudinary credentials are left as placeholders, the server automatically falls back to storing uploaded files locally in the `server/uploads/` directory, so everything works fully offline!
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a terminal in the `/client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local address displayed (typically `http://localhost:5173`).

---

## Verification & Interactive Walkthrough (Phase 1)
To verify everything is working, you can perform the following sequence:
1. Navigate to `/register` and choose the **Client** role. Complete details and use the geolocation lookup (GPS) or query search (Nominatim OpenStreetMap) to select your city. Submit to register.
2. Once registered, log out and navigate to `/register` again. Select **Freelancer**, complete details, select your location, and register.
3. On the freelancer dashboard, try adding a few custom skills and levels, adding a portfolio item, and uploading a PDF/image resume.
4. Try updating the settings (rate, username) and click save to see changes persist on refresh!
