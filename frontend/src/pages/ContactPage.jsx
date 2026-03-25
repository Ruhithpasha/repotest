import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin,
  Send,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PublicLayout from "@/components/layout/PublicLayout";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

// Default content
const defaultContent = {
  page_title: "Contact Us",
  page_subtitle: "Have questions about the programme? Get in touch with our admissions team.",
  phone: "+44 7352 062709",
  whatsapp: "+44 7352 062709",
  email: "info@plan4growth.uk",
  address: "Rochester, United Kingdom",
  booking_url: "https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call",
  office_hours: "Monday - Friday: 9am - 5pm"
};

const ContactPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState(defaultContent);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    message: ""
  });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/contact`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          setContent({ ...defaultContent, ...response.data.content });
        }
      } catch (error) {
        console.log('Using default contact content');
      }
    };
    fetchContent();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post(`${API}/contact`, formData);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", whatsapp: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error("Contact form error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="contact-hero">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <Mail size={16} />
              Get In Touch
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              {content.page_title?.split(' ')[0]}<br />
              <span className="text-[#d4a04a]">{content.page_title?.split(' ').slice(1).join(' ') || 'Us'}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
              {content.page_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20" data-testid="contact-section">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto">

            {/* Contact Form */}
            <div data-testid="contact-form-section">
              <h2 className="font-heading text-2xl font-bold text-charcoal mb-6">Send an Enquiry</h2>

              <form onSubmit={handleSubmit} className="space-y-5" data-testid="contact-form">
                <div>
                  <Label htmlFor="name" className="text-foreground font-medium text-sm">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. Your Name"
                    required
                    className="mt-2 h-11"
                    data-testid="contact-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-foreground font-medium text-sm">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                    className="mt-2 h-11"
                    data-testid="contact-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="text-foreground font-medium text-sm">Phone / WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="+44 7XXX XXXXXX"
                    className="mt-2 h-11"
                    data-testid="contact-whatsapp-input"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-foreground font-medium text-sm">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows={5}
                    required
                    className="mt-2"
                    data-testid="contact-message-input"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gold text-charcoal font-heading font-semibold hover:bg-gold-dark h-11"
                  disabled={isSubmitting}
                  data-testid="contact-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Submit Enquiry
                      <Send className="ml-2" size={16} />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div data-testid="contact-info-section">
              <h2 className="font-heading text-2xl font-bold text-charcoal mb-6">Get in Touch</h2>

              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="text-gold" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <a 
                      href={`mailto:${content.email}`}
                      className="text-foreground hover:text-gold font-medium transition-colors"
                    >
                      {content.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="text-gold" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone / WhatsApp</p>
                    <a 
                      href={`tel:${content.phone?.replace(/\s/g, '')}`}
                      className="text-foreground hover:text-gold font-medium transition-colors"
                    >
                      {content.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-gold" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Training Centre</p>
                    <p className="text-foreground font-medium">{content.address}</p>
                  </div>
                </div>
              </div>

              {/* Book Consultation CTA */}
              <div className="bg-surface p-6 rounded-xl border border-border">
                <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">Book a Consultation</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Speak with our programme team to discuss your suitability and ask any questions about the diploma.
                </p>
                <a 
                  href={content.booking_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" className="border-2 border-gold text-gold font-heading font-semibold hover:bg-gold hover:text-charcoal h-10 px-5">
                    Book Now
                  </Button>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-charcoal" data-testid="contact-cta">
        <div className="container text-center">
          <Link to="/admissions" data-testid="contact-apply-btn">
            <Button className="bg-gold text-charcoal font-heading font-semibold hover:bg-gold-dark h-11 px-8">
              Apply Now
              <ArrowRight className="ml-2" size={16} />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ContactPage;
