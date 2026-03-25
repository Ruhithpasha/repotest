import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Building2, CheckCircle, Loader2, Monitor, Users, Stethoscope, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";
import axios from "axios";
import { API } from "@/App";

// Academy images - each used only once
const academyImages = {
  featured: "/images/academy/training-1.jpg",  // Dental scanning - Featured section
  gallery: [
    { src: "/images/academy/training-2.jpg", alt: "Classroom training session" },
    { src: "/images/academy/training-3.jpg", alt: "Group learning environment" },
    { src: "/images/academy/training-5.jpg", alt: "Professional presentation" },
  ],
  facilities: [
    { src: "/images/academy/facility-1.jpg", alt: "Modern reception area" },
    { src: "/images/academy/facility-2.jpg", alt: "Comfortable waiting lounge" },
    { src: "/images/academy/facility-3.jpg", alt: "Clinical training room" },
    { src: "/images/academy/facility-4.jpg", alt: "State-of-the-art dental suite" },
  ]
};

// Default content
const defaultContent = {
  page_title: "Our Training Academy",
  page_subtitle: "State-of-the-art facilities for hands-on clinical training",
  description: "Experience world-class dental implant training at our purpose-built training academy. Our facilities are equipped with the latest technology and designed to provide an immersive, hands-on learning experience for dentists at all stages of their implant journey.",
  cta_button: "Book a Tour",
  cta_url: "/contact"
};

const TrainingAcademyPage = () => {
  const [content, setContent] = useState(defaultContent);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/academy`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          setContent({ ...defaultContent, ...response.data.content });
        }
      } catch (error) {
        console.log('Using default content');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const features = [
    {
      icon: Monitor,
      title: "Digital Workflow",
      description: "Master CBCT interpretation, digital scanning, and treatment planning with cutting-edge technology"
    },
    {
      icon: Stethoscope,
      title: "Hands-On Practice",
      description: "Real clinical experience with phantom heads and simulation models before live patient work"
    },
    {
      icon: Users,
      title: "Small Group Learning",
      description: "Intimate class sizes ensure personalised attention and mentorship from expert faculty"
    },
    {
      icon: Award,
      title: "Expert Guidance",
      description: "One-on-one mentoring from internationally recognised implant clinicians"
    }
  ];

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#d4a04a]" size={32} />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="academy-hero">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <Building2 size={16} />
              Training Facilities
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              Our Training<br />
              <span className="text-[#d4a04a]">Academy</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8 max-w-2xl">
              {content.page_subtitle}
            </p>
            <Link to={content.cta_url || "/contact"}>
              <Button className="bg-[#d4a04a] text-[#0d1117] font-heading font-semibold hover:bg-[#c4903a] h-11 px-8">
                {content.cta_button}
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Image Section */}
      <section className="py-20 bg-white" data-testid="academy-featured">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#0d1117] mb-6">
                World-Class Training Environment
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {content.description}
              </p>
              <ul className="space-y-4">
                {["Latest dental implant systems and surgical equipment", "Realistic phantom head training stations", "Digital workflow and CBCT interpretation labs", "Comfortable learning spaces designed for focus"].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="text-[#d4a04a] mt-1 flex-shrink-0" size={20} />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={academyImages.featured} 
                  alt="Digital dental scanning training"
                  className="w-full h-auto object-cover max-h-[500px]"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-[#d4a04a]/10 rounded-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50" data-testid="academy-features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#0d1117] mb-4">
              Why Train With Us
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our purpose-built facilities provide everything you need for a comprehensive implant education
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-slate-100 hover:border-[#d4a04a]/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-[#d4a04a]/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="text-[#d4a04a]" size={24} />
                </div>
                <h3 className="font-heading font-semibold text-lg text-[#0d1117] mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 bg-white" data-testid="academy-gallery">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#0d1117] mb-4">
              Inside Our Academy
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Take a look at our state-of-the-art training facilities
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {academyImages.gallery.map((image, index) => (
              <div 
                key={index}
                className="rounded-2xl overflow-hidden cursor-pointer group aspect-[4/3]"
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
      </section>

      {/* Location Section */}
      <section className="py-20 bg-white" data-testid="academy-location">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[#d4a04a] font-medium mb-4">
                <MapPin size={20} />
                Our Location
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0d1117] mb-6">
                Rochester, United Kingdom
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Our training academy is conveniently located in Rochester, Kent, with excellent transport links from London and surrounding areas. The historic town offers a welcoming environment for focused learning.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/contact">
                  <Button className="bg-[#d4a04a] hover:bg-[#c4903a] text-[#0d1117] font-semibold px-6">
                    Book a Tour
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="border-slate-200 text-slate-700 font-semibold px-6">
                    Get Directions
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl bg-slate-100 aspect-[4/3]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d79456.56521988574!2d0.4269177!3d51.3887!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8cd09a6f1a0a9%3A0x9f4e8c5c9c4c0c0!2sRochester%2C%20UK!5e0!3m2!1sen!2suk!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Training Academy Location"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0d1117]" data-testid="academy-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to See Our Facilities?
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Schedule a visit to our training academy and experience our world-class facilities firsthand.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button className="bg-[#d4a04a] hover:bg-[#c4903a] text-[#0d1117] font-semibold h-12 px-8">
                Book a Tour
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link to="/admissions">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold h-12 px-8">
                Apply for Programme
              </Button>
            </Link>
          </div>
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

export default TrainingAcademyPage;
