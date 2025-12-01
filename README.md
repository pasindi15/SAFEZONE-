# SafeZone_DMS

<p align="center">
	<img src="https://img.shields.io/badge/Node.js-Backend-green?logo=node.js" alt="Node.js"/>
	<img src="https://img.shields.io/badge/React-Frontend-blue?logo=react" alt="React"/>
	<img src="https://img.shields.io/badge/MongoDB-Database-brightgreen?logo=mongodb" alt="MongoDB"/>
</p>

## 🌐 Overview

**SafeZone_DMS** is a full-stack Disaster Management System designed to coordinate disaster response, manage shelters, donations, victims, and volunteers, and provide real-time information to users and administrators. It features a robust Node.js/Express backend and a modern React frontend with interactive maps and dashboards.

---

## 🚀 Features

### Backend (Node.js/Express, MongoDB)
- RESTful APIs for disaster, shelter, victim, volunteer, donation, and alert management
- Geospatial queries for finding nearby shelters
- Real-time weather broadcast cron job
- Authentication & session management
- Email notifications
- Modular controller, model, and router structure

### Frontend (React, Mapbox, MUI, Chakra UI)
- Interactive dashboards for admins, DMO, and response teams
- Victim dashboard for reporting disasters, requesting aid, and tracking claims
- Donation dashboard for managing donations, inventory, and volunteers
- Map with real-time shelter locations, user geolocation, and evacuation routes
- Responsive UI with Chakra UI and Material-UI components
- CSS scoping for modular, conflict-free styles

---

## 🗂️ Project Structure

```
SafeZone_DMS/
│
├── backend/         # Node.js/Express API server
│   ├── Controllers/ # Business logic for each resource
│   ├── models/      # Mongoose schemas
│   ├── Router/      # API route definitions
│   ├── Services/    # Email, weather, templates
│   ├── utils/       # Utilities (pagination, validators, etc.)
│   └── app.js       # Main server entry point
│
├── frontend/        # React application
│   ├── src/         # React source code
│   ├── public/      # Static assets
│   └── build/       # Production build output
│
├── IMPLEMENTATION_SUMMARY.md  # CSS scoping and implementation notes
├── CSS_SCOPING_GUIDE.md       # CSS modularization guide
└── README.md
```

---

## 🏠 Key Modules & Dashboards

- **Shelter System:**
	- Find nearest shelters, view details, and get evacuation routes (Mapbox integration)
	- Admin CRUD for shelters with geospatial search
- **Victim Management:**
	- Victim registration, profile, disaster reporting, aid requests, and claim tracking
- **Donation Management:**
	- Donation dashboard for tracking donations, inventory, centers, and volunteers
	- Public donation forms and distribution plans
- **Admin & DMO Dashboards:**
	- Alerts, reports, deployments, and response team management
- **Weather Broadcast:**
	- Automated weather alerts for Sri Lanka

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Deeghau0816/SafeZone_DMS.git
cd SafeZone_DMS
```

### 2. Backend Setup
```bash
cd backend
npm install
# (Optional) Add sample shelters:
# node scripts/addSampleShelters.js
npm start
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
# App runs on http://localhost:3000
```

---

## 🗺️ Shelter System Example

- View all shelters: `GET /api/shelters`
- Find nearby: `GET /api/shelters/nearby?latitude=...&longitude=...`
- Add shelter: `POST /api/shelters`
- See [backend/README_SHELTERS.md](backend/README_SHELTERS.md) for full API docs

---

## 🧑‍💻 Contribution Guidelines

1. Fork the repo and create a feature branch
2. Follow the CSS scoping conventions ([CSS_SCOPING_GUIDE.md](CSS_SCOPING_GUIDE.md))
3. Write clear commit messages
4. Open a pull request with a detailed description

---

## 📚 Documentation

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md): CSS and feature implementation notes
- [backend/README_SHELTERS.md](backend/README_SHELTERS.md): Shelter API and frontend usage
- [CSS_SCOPING_GUIDE.md](CSS_SCOPING_GUIDE.md): CSS modularization

---

## 🛡️ License

This project is licensed under the ISC License.

---

<p align="center">
	<b>Empowering disaster response, one click at a time.</b>
</p>