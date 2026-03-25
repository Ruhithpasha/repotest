import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  CheckCircle, 
  CreditCard,
  ArrowRight,
  Send,
  Loader2,
  Calendar,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PublicLayout from "@/components/layout/PublicLayout";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const ApplyPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    message: ""
  });

  const steps = [
    {
      icon: FileText,
      step: 1,
      title: "Submit Application",
      description: "Complete the online application form with your professional details and upload supporting documents."
    },
    {
      icon: CheckCircle,
      step: 2,
      title: "Review & Offer",
      description: "Our admissions team reviews your application and issues an offer letter within 5-7 working days."
    },
    {
      icon: CreditCard,
      step: 3,
      title: "Confirm & Enrol",
      description: "Accept your offer and complete the enrolment process to secure your place in the next cohort."
    }
  ];

  const intakes = [
    {
      title: "June 2026 Intake",
      deadline: "Application deadline: 15 May 2026",
      cohort: "Maximum cohort size: 30 dentists"
    },
    {
      title: "January 2027 Intake",
      deadline: "Application deadline: 15 December 2026",
      cohort: "Maximum cohort size: 30 dentists"
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post(`${API}/contact`, formData);
      toast.success("Enquiry submitted successfully! We'll contact you soon.");
      setFormData({ name: "", email: "", whatsapp: "", message: "" });
    } catch (error) {
      toast.error("Failed to submit enquiry. Please try again.");
      console.error("Contact form error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-slate-50" data-testid="apply-hero">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-slate-900 leading-tight mb-6">
              Admissions
            </h1>
            <p className="text-slate-600 text-lg md:text-xl leading-relaxed">
              Begin your journey towards becoming a confident dental implantologist. 
              Our streamlined application process makes it easy to get started.
            </p>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20 bg-white" data-testid="apply-process">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900 mb-6">
              Application Process
            </h2>
            <p className="text-slate-600 text-lg">
              Three simple steps to secure your place on the programme.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {steps.map((item, index) => (
              <div key={index} className="relative" data-testid={`apply-step-${item.step}`}>
                <div className="bg-white p-8 rounded-2xl border border-slate-200 h-full">
                  <div className="w-12 h-12 bg-amber-500 text-white font-bold text-xl rounded-xl flex items-center justify-center mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-heading text-xl text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="text-amber-500" size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Intakes */}
      <section className="py-20 bg-slate-50" data-testid="intakes-section">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-heading text-3xl md:text-4xl text-slate-900 mb-12 text-center">
            Upcoming Intakes
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {intakes.map((intake, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl border border-slate-200"
                data-testid={`intake-card-${index}`}
              >
                <h3 className="font-heading text-2xl text-slate-900 mb-4">{intake.title}</h3>
                <div className="space-y-2 text-slate-600">
                  <p className="flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" />
                    {intake.deadline}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users size={16} className="text-amber-500" />
                    {intake.cohort}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/register" data-testid="start-application-btn">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-10 py-6 text-lg rounded-lg shadow-lg shadow-amber-500/25">
                Start Your Application
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-amber-600 hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Enquiry Form */}
      <section className="py-20 bg-white" data-testid="enquiry-section">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl text-slate-900 mb-6">
                Book a Consultation
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Not sure if this programme is right for you? Book a free consultation 
                with our admissions team to discuss your goals and get your questions answered.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-700">
                  <CheckCircle className="text-amber-500" size={20} />
                  <span>Free eligibility assessment</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <CheckCircle className="text-amber-500" size={20} />
                  <span>No obligation consultation</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <CheckCircle className="text-amber-500" size={20} />
                  <span>Response within 24 hours</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl" data-testid="enquiry-form">
              <h3 className="font-heading text-xl text-slate-900 mb-6">Send Us an Enquiry</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-700">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. Your Name"
                    required
                    className="mt-1 bg-white"
                    data-testid="enquiry-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-slate-700">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                    className="mt-1 bg-white"
                    data-testid="enquiry-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="text-slate-700">Phone Number</Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="+44 7XXX XXXXXX"
                    className="mt-1 bg-white"
                    data-testid="enquiry-whatsapp-input"
                  />
                </div>
                <div>
                  <Label htmlFor="message" className="text-slate-700">Your Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about yourself and your questions..."
                    rows={4}
                    required
                    className="mt-1 bg-white"
                    data-testid="enquiry-message-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg"
                  disabled={isSubmitting}
                  data-testid="enquiry-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Enquiry
                      <Send className="ml-2" size={18} />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ApplyPage;
