import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUserFromOAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL fragment
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        console.error("No session_id found in URL");
        navigate("/login", { replace: true });
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        // Exchange session_id for user data and set cookie
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        const userData = response.data;
        setUserFromOAuth(userData);

        // Clear stale application_token from any previous user, set new one
        localStorage.removeItem('application_token');
        if (userData.application_token) {
          localStorage.setItem('application_token', userData.application_token);
        }

        // Clear the hash
        window.history.replaceState(null, "", window.location.pathname);

        // Redirect based on user role
        if (userData.role === 'admin' || userData.role === 'super_admin') {
          // Admin/Super Admin -> Admin Portal
          navigate("/portal/admin", { replace: true });
        } else if (userData.is_new_user && userData.application_token) {
          // New student -> Document Upload
          navigate(`/apply/documents?token=${userData.application_token}`, { replace: true });
        } else {
          // Existing student -> Student Dashboard
          navigate("/portal/student", { replace: true, state: { user: userData } });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/login", { replace: true });
      }
    };

    processAuth();
  }, [navigate, setUserFromOAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="auth-callback">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-gold mx-auto mb-4" />
        <p className="text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
