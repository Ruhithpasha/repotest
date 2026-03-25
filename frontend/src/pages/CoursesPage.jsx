import { Link } from "react-router-dom";
import { 
  Award, 
  GraduationCap,
  ArrowRight,
  Users,
  CheckCircle,
  Calendar,
  Stethoscope,
  BookOpen,
  Globe,
  MapPin,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";

const CoursesPage = () => {
  const mainCourse = {
    title: "Level 7 Diploma in Dental Implantology",
    badge: "EduQual Certified",
    originalPrice: "£9,997",
    discountedPrice: "£6,250",
    description: "The Level 7 Diploma in Dental Implantology is a comprehensive implant training programme designed to support dentists in developing the clinical knowledge, surgical confidence, and structured workflow required to introduce dental implants safely into practice.",
    longDescription: "Certified by EduQual, this postgraduate-level qualification combines theoretical learning, digital workflow training, clinical mentorship, and hands-on implant placement, providing a clear pathway into implant dentistry. The programme is designed to bridge the gap between implant theory and real clinical practice, supporting dentists through a structured and supportive learning journey.",
    highlights: [
      {
        icon: BookOpen,
        title: "Comprehensive Curriculum",
        description: "Eight academic modules covering everything from implant diagnosis to complication management"
      },
      {
        icon: Stethoscope,
        title: "Hands-On Clinical Experience",
        description: "Place five dental implants on real patients in the UK under mentor supervision"
      },
      {
        icon: Users,
        title: "Expert Mentorship",
        description: "Guidance from experienced implant clinicians throughout your learning journey"
      },
      {
        icon: Globe,
        title: "International Placement Option",
        description: "Upgrade to place up to 15 additional implants abroad in a structured clinical environment"
      }
    ],
    curriculum: [
      "Implant diagnosis and case selection",
      "Treatment planning and risk assessment",
      "CBCT interpretation and digital workflow",
      "Surgical protocols for implant placement",
      "Guided and freehand implant surgery",
      "Soft tissue management principles",
      "Restorative implant workflow",
      "Implant maintenance and complication management",
      "Patient communication and consent",
      "Clinical governance and safety in implant dentistry"
    ],
    whoIsItFor: [
      "Dentists beginning their implant journey",
      "Clinicians wanting structured implant training",
      "Dentists looking to introduce implants into practice",
      "Clinicians seeking mentorship and clinical support",
      "Dentists wanting a recognised postgraduate qualification"
    ]
  };

  const upcomingCourses = [
    {
      title: "Practice Freedom Formula",
      type: "12-Month Mentorship",
      description: "Build a profitable, systemised dental practice"
    },
    {
      title: "Full Arch Implant Surgery",
      type: "Advanced Clinical",
      description: "Master full-mouth rehabilitation techniques"
    },
    {
      title: "Practice Blueprint Day",
      type: "1-Day Intensive",
      description: "Strategic planning for practice growth"
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-20" data-testid="courses-hero">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#d4a04a] rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-[#d4a04a] rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/20 text-[#d4a04a] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <GraduationCap size={16} />
              Professional Development
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              Our Training<br />
              <span className="text-[#d4a04a]">Programmes</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed">
              Elevate your dental career with our flagship programme designed by industry experts. 
              Practical skills, real-world knowledge, and ongoing support.
            </p>
          </div>
        </div>
      </section>

      {/* Main Course Section */}
      <section className="py-20 bg-white" data-testid="main-course">
        <div className="max-w-7xl mx-auto px-6">
          {/* Course Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/10 text-[#d4a04a] px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Award size={16} />
              {mainCourse.badge}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#0d1117] mb-6">
              {mainCourse.title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
              {mainCourse.description}
            </p>
          </div>

          {/* Course Highlights */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {mainCourse.highlights.map((item, index) => (
              <div 
                key={index}
                className="bg-slate-50 p-6 rounded-xl border border-slate-100 hover:border-[#d4a04a]/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-[#d4a04a]/10 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="text-[#d4a04a]" size={24} />
                </div>
                <h3 className="font-heading font-semibold text-[#0d1117] mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Left Column - Curriculum */}
            <div className="lg:col-span-2 space-y-12">
              {/* Programme Overview */}
              <div>
                <h3 className="text-2xl font-heading font-bold text-[#0d1117] mb-4">Programme Overview</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {mainCourse.longDescription}
                </p>
              </div>

              {/* What You'll Learn */}
              <div>
                <h3 className="text-2xl font-heading font-bold text-[#0d1117] mb-6">What You'll Learn</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {mainCourse.curriculum.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle size={18} className="text-[#d4a04a] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who Is It For */}
              <div>
                <h3 className="text-2xl font-heading font-bold text-[#0d1117] mb-6">Who Is This Programme For?</h3>
                <div className="space-y-3">
                  {mainCourse.whoIsItFor.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-[#d4a04a] rounded-full"></div>
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sticky Card */}
            <div className="lg:col-span-1">
              <div className="bg-[#0d1117] rounded-2xl p-8 sticky top-28">
                <h3 className="text-xl font-heading font-bold text-white mb-6">Programme Details</h3>
                
                <div className="space-y-5 mb-8">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white/60">
                      <Award size={16} />
                      <span className="text-sm">Accreditation</span>
                    </div>
                    <span className="font-semibold text-white">EduQual (UK)</span>
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white/60">
                      <MapPin size={16} />
                      <span className="text-sm">Location</span>
                    </div>
                    <span className="font-semibold text-white">Online + UK</span>
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white/60">
                      <Users size={16} />
                      <span className="text-sm">Cohort Size</span>
                    </div>
                    <span className="font-semibold text-white">Max 30</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-6">
                  <p className="text-sm text-white/60 mb-2">Course Fee</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg text-white/40 line-through">{mainCourse.originalPrice}</span>
                    <span className="text-3xl font-bold text-[#d4a04a]">{mainCourse.discountedPrice}</span>
                  </div>
                </div>

                <Link to="/contact" className="block" data-testid="contact-btn">
                  <Button className="w-full bg-[#d4a04a] hover:bg-[#c4903a] text-[#0d1117] font-semibold h-12">
                    Contact Us
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                
                <p className="text-center text-white/50 text-xs mt-4">
                  Speak with our admissions team for guidance
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 bg-slate-50" data-testid="coming-soon">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#0d1117] text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles size={16} className="text-[#d4a04a]" />
              Coming Soon
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#0d1117] mb-4">
              New Courses Coming Soon
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We're developing more programmes to help you advance your dental career. 
              Register your interest to be notified when they launch.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {upcomingCourses.map((course, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-xl border border-slate-200 border-dashed hover:border-[#d4a04a]/50 transition-all"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar size={20} className="text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-[#d4a04a] uppercase tracking-wider">{course.type}</span>
                <h3 className="font-heading font-semibold text-[#0d1117] mt-2 mb-2">{course.title}</h3>
                <p className="text-sm text-slate-500">{course.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/contact">
              <Button variant="outline" className="border-[#0d1117] text-[#0d1117] hover:bg-[#0d1117] hover:text-white">
                Register Your Interest
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0d1117]" data-testid="courses-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
            Take the first step towards becoming a confident implant practitioner. 
            Our admissions team is here to guide you.
          </p>
          <Link to="/contact" data-testid="cta-contact-btn">
            <Button className="bg-[#d4a04a] text-[#0d1117] font-heading font-semibold hover:bg-[#c4903a] h-12 px-10 text-base">
              Contact Us Today
              <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
};

export default CoursesPage;
