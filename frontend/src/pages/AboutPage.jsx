import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Award, 
  ArrowRight,
  Globe,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";
import axios from "axios";
import { API } from "@/App";

// Default content
const defaultContent = {
  page_title: "About Plan4Growth Academy",
  page_subtitle: "A UK professional education centre dedicated to developing advanced clinical and business skills for dental professionals.",
  intro: "Plan4Growth Academy is an EduQual-approved centre delivering Level 7 diploma programmes. EduQual is a regulated awarding body approved by Qualifications Scotland Accreditation, ensuring internationally recognised academic standards and robust quality assurance.",
  mission_title: "Our Mission",
  mission_description: "Our mission is to bridge the gap between theoretical knowledge and practical clinical competence, enabling dentists to confidently expand their clinical services and build thriving practices.",
  values: [
    { title: "Clinical Excellence", description: "We are committed to the highest standards of clinical education and practice." },
    { title: "Practical Learning", description: "Hands-on training that translates directly to real clinical practice." },
    { title: "Professional Growth", description: "Supporting dentists in building successful, fulfilling careers." },
    { title: "Quality Assurance", description: "Internationally recognised standards through EduQual accreditation." }
  ],
  team_title: "Meet Our Faculty",
  show_team: true
};

const defaultFaculty = [
  {
    initials: "DGM",
    name: "Dr Gaurav Mehta",
    role: "Programme Director",
    bio: "Implant dentist and multi-practice owner with extensive experience in implant systems, clinical workflow design, and building profitable dental practices."
  },
  {
    initials: "NR",
    name: "Nadia Reinolds",
    role: "Business Strategist",
    bio: "Business strategist specialising in dental practice growth, team development, and operational systems for modern clinics."
  },
  {
    initials: "PL",
    name: "Pedro Laranjeira",
    role: "Clinical Director",
    bio: "Award-winning implantologist with over 15 years of experience in full-arch rehabilitation, grafting procedures, and immediate loading protocols."
  },
  {
    initials: "SM",
    name: "Dr Sarah Mitchell",
    role: "Academic Lead",
    bio: "Specialist in complex implant cases and academic curriculum development. Published researcher with extensive teaching experience."
  }
];

const AboutPage = () => {
  const [content, setContent] = useState(defaultContent);
  const [faculty] = useState(defaultFaculty);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/about`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          setContent({ ...defaultContent, ...response.data.content });
        }
      } catch (error) {
        console.log('Using default about content');
      }
    };
    fetchContent();
  }, []);

  const values = content.values || defaultContent.values;

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="about-hero">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <Award size={16} />
              About Us
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              About Plan<span className="text-[#d4a04a]">4</span>Growth<br />
              <span className="text-[#d4a04a]">Academy</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
              {content.page_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-20 bg-white" data-testid="about-content">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none">
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              {content.intro}
            </p>
            {content.mission_description && (
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                {content.mission_description}
              </p>
            )}
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-slate-50 p-6 rounded-xl"
                data-testid={`value-${index}`}
              >
                <h3 className="font-heading text-lg text-slate-900 mb-2">{value.title}</h3>
                <p className="text-slate-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditation */}
      <section className="py-20 bg-slate-50" data-testid="accreditation">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900 mb-6">
              Accreditation & Recognition
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Our programmes are accredited by EduQual, a UK-regulated awarding organisation 
              ensuring internationally recognised standards.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <Award className="mx-auto text-amber-500 mb-4" size={48} />
              <h3 className="font-heading text-xl text-slate-900 mb-3">EduQual Accredited</h3>
              <p className="text-slate-600 text-sm">
                UK-regulated awarding body ensuring quality and standards
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <Globe className="mx-auto text-amber-500 mb-4" size={48} />
              <h3 className="font-heading text-xl text-slate-900 mb-3">Globally Recognised</h3>
              <p className="text-slate-600 text-sm">
                Qualification accepted internationally for professional advancement
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <Users className="mx-auto text-amber-500 mb-4" size={48} />
              <h3 className="font-heading text-xl text-slate-900 mb-3">Industry Aligned</h3>
              <p className="text-slate-600 text-sm">
                Curriculum developed with input from leading dental professionals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty */}
      <section className="py-20 bg-white" data-testid="faculty">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900 mb-6">
              Meet Our Faculty
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Learn from internationally experienced clinicians and business strategists.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {faculty.map((member, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-2xl border border-slate-200 text-center"
                data-testid={`faculty-${index}`}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">{member.initials}</span>
                </div>
                <h3 className="font-heading text-lg text-slate-900 mb-1">{member.name}</h3>
                <p className="text-amber-600 text-sm font-medium mb-3">{member.role}</p>
                <p className="text-slate-600 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-900" data-testid="about-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-white mb-6">
            Ready to Join Our Community?
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Become part of a growing network of dental professionals advancing 
            their careers with UK-accredited qualifications.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/apply" data-testid="about-apply-btn">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-lg">
                Apply Now
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-8 py-3 rounded-lg">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AboutPage;
