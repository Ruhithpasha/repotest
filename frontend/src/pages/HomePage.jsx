import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight,
  Award,
  BookOpen,
  Users,
  Stethoscope,
  Globe,
  UserCheck,
  Calendar,
  DollarSign,
  UserX,
  Heart,
  CheckCircle,
  Play,
  Pause,
  Volume2,
  VolumeX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";
import axios from "axios";
import { API } from "@/App";

const defaultContent = {
  hero_badge: "EduQual-Approved Programme-UK",
  hero_title_1: "Level 7 Diploma in",
  hero_title_2: "Dental Implantology",
  hero_description: "Develop the clinical confidence to place dental implants and retain implant patients within your own practice.",
  hero_tags: [
    { text: "Level 7 UK Diploma" },
    { text: "EduQual-approved" },
    { text: "8 Academic Modules" },
    { text: "UK Clinical Training" },
    { text: "Cohort of 30" }
  ],
  hero_cta_primary_text: "Apply Now",
  hero_cta_primary_url: "/admissions",
  hero_cta_secondary_text: "Book Consultation",
  hero_cta_secondary_url: "/contact",
  hero_cta_tertiary_text: "Download Prospectus",
  hero_cta_tertiary_url: "/contact"
};

const HomePage = () => {
  const [isVisible, setIsVisible] = useState({});
  const [content, setContent] = useState(defaultContent);
  const observerRef = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/home`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          setContent({ ...defaultContent, ...response.data.content });
        }
      } catch (error) {
        console.log('Using default home content');
      }
    };
    fetchContent();
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-animate]").forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const aboutFeatures = [
    { icon: "🎯", label: "Clinical Confidence" },
    { icon: "✅", label: "Predictable Treatments" },
    { icon: "🤝", label: "Patient Retention" },
    { icon: "📈", label: "Career Growth" }
  ];

  const whyMatters = [
    {
      icon: UserX,
      title: "Lost Clinical Opportunity",
      description: "Every referral is a procedure you could have performed yourself."
    },
    {
      icon: DollarSign,
      title: "Lost Practice Revenue",
      description: "Implant treatments represent significant revenue potential for your practice."
    },
    {
      icon: Heart,
      title: "Lost Patient Loyalty",
      description: "Patients who leave for treatment elsewhere may not return."
    }
  ];

  const highlights = [
    {
      icon: Award,
      title: "UK Level 7 Qualification",
      description: "An internationally recognised postgraduate-level diploma."
    },
    {
      icon: BookOpen,
      title: "Structured Curriculum",
      description: "Eight carefully designed academic modules covering implantology from foundations to advanced treatment planning."
    },
    {
      icon: Stethoscope,
      title: "Clinical Mentorship",
      description: "Guidance from experienced implantologists with international clinical experience."
    },
    {
      icon: Users,
      title: "Hands-On Exposure",
      description: "Clinical training in the United Kingdom including surgical workflow observation and planning."
    },
    {
      icon: Globe,
      title: "International Faculty",
      description: "Learn from clinicians with extensive experience in implant dentistry."
    },
    {
      icon: UserCheck,
      title: "Small Cohort Learning",
      description: "Maximum of 30 participants per intake ensuring personalised mentorship."
    }
  ];

  const faculty = [
    {
      initials: "DGM",
      name: "Dr Gaurav Mehta",
      bio: "Implant dentist and multi-practice owner with extensive experience in implant systems, clinical workflow design, and building profitable dental practices."
    },
    {
      initials: "NR",
      name: "Nadia Reinolds",
      bio: "Business strategist specialising in dental practice growth, team development, and operational systems for modern clinics."
    },
    {
      initials: "PL",
      name: "Pedro Laranjeira",
      bio: "Award-winning implantologist with over 15 years of experience in full-arch rehabilitation, grafting procedures, and immediate loading protocols."
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

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="hero-section">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
          <div className="absolute top-0 left-1/2 w-[400px] h-[400px] bg-[#1a1f2e] rounded-full opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <Award size={16} />
              {content.hero_badge}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              {content.hero_title_1}<br />
              <span className="text-[#d4a04a]">{content.hero_title_2}</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8 max-w-2xl">
              {content.hero_description}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to={content.hero_cta_primary_url || "/admissions"} data-testid="hero-apply-btn">
                <Button className="bg-[#d4a04a] text-[#0d1117] font-heading font-semibold hover:bg-[#c4903a] h-11 px-8">
                  {content.hero_cta_primary_text}
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
              <Link to={content.hero_cta_secondary_url || "/contact"}>
                <Button variant="outline" className="border-2 border-[#d4a04a] text-[#d4a04a] font-heading font-semibold hover:bg-[#d4a04a] hover:text-[#0d1117] h-11 px-8">
                  {content.hero_cta_secondary_text}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section 
        id="about-section"
        data-animate
        className={`py-20 md:py-28 transition-all duration-700 ${isVisible['about-section'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        data-testid="about-section"
      >
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            {/* Left - Text Content */}
            <div className="lg:pr-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-charcoal">
                About Plan<span className="text-gold">4</span>Growth Academy
              </h2>
              
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Plan4Growth Academy is a UK professional education centre dedicated to 
                developing advanced clinical and business skills for dental professionals.
              </p>
              
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Plan4Growth is an EduQual-approved centre delivering Level 7 diploma programmes. 
                EduQual is a regulated awarding body approved by Qualifications Scotland Accreditation, 
                ensuring internationally recognised academic standards and robust quality assurance.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {aboutFeatures.map((feature, index) => (
                  <div key={index} className="p-4 bg-surface rounded-lg" data-testid={`about-feature-${index}`}>
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Video */}
            <div className="flex justify-center lg:justify-end lg:pl-8">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black w-full max-w-sm" data-testid="about-video-container">
              <video
                ref={videoRef}
                className="w-full h-auto aspect-[9/16] object-cover"
                autoPlay
                muted
                loop
                playsInline
                data-testid="about-video"
              >
                <source src="/videos/implant.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                    data-testid="video-play-btn"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  
                  {/* Mute/Unmute Button */}
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                    data-testid="video-mute-btn"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Implantology Training Matters */}
      <section 
        id="why-matters"
        data-animate
        className={`py-20 md:py-28 bg-surface transition-all duration-700 ${isVisible['why-matters'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        data-testid="why-matters-section"
      >
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-charcoal">
              Why Implantology Training Matters
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Dental implants represent one of the fastest-growing areas of modern dentistry. 
              However, many dentists continue to refer implant cases to specialists due to 
              lack of formal training.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {whyMatters.map((item, index) => (
              <div key={index} className="bg-background p-8 rounded-lg border border-border text-center" data-testid={`why-card-${index}`}>
                <h3 className="font-heading font-semibold text-lg mb-3 text-charcoal">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Gallery Section */}
      <section 
        id="training-gallery"
        data-animate
        className={`py-20 md:py-28 transition-all duration-700 ${isVisible['training-gallery'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        data-testid="training-gallery-section"
      >
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-charcoal">
              Training in Action
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Experience our hands-on approach to implantology education with expert-led sessions 
              and practical workshops.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div 
                key={num} 
                className="relative aspect-square overflow-hidden rounded-xl group cursor-pointer"
                data-testid={`gallery-image-${num}`}
              >
                <img 
                  src={`/images/gallery/training-${num}.png`}
                  alt={`Training session ${num}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programme Highlights */}
      <section 
        id="highlights"
        data-animate
        className={`py-20 md:py-28 transition-all duration-700 ${isVisible['highlights'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        data-testid="highlights-section"
      >
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4 text-charcoal">
            Programme Highlights
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            A comprehensive programme designed to transform your clinical practice.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {highlights.map((item, index) => (
              <div key={index} className="group p-8 rounded-lg border border-border hover:border-gold/50 transition-all duration-300" data-testid={`highlight-card-${index}`}>
                <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-5 group-hover:bg-gold/20 transition-colors">
                  <item.icon className="text-gold" size={24} />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-3 text-charcoal">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty Section */}
      <section 
        id="faculty"
        data-animate
        className={`py-20 md:py-28 bg-surface transition-all duration-700 ${isVisible['faculty'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        data-testid="faculty-section"
      >
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4 text-charcoal">
            Meet Our Faculty
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Learn from internationally experienced clinicians and business strategists.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {faculty.map((member, index) => (
              <div key={index} className="bg-background p-8 rounded-lg border border-border text-center" data-testid={`faculty-card-${index}`}>
                <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-5">
                  <span className="font-heading text-2xl font-bold text-gold">{member.initials}</span>
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2 text-charcoal">{member.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/faculty">
              <Button variant="outline" className="border-2 border-gold text-gold font-heading font-semibold hover:bg-gold hover:text-charcoal h-10 px-4">
                View All Faculty
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Intakes */}
      <section 
        id="intakes"
        data-animate
        className={`py-20 md:py-28 transition-all duration-700 ${isVisible['intakes'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        data-testid="intakes-section"
      >
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-charcoal">
            Upcoming Intakes
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {intakes.map((intake, index) => (
              <div key={index} className="p-8 rounded-lg border-2 border-gold/30 bg-gold/5 text-center" data-testid={`intake-card-${index}`}>
                <Calendar className="text-gold mx-auto mb-4" size={32} />
                <h3 className="font-heading font-bold text-xl mb-2 text-charcoal">{intake.title}</h3>
                <p className="text-sm text-muted-foreground mb-1">{intake.deadline}</p>
                <p className="text-xs text-muted-foreground">{intake.cohort}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/admissions" data-testid="intakes-apply-btn">
              <Button className="bg-gold text-charcoal font-heading font-semibold hover:bg-gold-dark h-11 px-8">
                Apply Now
                <ArrowRight className="ml-2" size={16} />
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

export default HomePage;
