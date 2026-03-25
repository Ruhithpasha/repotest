import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";
import axios from "axios";
import { API } from "@/App";

const defaultFaculty = [
  {
    image: "/images/gaurav.jpg",
    name: "Dr Gaurav Mehta",
    title: "Implant Dentist & Multi-Practice Owner",
    bio: `Dr. Gaurav Mehta is an experienced implant dentist and multi-practice owner with a strong background in sales, leadership, and building highly profitable dental systems. Over the years, he has successfully scaled multiple dental clinics in the UK to seven-figure businesses through strategic growth, effective leadership, and streamlined operational systems.

Passionate about helping other dentists succeed, Dr. Mehta mentors clinicians to transition from thinking like employees to thinking like CEOs. His approach focuses on developing strong leadership skills, implementing efficient systems, and building profitable, well-run dental practices that can grow sustainably.`
  },
  {
    image: "/images/nadia.jpg",
    name: "Nadia Reinolds",
    title: "Practice Owner & Strategic Growth Advisor",
    bio: `Nadia Reinolds is a practice owner and strategic growth advisor with extensive experience in transforming underperforming dental practices into structured, efficient, and highly profitable businesses. With a strong background in dental business development, she specialises in marketing strategy, operational systems, and building high-performing teams within modern dental practices.

Through her work with dental clinics, Nadia has helped implement clear operational frameworks that improve patient experience, streamline workflows, and drive sustainable growth. She is particularly passionate about developing strong team cultures, empowering staff, and helping practice owners build businesses that run smoothly without constant stress or chaos.

Nadia works closely with dental professionals to implement practical strategies that increase profitability while maintaining a strong focus on patient care and long-term business stability. Her approach combines marketing expertise, operational clarity, and leadership development.`
  },
  {
    image: "/images/pedro.png",
    name: "Dr Pedro Laranjeira",
    title: "Award-Winning Implantologist",
    bio: `Dr. Pedro Laranjeira is an award-winning implantologist with over 15 years of clinical experience, specialising in full-arch rehabilitation, bone grafting, and immediate loading protocols. His work in complex implant cases has been recognised internationally, including winning the Implant: Complex Category at the Clinical Dentistry Awards.

He has also been a finalist at the Aesthetic Dentistry Awards in categories such as Full Mouth Rehabilitation and Ceramic Smile Makeover, reflecting his strong background in prosthodontics and aesthetic dentistry.

Before relocating to the UK, Dr. Laranjeira spent over a decade practising in Portugal, focusing on aesthetic dentistry, implant dentistry, and oral rehabilitation. Alongside his clinical work, he has delivered lectures and hands-on training in implant dentistry for Nobel Biocare, sharing his expertise with clinicians looking to advance their implant skills.`
  },
  {
    image: "/images/nicolas.png",
    name: "Dr Nicolas Montagnat-Rentier",
    title: "Implant Surgeon & Restorative Dentist",
    bio: `Dr. Nicolas Montagnat-Rentier is an experienced Implant Surgeon and Restorative Dentist with specialised training in Prosthodontics and Implantology from the UCL Eastman Dental Institute. He is recognised for his expertise in full-mouth rehabilitation, comprehensive treatment planning, and occlusion-driven restorative care.

Dr. Montagnat-Rentier combines meticulous technical precision with advanced surgical techniques and modern digital workflows to deliver highly predictable clinical outcomes. His approach focuses on integrating implant surgery, restorative dentistry, and occlusion to achieve long-term functional and aesthetic results for complex cases.`
  },
  {
    image: "/images/rami.png",
    name: "Dr Rami Daoui",
    title: "Implantologist & Full-Mouth Rehabilitation Specialist",
    bio: `Dr. Rami Daoui is an implantologist with extensive experience in dental implants, full-mouth rehabilitation, and bone grafting. He qualified with a Diplôme de Docteur en Chirurgie Dentaire from Saint Joseph University of Beirut in 2015, with a clinical focus on implant dentistry.

Registered under Section 15(1)(c) of the Dentists Act 1984 in the UK, Dr. Daoui is recognised for his commitment to high standards of clinical practice and advanced implant treatments. His work focuses on implant rehabilitation and comprehensive treatment planning for patients requiring complex restorative solutions.

Dr. Daoui is also multilingual, speaking English, Arabic, and French, allowing him to communicate effectively with a diverse patient base while delivering high-quality implant care.`
  },
  {
    image: "/images/mihai.jpeg",
    name: "Dr Mihai Cotenescu",
    title: "Senior Implantologist & International Lecturer",
    bio: `Dr. Mihai Cotenescu is an experienced implantologist with over 20 years of clinical experience in oral implantology and restorative dentistry. He graduated as a Doctor of Medicine in Dentistry (DMD) from the University of Bucharest in 2003 and later completed a Master's Degree in Advanced and Specialist Healthcare (MSc) at the University of Kent.

Throughout his career, Dr. Cotenescu has worked across several dental practices as a visiting implantologist, including his own clinic, focusing on complex implant treatments such as full-arch rehabilitations using All-on-X surgical protocols, alongside advanced restorative dentistry.

He is actively involved in mentoring and teaching dentists, having been formally approved as a CADI mentor in 2016, and frequently lectures internationally on modern techniques and developments in implant dentistry. Dr. Cotenescu is also an Associate Fellow of the College of General Dentistry (UK) and speaks several languages, including English, Romanian, German, and Swedish.`
  }
];

