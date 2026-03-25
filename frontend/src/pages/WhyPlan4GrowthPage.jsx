import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Link } from "react-router-dom";
import { ArrowRight, Award, BookOpen, Users, UserCheck, Stethoscope, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";

// Facility images
const facilityImages = [
  { src: "/images/academy/facility-1.jpg", alt: "Modern reception area" },
  { src: "/images/academy/facility-2.jpg", alt: "Comfortable waiting lounge" },
  { src: "/images/academy/facility-3.jpg", alt: "Clinical training room" },
  { src: "/images/academy/facility-4.jpg", alt: "State-of-the-art dental suite" },
];

const defaultReasons = [
  { icon: Award, title: "UK Accredited Diploma", description: "Level 7 qualification approved by EduQual and recognised internationally, ensuring credibility and professional standing." },
  { icon: BookOpen, title: "Structured Implantology Curriculum", description: "Eight comprehensive modules taking you from foundations through to advanced treatment planning and practice growth." },
  { icon: Users, title: "International Faculty", description: "Learn from clinicians with decades of experience across multiple countries and implant systems." },
  { icon: Stethoscope, title: "Clinical Mentorship", description: "Personalised guidance from experienced implantologists throughout your learning journey." },
  { icon: UserCheck, title: "Small Cohort Learning", description: "Maximum 30 participants per intake ensures focused attention and meaningful mentorship." },
  { icon: TrendingUp, title: "Professional Career Advancement", description: "Expand your clinical offerings, increase practice revenue, and build a sustainable implant practice." }
];

const iconMap = [Award, BookOpen, Users, Stethoscope, UserCheck, TrendingUp];

const WhyPlan4GrowthPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [reasons, setReasons] = useState(defaultReasons);

  useEffect(() => {
    axios.get(`${API}/website-settings/home`)
      .then(res => {
        const cards = res.data?.content?.why_cards;
        if (cards && cards.length > 0) {
          setReasons(cards.map((c, i) => ({
            icon: iconMap[i] || Award,
            title: c.title || defaultReasons[i]?.title,
            description: c.description || defaultReasons[i]?.description
          })));
        }
      })
      .catch(() => {}); // keep defaults on error
  }, []);

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="why-hero">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <Award size={16} />
              Why Choose Us
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              Why Study With<br />
              <span className="text-[#d4a04a]">Plan4Growth</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
              Discover why dentists across the world choose Plan4Growth Academy 
              for their implantology training.
            </p>
          </div>
        </div>
      </section>

      {/* Reasons Grid */}
      <section className="py-20 bg-slate-50" data-testid="why-reasons">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#0d1117] mb-4">
              What Sets Us Apart
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our comprehensive approach to implant education
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {reasons.map((reason, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-xl border border-slate-100 hover:border-[#d4a04a]/40 hover:shadow-lg transition-all"
                data-testid={`reason-${index}`}
              >
                <div className="w-12 h-12 rounded-lg bg-[#d4a04a]/10 flex items-center justify-center mb-4">
                  <reason.icon className="text-[#d4a04a]" size={24} />
                </div>
                <h3 className="font-heading font-semibold text-lg text-[#0d1117] mb-2">{reason.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{reason.description}</p>
              </div>
            ))}
          </div>

          {/* Facility Images */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-heading font-bold text-[#0d1117] mb-2">
                Our Facilities
              </h3>
              <p className="text-slate-600">
                World-class training environment designed for excellence
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {facilityImages.map((image, index) => (
                <div 
                  key={index}
                  className="rounded-xl overflow-hidden cursor-pointer group aspect-square"
                  onClick={() => setSelectedImage(image)}
                >
                  <img 
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0d1117]" data-testid="why-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Join dentists from around the world who have transformed their practice with Plan4Growth.
          </p>
          <Link to="/admissions" data-testid="why-apply-btn">
            <Button className="bg-[#d4a04a] text-[#0d1117] font-heading font-semibold hover:bg-[#c4903a] h-12 px-10">
              Apply Now
              <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-5xl w-full">
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

export default WhyPlan4GrowthPage;
