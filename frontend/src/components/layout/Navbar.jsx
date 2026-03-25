import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const defaultNavLinks = [
    { path: "/", label: "Home" },
    { path: "/courses", label: "Courses" },
    { path: "/diploma-programme", label: "Diploma Programme" },
    { path: "/faculty", label: "Faculty" },
    { path: "/training-academy", label: "Training Academy" },
    { path: "/why-plan4growth", label: "Why Us" },
    { path: "/admissions", label: "Admissions" },
    { path: "/contact", label: "Contact" },
  ];

  const [navLinks, setNavLinks] = useState(defaultNavLinks);

  useEffect(() => {
    axios.get(`${API}/website-settings/navigation`)
      .then(res => {
        const links = res.data?.content?.nav_links;
        if (links && links.length > 0) {
          setNavLinks(links.map(l => ({ path: l.url, label: l.label })));
        }
      })
      .catch(() => {});
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117] border-b border-[#d4a04a]/10"
      data-testid="main-navbar"
    >
      <nav className="w-full px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          {/* Logo - Left Corner */}
          <Link to="/" className="flex-shrink-0" data-testid="logo-link">
            <img
              src="/images/logo.png"
              alt="Plan4Growth Academy"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Right Side */}
          <div className="hidden lg:flex items-center">
            {/* Nav Links */}
            <div className="flex items-center space-x-8 mr-10">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-[13px] font-medium tracking-wide transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? "text-[#d4a04a]"
                      : "text-white/75 hover:text-[#d4a04a]"
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(' ', '-')}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3 pl-8 border-l border-white/10">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white h-9 px-4"
                      data-testid="user-menu-trigger"
                    >
                      <User size={16} />
                      <span className="text-sm">{user.name?.split(" ")[0] || "Account"}</span>
                      <ChevronDown size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/portal/student" className="w-full cursor-pointer" data-testid="dashboard-link">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={logout}
                      className="cursor-pointer text-red-600"
                      data-testid="logout-btn"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login" data-testid="login-link">
                    <Button
                      variant="ghost"
                      className="text-white/75 hover:text-white hover:bg-white/5 font-medium h-9 px-4 text-[13px]"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link to="/admissions" data-testid="apply-cta-btn">
                    <Button className="bg-[#d4a04a] hover:bg-[#c4903a] text-[#0d1117] font-semibold h-9 px-5 text-[13px]">
                      Apply Now
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4" data-testid="mobile-menu">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium py-2 ${
                    isActive(link.path) ? "text-[#d4a04a]" : "text-white/80"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                {user ? (
                  <>
                    <Link to="/portal/student">
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      onClick={logout}
                      variant="ghost"
                      className="w-full text-red-400 hover:text-red-300"
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                        Login
                      </Button>
                    </Link>
                    <Link to="/admissions">
                      <Button className="w-full bg-[#d4a04a] hover:bg-[#c4903a] text-[#0d1117] font-semibold">
                        Apply Now
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