const defaultContent = {
  page_title: "Meet Our Faculty",
  page_subtitle: "Our faculty are internationally recognised clinicians, surgeons, and business strategists who bring real-world expertise to every session."
};

const PREVIEW_LENGTH = 180;

const FacultyCard = ({ member }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = member.bio.length > PREVIEW_LENGTH;
  const displayBio = expanded || !isLong
    ? member.bio
    : member.bio.slice(0, PREVIEW_LENGTH).trimEnd() + '...';

  return (
    <div className="bg-white rounded-2xl border border-border hover:border-gold/40 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="w-full aspect-[4/3] bg-gold/5 overflow-hidden">
        <img
          src={member.image}
          alt={member.name}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `
              <div class="w-full h-full flex items-center justify-center bg-gold/10">
                <span class="font-heading text-3xl font-bold text-gold">
                  ${member.name.split(' ').map(n => n[0]).join('').slice(0, 3)}
                </span>
              </div>`;
          }}
        />
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-heading font-bold text-lg text-charcoal mb-1">
          {member.name}
        </h3>
        <p className="text-xs font-medium text-gold uppercase tracking-wide mb-4">
          {member.title}
        </p>

        {/* Bio with whitespace preserved */}
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line flex-1">
          {displayBio}
        </p>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-gold hover:text-gold/80 transition-colors self-start"
          >
            {expanded ? (
              <>Read Less <ChevronUp size={15} /></>
            ) : (
              <>Read More <ChevronDown size={15} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const FacultyPage = () => {
  const [content, setContent] = useState(defaultContent);
  const [faculty, setFaculty] = useState(defaultFaculty);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/faculty`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          const data = response.data.content;
          setContent({ ...defaultContent, ...data });
          // If members exist in CMS, use them; otherwise keep defaults
          if (data.members && data.members.length > 0) {
            setFaculty(data.members.filter(m => m.is_active !== false));
          }
        }
      } catch (error) {
        console.log('Using default faculty content');
      }
    };
    fetchContent();
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="faculty-hero">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              Meet Your Mentors
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              Learn From the Best in<br />
              <span className="text-[#d4a04a]">Implant Dentistry</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
              {content.page_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Faculty Grid */}
      <section className="py-20 md:py-28 bg-surface" data-testid="faculty-grid">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {faculty.map((member, index) => (
              <FacultyCard key={index} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-charcoal" data-testid="faculty-cta">
        <div className="container text-center">
          <h2 className="font-heading text-3xl font-bold text-white mb-4">
            Ready to Learn From Our Mentors?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Apply now to secure your place on the Level 7 Diploma in Dental Implantology.
          </p>
          <Link to="/admissions" data-testid="faculty-apply-btn">
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

export default FacultyPage;
