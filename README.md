# 🚀 SkillForge LMS — Next-Generation AI-Powered Learning Management System

![SkillForge LMS Banner](https://img.shields.io/badge/SkillForge-AI%20Powered%20LMS-6366f1?style=for-the-badge&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

**SkillForge LMS** is a state-of-the-art, full-stack Learning Management System and Community Marketplace augmented with real-time Artificial Intelligence. Designed to bridge the gap between self-paced learning, industry mentorship, and crowdsourced curriculum development, SkillForge empowers learners, industry experts, reviewers, and administrators within a unified, interactive platform.

---

## ✨ Key Features

### 🔐 1. Multi-Role Role-Based Access Control (RBAC)
SkillForge implements a comprehensive 4-tier permission architecture tailored to diverse educational workflows:
*   **👨‍🎓 Learners**:
    *   Browse and enroll in curated tech courses via an interactive marketplace.
    *   Track daily learning streaks, earn XP points, and monitor weekly goal hours.
    *   Participate in community curriculum shaping by submitting **Course Proposals**.
    *   Upvote, downvote, and engage in threaded discussions on community proposals.
    *   Earn cryptographically verifiable course completion certificates with QR codes.
*   **🧑‍🏫 Industry Experts**:
    *   Create, publish, and update course curriculums.
    *   Manage rich course materials: video lectures, PDF handouts, diagrams, and syllabus outlines.
    *   Validate community-suggested course proposals and mentor learners.
*   **🕵️ Reviewers (Review Center)**:
    *   Evaluate pending course proposals submitted by the learner community.
    *   Approve or reject course ideas with structured feedback and rejection reasons.
    *   Trigger automated real-time notifications to learners upon review completion.
*   **⚙️ Administrators**:
    *   Complete control over platform governance, user role promotions/demotions, and moderation.
    *   Create and manage users across all roles.
    *   Override course configurations, manage uploads, and perform system maintenance.

---

### 🤖 2. AI-Powered Educational Tools
Integrates cutting-edge LLMs (via **Groq** and **OpenAI APIs**) to deliver intelligent learning assistance:
*   **🧠 Real-Time AI Tutor / Chat Assistant**: A contextual AI chatbot that understands existing SkillForge courses, answers technical queries, explains complex concepts, and guides learners to relevant catalog courses.
*   **📝 Automated Quiz Generation**: Dynamically generates interactive multiple-choice quizzes (with explanations) from course syllabus text, uploaded materials, and module definitions using AI.
*   **⚡ Async AI Proposal Preprocessing**: Background tasks automatically categorize and process learner-submitted course proposals upon creation.

---

### 🌐 3. Crowdsourced Curriculum & Community Marketplace
*   **💡 Community Course Proposals**: Learners can suggest new course topics they want to see on the platform.
*   **📊 Interactive Voting & Discussion**:
    *   Real-time **Upvoting & Downvoting** system.
    *   Dynamic sorting by *Newest*, *Most Voted*, *Most Discussed*, and *Trending*.
    *   Threaded commenting system with comment likes and reply structures.
*   **🛒 Course Marketplace & Checkout**:
    *   Filter courses by category or search by keywords.
    *   Integrated shopping cart and seamless checkout simulation.

---

### 📜 4. Verifiable Certifications & QR Code Verification
*   **Verification Engine**: Each completed course generates a secure certificate with a unique UUID (`certificate_id`).
*   **Instant QR Code Scanning**: Automatically generates verifiable QR codes using Python `qrcode` and `Pillow`.
*   **Public Verification Endpoint**: Anyone can verify the authenticity and validity status of a SkillForge certificate via dedicated endpoints (`/api/certificates/verify/{certificate_id}`).

---

## 🏗️ System Architecture & Technology Stack

### 🔹 Backend Architecture (`/backend`)
Built for high concurrency, type safety, and rapid API delivery:
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13) running on ASGI **Uvicorn** server.
*   **Database & ORM**: **SQLite** (`skillforge.db`) with **SQLAlchemy 2.0** ORM and automated startup schema migration.
*   **Data Validation**: **Pydantic V2** (`pydantic[email]`) for strict request/response serialization.
*   **Authentication & Security**:
    *   **JSON Web Tokens (JWT)** via `pyjwt` with OAuth2 Bearer token workflows.
    *   **SHA-256** cryptographic password hashing.
    *   **Google OAuth2 ID Token Verification** for one-click social sign-in.
*   **AI Services**: Groq SDK (`groq-1.5.0`), OpenAI SDK (`openai-2.44.0`), and document/web scraping utilities (`scrapling`, `pypdf`).
*   **Background Tasks**: Native FastAPI asynchronous background tasks for heavy AI processing.

### 🔹 Frontend Architecture (`/frontend`)
Designed for a premium, highly responsive user experience:
*   **Framework**: **React 18** (bootstrapped with Create React App / Webpack).
*   **Styling & Design System**: Modern **Vanilla CSS** featuring glassmorphism, responsive grid layouts, custom animations, and sleek dark mode aesthetics.
*   **State Management & Routing**: React Hooks, Context API, and role-based route guards (`AdminProtectedRoute`, `ExpertProtectedRoute`, `ReviewerProtectedRoute`).

---

## 📂 Repository Structure

