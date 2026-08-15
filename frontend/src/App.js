import React, { useState, useEffect } from 'react';
import './App.css';
import LandingHeader from './Components/Landing/LandingHeader';
import LandingHero from './Components/Landing/LandingHero';
import LandingMethodology from './Components/Landing/LandingMethodology';
import LandingCourses from './Components/Landing/LandingCourses';
import LandingTestimonials from './Components/Landing/LandingTestimonials';
import Footer from './Components/Footer';
import AuthModal from './Components/AuthModal';
import Dashboard from './Components/Dashboard/Dashboard';
import CourseProposalModal from './Components/CourseProposalModal';
import FeedbackPage from './Components/FeedbackPage';
import FAQPage from './Components/FAQPage';
import VerifyCertificate from './Components/Dashboard/VerifyCertificate';
import VerifyStudent from './Components/Dashboard/VerifyStudent';
import MockAssessment from './Components/MockAssessment';
import ExamPortal from './Components/Exam/ExamPortal';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [stats, setStats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [experts, setExperts] = useState([]);
  const [activePage, setActivePage] = useState('home');

  // Search & Filter State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Stats & Experts on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const statsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        const expertsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/experts`);
        if (expertsRes.ok) {
          const expertsData = await expertsRes.json();
          setExperts(expertsData);
        }
      } catch (err) {
        console.warn('Backend API currently offline. Using offline placeholders.', err);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Fetch Courses dynamically based on filters
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (activeCategory && activeCategory !== 'All') {
          queryParams.append('category', activeCategory);
        }
        if (searchQuery) {
          queryParams.append('search', searchQuery);
        }

        const url = `${process.env.REACT_APP_API_URL}/api/courses?${queryParams.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const coursesData = await res.json();
          setCourses(coursesData);
        }
      } catch (err) {
        console.warn('Backend API currently offline. Using empty course list.', err);
        setCourses([]);
      }
    };

    fetchCourses();
  }, [activeCategory, searchQuery]);

  // Check if token exists in localStorage on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('sf_token');
    const savedUser = localStorage.getItem('sf_user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
      }
    }
  }, []);

  const handleAuthSuccess = (token, userData) => {
    setUser(userData);
    localStorage.setItem('sf_token', token);
    localStorage.setItem('sf_user', JSON.stringify(userData));
    sessionStorage.removeItem('sf_welcome_shown');
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    sessionStorage.removeItem('sf_welcome_shown');
  };

  const handleUserUpdate = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('sf_user', JSON.stringify(newUserData));
  };

  const handleEnrollCourse = (course) => {
    if (!user) {
      // Prompt user to sign in before enrolling
      setIsAuthOpen(true);
    } else {
      alert(`🎉 Congratulations ${user.name}! You have successfully enrolled in "${course.title}". Let's start learning!`);
    }
  };

  const handleStartFree = () => {
    if (!user) {
      setIsAuthOpen(true);
    } else {
      const element = document.getElementById('courses');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleBrowseCourses = () => {
    const element = document.getElementById('courses');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const pathname = window.location.pathname;
  if (pathname.startsWith('/verify-student/')) {
    const studentId = decodeURIComponent(pathname.split('/verify-student/')[1] || '');
    return <VerifyStudent studentId={studentId} />;
  }
  if (pathname === '/verify-student') {
    return <VerifyStudent />;
  }
  if (pathname.startsWith('/verify/')) {
    const certId = decodeURIComponent(pathname.split('/verify/')[1] || '');
    return <VerifyCertificate certId={certId} />;
  }

  if (pathname.startsWith('/mock-assessment/')) {
    const bookingRef = decodeURIComponent(pathname.split('/mock-assessment/')[1] || '');
    return <MockAssessment bookingRef={bookingRef} />;
  }

  if (pathname.startsWith('/exam/take/')) {
    const credentialId = decodeURIComponent(pathname.split('/exam/take/')[1] || '');
    return <ExamPortal credentialId={credentialId} />;
  }

  return (
    <div className="App skillforge-gradient-bg">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      ) : (
        <>
          <LandingHeader
            onOpenAuth={() => setIsAuthOpen(true)}
            setActivePage={setActivePage}
            activePage={activePage}
          />

          <main style={{ flexGrow: 1 }}>
            {activePage === 'feedback' ? (
              <FeedbackPage user={user} onOpenAuth={() => setIsAuthOpen(true)} />
            ) : activePage === 'faq' ? (
              <FAQPage />
            ) : (
              <div className="bg-white font-sans text-slate-600 antialiased">
                <LandingHero
                  stats={stats}
                  onStartFree={handleStartFree}
                  onBrowseCourses={handleBrowseCourses}
                />

                <LandingMethodology />

                <LandingCourses
                  courses={courses}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onEnrollCourse={handleEnrollCourse}
                />

                <LandingTestimonials />
              </div>
            )}
          </main>

          <Footer setActivePage={setActivePage} />
        </>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {!user && (
        <>
          <button
            className="course-request-tag"
            onClick={() => setIsProposalOpen(true)}
            aria-label="Suggest a Course"
          >
            <span>Suggest a Course</span>
          </button>

          <CourseProposalModal
            isOpen={isProposalOpen}
            onClose={() => setIsProposalOpen(false)}
            user={user}
          />
        </>
      )}
    </div>
  );
}

export default App;
