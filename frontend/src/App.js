import { useEffect, useState, useRef, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// Pages
import HomePage from "@/pages/HomePage";
import CoursesPage from "@/pages/CoursesPage";
import AboutPage from "@/pages/AboutPage";
import ApplyPage from "@/pages/ApplyPage";
import ApplicantDocumentsPage from "@/pages/ApplicantDocumentsPage";
import AdmissionsPage from "@/pages/AdmissionsPage";
import ContactPage from "@/pages/ContactPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import AuthCallback from "@/pages/AuthCallback";
import DiplomaProgrammePage from "@/pages/DiplomaProgrammePage";
import FacultyPage from "@/pages/FacultyPage";
import WhyPlan4GrowthPage from "@/pages/WhyPlan4GrowthPage";
import TrainingAcademyPage from "@/pages/TrainingAcademyPage";

// Portal Pages
import AdminPortal from "@/pages/portal/admin/AdminPortal";
import RepPortal from "@/pages/portal/rep/RepPortal";
import StudentPortal from "@/pages/portal/student/StudentPortal";
import { CRMPortal } from "@/pages/portal/crm";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API}/auth/me`, {
        headers,
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
      localStorage.removeItem("token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password, bypassSSO = false) => {
    const response = await axios.post(`${API}/auth/login`, { 
      email, 
      password,
      bypass_sso: bypassSSO
    });
    const { token: newToken, user: userData, sso_redirect } = response.data;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    return { ...userData, sso_redirect };
  };

  const register = async (name, email, password, phone, referredBy = null, referralCode = null) => {
    const response = await axios.post(`${API}/auth/register`, {
      name,
      email,
      password,
      phone,
      referred_by: referredBy,
      referral_code: referralCode
    });
    const { token: newToken, user: userData, application_token, student_id } = response.data;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    // Return full response data including application_token
    return { ...userData, application_token, student_id };
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const setUserFromOAuth = (userData) => {
    setUser(userData);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, token, setUserFromOAuth, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { state: { from: location.pathname } });
    } else if (!loading && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate portal based on role
      // super_admin/admin -> Admin portal
      // manager/sales_user (educational rep) -> CRM portal
      // delegate (enrolled student) -> Student portal with referral features
      // student -> Student portal
      if (user.role === "super_admin" || user.role === "admin") {
        navigate("/portal/admin");
      } else if (user.role === "manager" || user.role === "sales_user" || user.role === "rep") {
        navigate("/portal/crm");
      } else if (user.role === "delegate" || user.role === "student") {
        navigate("/portal/student");
      } else {
        navigate("/portal/student");
      }
    }
  }, [user, loading, navigate, location, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) return null;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;

  return children;
};

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id - must be synchronous during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/admissions" element={<AdmissionsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/diploma-programme" element={<DiplomaProgrammePage />} />
      <Route path="/faculty" element={<FacultyPage />} />
      <Route path="/why-plan4growth" element={<WhyPlan4GrowthPage />} />
      <Route path="/why-us" element={<WhyPlan4GrowthPage />} />
      <Route path="/training-academy" element={<TrainingAcademyPage />} />
      
      {/* Applicant Document Upload (public - token-based auth) */}
      <Route path="/apply/documents" element={<ApplicantDocumentsPage />} />

      {/* Admin Portal */}
      <Route
        path="/portal/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <AdminPortal />
          </ProtectedRoute>
        }
      />

      {/* CRM Portal - for managers, sales users (educational reps), and legacy rep role */}
      <Route
        path="/portal/crm/*"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "admin", "manager", "sales_user", "rep"]}>
            <CRMPortal />
          </ProtectedRoute>
        }
      />

      {/* Rep Portal */}
      <Route
        path="/portal/rep/*"
        element={
          <ProtectedRoute allowedRoles={["rep"]}>
            <RepPortal />
          </ProtectedRoute>
        }
      />

      {/* Student Portal */}
      <Route
        path="/portal/student/*"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentPortal />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="App font-body">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
