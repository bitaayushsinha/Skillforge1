# 🚀 SkillForge LMS — Frontend Application

![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vanilla CSS](https://img.shields.io/badge/Styling-Vanilla%20CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![React Router](https://img.shields.io/badge/Routing-Custom%20SPA-CA4245?style=for-the-badge&logo=react-router&logoColor=white)

This directory contains the client-side Single Page Application (SPA) for **SkillForge LMS**, an AI-powered Learning Management System and Community Marketplace.

---

## ✨ Overview of Frontend Architecture

The SkillForge frontend is built with **React 18** and custom modern **Vanilla CSS**, featuring a responsive design, sleek glassmorphism components, vibrant dark mode styling, and dynamic micro-animations.

### Key UI Components & Dashboards (`src/Components/`)
*   **👨‍🎓 Learner Portal**:
    *   **Marketplace (`Marketplace.js`)**: Discover courses, filter by category, search keywords, and simulate cart purchases.
    *   **My Learning (`MyLearning.js`)**: Track daily streaks, monitor weekly goal progress, view enrolled courses, and take interactive quizzes.
    *   **Certifications (`Certifications.js` & `VerifyCertificate.js`)**: View earned cryptographic certificates, download/scan QR codes, and publicly verify certificate validity.
    *   **AI Tutor (`AIAssistant.js`)**: Real-time conversational AI chatbot interface powered by Groq LLMs.
*   **🌐 Community Hub (`CommunityVoting.js` & `CourseProposalModal.js`)**:
    *   Submit new course ideas.
    *   Real-time Upvoting, Downvoting, and sorting by *Newest*, *Most Voted*, *Most Discussed*, and *Trending*.
    *   Threaded commenting with likes and nested replies.
*   **🧑‍🏫 Expert Dashboard (`ExpertPanel.js`)**:
    *   Create and manage course curriculums.
    *   Upload rich media materials (video lectures, PDF handouts, diagrams, syllabus outlines).
*   **🕵️ Review Center (`ReviewCenter.js`)**:
    *   Dedicated portal for Reviewers to evaluate community course proposals.
    *   Approve or reject ideas with structured feedback and rejection reasons.
*   **⚙️ Admin Console (`AdminPanel.js`)**:
    *   System-wide user role management (promote/demote Learners, Experts, Reviewers, Admins).
    *   Platform governance and course moderation.

---

## 🛠️ Getting Started

### Prerequisites
*   **Node.js v18+** and **npm**
*   The **FastAPI backend** running locally at `http://localhost:8000` (see root `README.md` for backend instructions).

### 1. Install Dependencies
In this directory (`/frontend`), install all required npm packages:
```powershell
npm install
```

### 2. Configure Environment Variables
Create or verify the `.env` file in the `frontend/` folder:
```ini
REACT_APP_API_URL=http://localhost:8000
```

### 3. Start Development Server
```powershell
npm start
```
Runs the app in development mode at **[http://localhost:3000](http://localhost:3000)**. The page will reload when you make edits.

---

## 📦 Build for Production
To build the app for production deployment:
```powershell
npm run build
```
This correctly bundles React in production mode and optimizes the build for the best performance into the `build/` folder.

---

## 🔗 For Full Platform Details
Please refer to the main repository root documentation: [c:\Users\user\Desktop\skillforge\README.md](file:///c:/Users/user/Desktop/skillforge/README.md).
