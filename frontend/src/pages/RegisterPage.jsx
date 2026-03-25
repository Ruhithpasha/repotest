import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, Gift, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  
  // Referral state
  const [referralCode, setReferralCode] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralValid, setReferralValid] = useState(null);
  const [referrerName, setReferrerName] = useState("");
  const [referrerId, setReferrerId] = useState(null);

  // Check for referral code in URL on mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      validateReferralCode(refCode);
      
      // Track the click
      trackReferralClick(refCode);
    }
  }, [searchParams]);

  const trackReferralClick = async (code) => {
    try {
      await axios.post(`${API}/referrals/track-click`, {
        referral_code: code,
        ip_address: '', // Will be detected server-side
        user_agent: navigator.userAgent
      });
    } catch (error) {
      // Silently fail - tracking is non-critical
      console.log('Referral click tracking failed:', error);
    }
  };

  const validateReferralCode = async (code) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerName("");
      setReferrerId(null);
      return;
    }

    setReferralValidating(true);
    try {
      const response = await axios.post(`${API}/referrals/validate`, {
        referral_code: code.toUpperCase(),
        registering_email: formData.email || null
      });

      if (response.data.valid) {
        setReferralValid(true);
        setReferrerName(response.data.referrer_name);
        setReferrerId(response.data.referrer_user_id);
      } else {
        setReferralValid(false);
        setReferrerName("");
        setReferrerId(null);
      }
    } catch (error) {
      setReferralValid(false);
      setReferrerName("");
      setReferrerId(null);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      }
    } finally {
      setReferralValidating(false);
    }
  };

  const handleReferralCodeChange = (e) => {
    const code = e.target.value.toUpperCase();
    setReferralCode(code);
    
    // Debounce validation
    if (code.length >= 4) {
      const timer = setTimeout(() => validateReferralCode(code), 500);
      return () => clearTimeout(timer);
    } else {
      setReferralValid(null);
    }
  };

  const clearReferralCode = () => {
    setReferralCode("");
    setReferralValid(null);
    setReferrerName("");
    setReferrerId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Re-validate referral code with email before submission
    if (referralCode && referralValid) {
      try {
        const validationResponse = await axios.post(`${API}/referrals/validate`, {
          referral_code: referralCode,
          registering_email: formData.email
        });
        if (!validationResponse.data.valid) {
          toast.error(validationResponse.data.error || "Invalid referral code");
          return;
        }
      } catch (error) {
        if (error.response?.data?.error) {
          toast.error(error.response.data.error);
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      // Pass referral info to registration
      const result = await register(
        formData.name, 
        formData.email, 
        formData.password, 
        formData.phone,
        referralValid ? referrerId : null,
        referralValid ? referralCode : null
      );
      toast.success("Registration successful! Welcome to Plan4Growth Academy.");
      
      // If backend returns application_token, send user to document upload page
      if (result?.application_token) {
        localStorage.setItem('application_token', result.application_token);
        navigate(`/apply/documents?token=${result.application_token}`);
      } else {
        navigate("/portal/student");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed. Please try again.");
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
    <div className="min-h-screen flex" data-testid="register-page">
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
            Start Your Journey
          </h1>
          <p className="text-slate-400 leading-relaxed mb-8">
            Join dentists advancing their careers with our UK-accredited 
            Level 7 Diploma in Dental Implantology.
          </p>
          <div className="text-left space-y-4">
            {[
              "UK-Accredited Qualification",
              "Flexible Online Learning",
              "Expert Faculty Support",
              "Career Advancement"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-white">
                <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                </div>
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8">
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
            <h2 className="font-heading text-3xl text-slate-900 mb-2">Create Account</h2>
            <p className="text-slate-500">
              Register to start your application
            </p>
          </div>

          {/* Google Signup Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 py-3 border-slate-200 hover:bg-slate-50 h-12"
            onClick={handleGoogleLogin}
            data-testid="google-register-btn"
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
              <span className="px-2 bg-white text-slate-500">or register with email</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
            <div>
              <Label htmlFor="name" className="text-slate-700">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Dr. Your Name"
                  required
                  className="pl-10 h-12"
                  data-testid="register-name-input"
                />
              </div>
            </div>

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
                  data-testid="register-email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 7XXX XXXXXX"
                  className="pl-10 h-12"
                  data-testid="register-phone-input"
                />
              </div>
            </div>

            {/* Referral Code Field */}
            <div>
              <Label htmlFor="referralCode" className="text-slate-700 flex items-center gap-2">
                <Gift size={16} className="text-amber-500" />
                Referral Code <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="referralCode"
                  name="referralCode"
                  value={referralCode}
                  onChange={handleReferralCodeChange}
                  placeholder="P4G-XXXXXXXX"
                  className={`h-12 pr-10 uppercase ${
                    referralValid === true ? 'border-green-500 focus:ring-green-500' :
                    referralValid === false ? 'border-red-500 focus:ring-red-500' :
                    ''
                  }`}
                  data-testid="register-referral-input"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {referralValidating ? (
                    <Loader2 className="animate-spin text-slate-400" size={18} />
                  ) : referralValid === true ? (
                    <CheckCircle className="text-green-500" size={18} />
                  ) : referralCode && referralValid === false ? (
                    <button type="button" onClick={clearReferralCode}>
                      <X className="text-red-500 hover:text-red-600" size={18} />
                    </button>
                  ) : null}
                </div>
              </div>
              {referralValid === true && referrerName && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Referred by {referrerName} — they'll earn a bonus when you enroll!
                </p>
              )}
              {referralCode && referralValid === false && (
                <p className="text-xs text-red-500 mt-1">Invalid referral code</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700">Password</Label>
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
                  minLength={8}
                  className="pl-10 pr-10 h-12"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="pl-10 h-12"
                  data-testid="register-confirm-password-input"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 h-12 rounded-lg"
              disabled={isLoading}
              data-testid="register-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-amber-600 font-medium hover:underline" data-testid="login-link">
              Sign in
            </Link>
          </p>

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

export default RegisterPage;