```text
skillforge/
├── README.md                      # Project documentation
├── backend/                       # FastAPI Backend Application
│   ├── main.py                    # Application entrypoint, CORS setup & core endpoints
│   ├── database.py                # SQLAlchemy engine & session management
│   ├── models/                    # SQLAlchemy database models & schemas
│   │   ├── __init__.py            # Core entity definitions (User, Course, Proposal, etc.)
│   │   └── certificate.py         # Certificate verification models
│   ├── routes/                    # API Route modules
│   │   └── certificates.py        # Certificate generation & public verification APIs
│   ├── schemas.py                 # Pydantic request & response schemas
│   ├── auth.py                    # JWT token creation, RBAC dependency injectors
│   ├── ai_service.py              # Quiz generation & proposal preprocessing logic
│   ├── groq_service.py            # AI Chat Assistant Groq LLM integration
│   ├── seed.py                    # Database seeding script with starter courses/users
│   ├── requirements.txt           # Python backend dependencies
│   └── uploads/                   # Local storage for uploaded course materials/images
└── frontend/                      # React Frontend Application
    ├── package.json               # Node.js dependencies & npm scripts
    ├── public/                    # Static assets & HTML template
    └── src/                       # React source code
        ├── App.js                 # Main application routing & view switching
        ├── index.js               # React DOM rendering entrypoint
        └── Components/            # UI Components & Modules
            ├── Header.js / Footer.js # Navigation & site footer
            ├── AuthModal.js       # Login, Registration & Google OAuth modal
            ├── Dashboard/         # Role-specific dashboard views
            │   ├── AIAssistant.js # Real-time AI chat interface
            │   ├── AdminPanel.js  # Admin user & course management console
            │   ├── ExpertPanel.js # Expert curriculum & material editor
            │   ├── ReviewCenter.js# Reviewer proposal evaluation portal
            │   ├── Marketplace.js # Course discovery & catalog
            │   ├── MyLearning.js  # Learner progress & active courses
            │   ├── CommunityVoting.js # Crowdsourced course proposal discussion
            │   └── Certifications.js  # Earned certificates & verification
            └── ...                # Additional modals, guards, and utility components
```

---

## 🛠️ Getting Started & Setup Instructions

### Prerequisites
*   **Python 3.10+** (Python 3.13 recommended)
*   **Node.js v18+** and **npm**

---

### 1. Backend Setup & Running Local Server

1. **Navigate to the backend directory**:
   ```powershell
   cd backend
   ```

2. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory (or modify existing):
   ```ini
   SECRET_KEY=your_jwt_secret_key_here
   GROQ_API_KEY=your_groq_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

4. **Initialize & Seed the Database**:
   The backend automatically creates database tables and seeds initial starter data on startup if the database is empty. You can also manually run:
   ```powershell
   python seed.py
   ```

5. **Start the FastAPI Development Server**:
   ```powershell
   python -m uvicorn main:app --reload --port 8000
   ```
   *The backend API will be running at `http://localhost:8000`.*
   *Interactive Swagger API documentation is available at `http://localhost:8000/docs`.*

---

### 2. Frontend Setup & Running Local Server

1. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install Node dependencies**:
   ```powershell
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `frontend/` directory:
   ```ini
   REACT_APP_API_URL=http://localhost:8000
   ```

4. **Start the React Development Server**:
   ```powershell
   npm start
   ```
   *The web application will open automatically at `http://localhost:3000`.*

---

## 📡 Key API Endpoints Reference

| Category | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register a new learner account | ❌ No |
| **Auth** | `POST` | `/api/auth/login` | Authenticate with email/password & receive JWT | ❌ No |
| **Auth** | `POST` | `/api/auth/google` | Sign in / Sign up with Google OAuth ID Token | ❌ No |
| **Courses** | `GET` | `/api/courses` | List courses with category & search filtering | ❌ No |
| **AI Quiz** | `GET` | `/api/courses/{id}/quiz` | Generate AI multiple-choice quiz for a course | ❌ No |
| **Community**| `GET` | `/api/community/proposals` | Get approved course proposals (sort by trending, newest) | Optional |
| **Community**| `POST` | `/api/community/proposals/{id}/vote` | Upvote or downvote a course proposal | ✅ Yes (Any) |
| **Community**| `POST` | `/api/community/proposals/{id}/comment`| Post a comment or reply on a proposal | ✅ Yes (Any) |
| **AI Tutor** | `POST` | `/api/ai/chat` | Send prompt to real-time SkillForge AI assistant | Optional |
| **Reviewer** | `GET` | `/api/reviewer/proposals` | Fetch pending proposals for evaluation | ✅ Reviewer / Admin |
| **Reviewer** | `PUT` | `/api/reviewer/proposals/{id}/status`| Approve or reject a proposal with feedback | ✅ Reviewer / Admin |
| **Admin** | `GET` | `/api/admin/users` | List all platform users and roles | ✅ Admin |
| **Admin** | `PUT` | `/api/admin/users/{id}/role` | Promote or demote user role | ✅ Admin |
| **Certificates**| `GET`| `/api/certificates/verify/{id}` | Publicly verify authenticity of a certificate | ❌ No |

---

## 💡 Default Demo Accounts
When seeded, the database contains pre-configured test users for exploring different roles:

*   **👑 Admin**: `admin@skillforge.com` / `password123`
*   **🧑‍🏫 Expert**: `expert@skillforge.com` / `password123`
*   **🕵️ Reviewer**: `reviewer@skillforge.com` / `password123`
*   **👨‍🎓 Learner**: `learner@skillforge.com` / `password123`

---

## 🤝 Contributing
1. Fork the repository and create your feature branch (`git checkout -b feature/amazing-feature`).
2. Commit your changes (`git commit -m 'Add some amazing feature'`).
3. Push to the branch (`git push origin feature/amazing-feature`).
4. Open a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
