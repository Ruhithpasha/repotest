import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bypassSSO, setBypassSSO] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const from = location.state?.from || "/portal/student";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Make login request with bypass_sso flag
      const response = await axios.post(`${API}/auth/login`, { 
        email: formData.email, 
        password: formData.password,
        bypass_sso: bypassSSO
      });

      // Check for SSO redirect
      if (response.data.sso_redirect && !bypassSSO) {
        // Store token first so user is logged in on return
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Redirect to course platform
        window.location.href = response.data.sso_redirect;
        return;
      }

      // Normal login flow
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem("token", newToken);
      
      // Use the login function to update auth context
      await login(formData.email, formData.password, bypassSSO);
      
      toast.success("Login successful!");
      
      // Redirect based on user role
      let redirectPath = from;
      if (userData.role === "super_admin" || userData.role === "admin") {
        redirectPath = "/portal/admin";
      } else if (userData.role === "manager" || userData.role === "sales_user" || userData.role === "rep") {
        redirectPath = "/portal/crm";
      } else if (userData.role === "student" || userData.role === "delegate") {
        redirectPath = "/portal/student";
      }
      
      navigate(redirectPath, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/portal/student';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent"></div>
        <div className="max-w-md text-center relative z-10">
          <Link to="/" className="inline-block mb-8">
            <span className="font-heading text-3xl font-bold text-white">
              Plan<span className="text-amber-500">4</span>Growth
            </span>
            <span className="text-slate-400 text-sm ml-2">Academy</span>
          </Link>
          <h1 className="font-heading text-4xl text-white mb-4">
            Welcome Back
          </h1>
          <p className="text-slate-400 leading-relaxed mb-8">
            Continue your journey towards becoming a confident dental implantologist. 
            Access your courses, track your progress, and connect with faculty.
          </p>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p className="text-slate-300 italic text-sm mb-4">
              "The Level 7 Diploma has transformed my practice. The support from 
              Plan4Growth Academy was exceptional throughout my learning journey."
            </p>
            <p className="text-amber-500 font-medium">Dr. Priya Sharma</p>
            <p className="text-slate-500 text-sm">Mumbai, Class of 2024</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-block">
              <span className="font-heading text-2xl font-bold text-slate-900">
                Plan<span className="text-amber-500">4</span>Growth
              </span>
              <span className="text-slate-400 text-xs ml-1">Academy</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl text-slate-900 mb-2">Sign In</h2>
            <p className="text-slate-500">
              Access your student portal
            </p>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 py-3 border-slate-200 hover:bg-slate-50 h-12"
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or sign in with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-slate-700">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                  className="pl-10 h-12"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Link to="/forgot-password" className="text-sm text-amber-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-12"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 h-12 rounded-lg"
              disabled={isLoading}
              data-testid="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-amber-600 font-medium hover:underline" data-testid="register-link">
              Create one
            </Link>
          </p>

          {/* Bypass SSO option for enrolled students who want portal access */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setBypassSSO(true)}
              className={`text-xs ${bypassSSO ? 'text-amber-600 font-medium' : 'text-slate-400 hover:text-slate-600'} underline`}
              data-testid="bypass-sso-btn"
            >
              {bypassSSO ? '✓ Portal access mode enabled' : 'Already enrolled? Access your portal account instead'}
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
