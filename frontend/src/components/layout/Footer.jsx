import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import axios from "axios";
import { API } from "@/App";

const defaultContent = {
  tagline: "A UK professional education centre delivering EduQual-approved Level 7 diploma programmes for dental professionals.",
  quick_links: [
    { label: "Home", url: "/" },
    { label: "Diploma Programme", url: "/diploma-programme" },
    { label: "Faculty", url: "/faculty" },
    { label: "Why Plan4Growth", url: "/why-plan4growth" },
    { label: "Admissions", url: "/admissions" },
    { label: "Contact", url: "/contact" },
  ],
  programme_links: [
    { label: "Level 7 Diploma" },
    { label: "Dental Implantology" },
    { label: "EduQual Accredited" },
    { label: "12 Months Duration" },
    { label: "UK Clinical Training" },
  ],
  contact_email: "info@plan4growth.uk",
  contact_phone: "+44 7352 062709",
  contact_address: "Bexleyheath, United Kingdom",
};

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    axios.get(`${API}/website-settings/footer`)
      .then(res => {
        const data = res.data?.content;
        if (data && Object.keys(data).length > 0) {
          setContent({ ...defaultContent, ...data });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-slate-900 text-white" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Logo & About */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <span className="font-heading text-xl font-bold text-white">
                Plan<span className="text-amber-500">4</span>Growth
              </span>
              <span className="text-slate-400 text-xs ml-1">Academy</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              {content.tagline}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {content.quick_links?.map((link) => (
                <li key={link.url || link.label}>
                  <Link
                    to={link.url || "#"}
                    className="text-slate-400 hover:text-amber-500 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programme */}
          <div>
            <h4 className="font-semibold text-white mb-4">Programme</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              {content.programme_links?.map((item, i) => (
                <li key={i}>{item.label}</li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-4">
              {content.contact_email && (
                <li className="flex items-start gap-3">
                  <Mail size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <a href={`mailto:${content.contact_email}`}
                    className="text-slate-400 hover:text-amber-500 text-sm transition-colors">
                    {content.contact_email}
                  </a>
                </li>
              )}
              {content.contact_phone && (
                <li className="flex items-start gap-3">
                  <Phone size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${content.contact_phone.replace(/\s/g, '')}`}
                    className="text-slate-400 hover:text-amber-500 text-sm transition-colors">
                    {content.contact_phone}
                  </a>
                </li>
              )}
              {content.contact_address && (
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-400 text-sm">{content.contact_address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {currentYear} Plan4Growth Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-slate-500 hover:text-amber-500 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-slate-500 hover:text-amber-500 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
