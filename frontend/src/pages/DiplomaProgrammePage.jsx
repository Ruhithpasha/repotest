import { useRef, useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";
import axios from "axios";
import { API } from "@/App";

const defaultContent = {
  hero_badge: "Level 7 UK Diploma",
  hero_title_accent: "Diploma in ",
  hero_title_highlight: "Dental Implantology",
  hero_description: "A structured programme combining academic learning, clinical mentoring, and practical exposure to modern implant workflows for practising dentists.",
  cta_text: "Apply Now",
  cta_url: "/admissions"
};

const DiplomaProgrammePage = () => {
  const [content, setContent] = useState(defaultContent);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/diploma`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          setContent({ ...defaultContent, ...response.data.content });
        }
      } catch (error) {
        console.log('Using default diploma content');
      }
    };
    fetchContent();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const learningOutcomes = [
    "Implant case selection and treatment planning",
    "CBCT analysis and digital implant workflows",
    "Surgical implant placement techniques",
    "Bone augmentation and soft tissue management",
    "Prosthetic restoration and occlusion principles",
    "Full-arch rehabilitation concepts",
    "Implant complication management",
    "Ethical communication and case acceptance"
  ];

  const modules = [
    { number: 1, title: "Module 1", desc: "Foundations of Dental Implantology, Ethics and Professional Regulation" },
    { number: 2, title: "Module 2", desc: "Treatment Planning and Patient Selection in Implant Dentistry" },
    { number: 3, title: "Module 3", desc: "Surgical Techniques and Implant Placement" },
    { number: 4, title: "Module 4", desc: "Bone Augmentation and Soft Tissue Management" },
    { number: 5, title: "Module 5", desc: "Prosthetic Restoration and Occlusion in Implant Dentistry" },
    { number: 6, title: "Module 6", desc: "Digital Implant Workflow and CBCT Analysis" },
    { number: 7, title: "Module 7", desc: "Full-Arch Rehabilitation and All-on-X Concepts" },
    { number: 8, title: "Module 8", desc: "Complication Management, Maintenance Protocols and Implant Practice Growth" }
  ];

  const clinicalFeatures = [
    "CBCT analysis workshops",
    "Treatment planning sessions",
    "Surgical workflow demonstrations",
    "Live surgery observation",
    "Guided surgical planning"
  ];

  const included = [
    "All academic modules",
    "Online learning platform",
    "Assignments and assessments",
    "UK clinical training",
    "Accommodation during training",
    "Meals during training"
  ];

  const applicationSteps = [
    "Submit application form",
    "Upload required documents",
    "Eligibility screening",
    "Interview with programme mentor",
    "Offer letter issued",
    "Deposit payment",
    "Enrolment confirmation"
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="diploma-hero">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <BookOpen size={16} />
              {content.hero_badge}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              {content.hero_title_accent}<br />
              <span className="text-[#d4a04a]">{content.hero_title_highlight}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8 max-w-2xl">
              {content.hero_description}
            </p>
            <Link to={content.cta_url || "/admissions"}>
              <Button className="bg-[#d4a04a] text-[#0d1117] font-heading font-semibold hover:bg-[#c4903a] h-11 px-8">
                {content.cta_text}
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Programme Introduction Video */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-charcoal mb-3">
                Hear From Our Programme Director
              </h2>
              <p className="text-muted-foreground text-sm">
                Get a brief overview of what the Level 7 Diploma involves and who it is for.
              </p>
            </div>
            <div className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gold/20 bg-charcoal">
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                controls
                className="w-full h-auto block"
              >
                <source src="/videos/video.mp4" type="video/mp4" />
              </video>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Have questions?{' '}
              <a href="/contact" className="text-gold hover:underline font-medium">
                Contact our admissions team →
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Programme Overview */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-6 text-charcoal">Programme Overview</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {content.overview || "The Level 7 Diploma in Dental Implantology at Plan4Growth Academy is designed for practising dentists who want to develop the clinical knowledge and practical skills required to confidently place dental implants."}
              </p>
              <p>
                The programme combines online academic modules with hands-on clinical training in the UK, allowing participants to learn at their own pace while gaining real-world surgical exposure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Will Learn */}
      <section className="py-20 md:py-28 bg-surface">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-8 text-charcoal">What You Will Learn</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {learningOutcomes.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border">
                  <CheckCircle className="text-gold mt-0.5 shrink-0" size={20} />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Programme Modules */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-8 text-charcoal">Programme Modules</h2>
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module.number} className="flex items-start gap-5 p-6 rounded-lg border border-border hover:border-gold/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                    <span className="font-heading font-bold text-gold">{module.number}</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-charcoal">{module.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{module.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UK Clinical Training */}
      <section className="py-20 md:py-28 bg-charcoal">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-6 text-white">UK Clinical Training</h2>
            <p className="text-white/80 mb-8 leading-relaxed">
              Participants will attend a five-day clinical immersion programme in the United Kingdom after completing the online modules.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {clinicalFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="text-gold shrink-0" size={18} />
                  <span className="text-sm text-white/80">{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 p-5 bg-white/5 rounded-lg">
              <MapPin className="text-gold mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-sm font-medium text-white">Plan4Growth Training Centre</p>
                <p className="text-sm text-white/60">Bexleyheath, United Kingdom</p>
                <p className="text-xs text-white/50 mt-1">Accommodation and meals provided during training days.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programme Fee */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-8 text-[#0d1117]">Programme Fee</h2>
            <div className="bg-[#fdfdf5] p-8 rounded-xl border border-[#d4a04a]/30">
              {/* Limited Time Offer Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Calendar size={16} />
                Limited Time Offer — Enrol within 1 month
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-heading font-bold text-[#0d1117]">£6,250</span>
                <span className="text-2xl text-red-400 line-through">£9,997</span>
              </div>
              
              {/* Total fee and savings */}
              <div className="flex items-center gap-3 mb-8">
                <span className="text-slate-500">Total programme fee</span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-sm font-medium">Save £3,747</span>
              </div>

              {/* Payment Terms */}
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>40% deposit payable upon acceptance of the offer letter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Remaining balance within 90 days of confirmation</span>
                </li>
              </ul>
            </div>

            {/* What's Included */}
            <div className="mt-8">
              <h4 className="font-heading font-semibold text-[#0d1117] mb-4">What's Included:</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {included.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="text-[#d4a04a] shrink-0" size={16} />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20 md:py-28 bg-surface">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-8 text-charcoal">Application Process</h2>
            <div className="space-y-0">
              {applicationSteps.map((step, index) => (
                <div key={index} className="flex gap-5 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-gold text-charcoal font-bold rounded-full flex items-center justify-center text-sm shrink-0">
                      {index + 1}
                    </div>
                    {index < applicationSteps.length - 1 && (
                      <div className="w-px flex-1 bg-gold/30 mt-2"></div>
                    )}
                  </div>
                  <p className="text-foreground pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-charcoal">
        <div className="container text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Ready to Begin Your Implant Journey?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Apply now to secure your place on the next intake of the Level 7 Diploma in Dental Implantology.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/admissions">
              <Button className="bg-gold text-charcoal font-heading font-semibold hover:bg-gold-dark h-11 px-8">
                Apply Now
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-2 border-gold text-gold font-heading font-semibold hover:bg-gold hover:text-charcoal h-11 px-8">
                Book Consultation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile CTA */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <Link to="/admissions">
          <Button className="bg-gold text-charcoal font-heading font-semibold hover:bg-gold-dark h-11 rounded-full shadow-xl px-6">
            Apply Now
          </Button>
        </Link>
      </div>
    </PublicLayout>
  );
};

export default DiplomaProgrammePage;
