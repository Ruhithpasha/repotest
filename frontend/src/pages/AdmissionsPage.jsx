import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  FileText, 
  ArrowRight,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/layout/PublicLayout";
import axios from "axios";
import { API } from "@/App";

// Default content
const defaultContent = {
  page_title: "Admissions",
  page_subtitle: "Everything you need to know about applying to the Level 7 Diploma in Dental Implantology.",
  requirements: [
    { text: "Hold a BDS or equivalent dental qualification" },
    { text: "Be registered with a recognised dental council" },
    { text: "Have studied dentistry in English medium" },
    { text: "Be actively practising dentistry" }
  ],
  process_steps: [
    { title: "Submit application form" },
    { title: "Upload required documents" },
    { title: "Eligibility screening" },
    { title: "Interview with programme mentor" },
    { title: "Offer letter issued" },
    { title: "Deposit payment" },
    { title: "Enrolment confirmation" }
  ],
  intakes: [
    { name: "June 2026", deadline: "15 May 2026", is_active: true },
    { name: "January 2027", deadline: "15 December 2026", is_active: true }
  ],
  consult_button: "Book a Consultation",
  consult_url: "/contact",
  apply_button: "Apply Now",
  apply_url: "/register"
};

const AdmissionsPage = () => {
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/website-settings/admissions`);
        if (response.data.content && Object.keys(response.data.content).length > 0) {
          setContent({ ...defaultContent, ...response.data.content });
        }
      } catch (error) {
        console.log('Using default admissions content');
      }
    };
    fetchContent();
  }, []);

  const entryRequirements = content.requirements || defaultContent.requirements;
  const applicationSteps = content.process_steps || defaultContent.process_steps;
  const intakes = (content.intakes || defaultContent.intakes).filter(i => i.is_active !== false);

  const requiredDocuments = [
    "Degree certificate",
    "Dental council registration",
    "10th and 12th marksheets",
    "Passport copy",
    "Curriculum vitae"
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-[#0d1117] pt-32 pb-24 overflow-hidden" data-testid="admissions-hero">
        {/* Background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a1f2e] rounded-full opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1f2e] rounded-full opacity-40 translate-x-1/4 translate-y-1/4"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#d4a04a]/15 border border-[#d4a04a]/30 text-[#d4a04a] px-4 py-2 rounded-md text-sm font-medium mb-8">
              <FileText size={16} />
              Apply Now
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              {content.page_title}<br />
              <span className="text-[#d4a04a]">Process</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
              {content.page_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Entry Requirements */}
      <section className="py-20" data-testid="entry-requirements">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl font-bold text-charcoal mb-8">
              Entry Requirements
            </h2>

            <div className="space-y-4 mb-12">
              {entryRequirements.map((req, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-5 bg-white rounded-xl border border-border"
                  data-testid={`requirement-${index}`}
                >
                  <CheckCircle className="text-gold flex-shrink-0" size={22} />
                  <span className="text-foreground">{req.text || req}</span>
                </div>
              ))}
            </div>

            <h3 className="font-heading text-xl font-semibold text-charcoal mb-6">
              Required Documents
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {requiredDocuments.map((doc, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border border-border"
                  data-testid={`document-${index}`}
                >
                  <FileText className="text-muted-foreground" size={18} />
                  <span className="text-foreground text-sm">{doc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20 bg-surface" data-testid="application-process">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl font-bold text-charcoal mb-8">
              Application Process
            </h2>

            <div className="space-y-0">
              {applicationSteps.map((step, index) => (
                <div 
                  key={index}
                  className="flex gap-5 pb-8 last:pb-0"
                  data-testid={`step-${index + 1}`}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gold text-charcoal font-bold rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                      {index + 1}
                    </div>
                    {index < applicationSteps.length - 1 && (
                      <div className="w-px flex-1 bg-gold/30 mt-2"></div>
                    )}
                  </div>
                  <p className="text-foreground pt-2">Step {index + 1} — {step.title || step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Programme Fee */}
      <section className="py-20" data-testid="programme-fee">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl font-bold text-charcoal mb-8">
              Programme Fee
            </h2>

            <div className="p-8 border-2 border-gold/30 rounded-xl bg-gold/5">
              {/* Early Bird Banner */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-green-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Limited Time Offer — Enrol within 1 month
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-4 mb-1">
                <p className="text-4xl font-heading font-bold text-charcoal">£6,250</p>
                <p className="text-2xl font-heading text-muted-foreground line-through decoration-red-400 decoration-2">£9,997</p>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <p className="text-muted-foreground text-sm">Total programme fee</p>
                <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Save £3,747
                </span>
              </div>
              <div className="space-y-2 text-sm text-foreground">
                <p>• 40% deposit payable upon acceptance of the offer letter</p>
                <p>• Remaining balance within 90 days of confirmation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visa Guidance */}
      <section className="py-20 bg-surface" data-testid="visa-guidance">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl font-bold text-charcoal mb-6">
              Visa Guidance
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              International participants requiring a UK visa for clinical training will 
              receive a support letter from Plan4Growth Academy. The programme team can 
              provide guidance on the visa application process for the UK clinical 
              immersion component.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Please contact us for specific visa queries related to your country of residence.
            </p>
          </div>
        </div>
      </section>

      {/* Intake Dates */}
      <section className="py-20" data-testid="intake-dates">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl font-bold text-charcoal mb-8">
              Intake Dates
            </h2>

            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              {intakes.map((intake, index) => (
                <div 
                  key={index}
                  className="p-8 rounded-xl border-2 border-gold/30 bg-gold/5 text-center"
                  data-testid={`intake-${index}`}
                >
                  <Calendar className="text-gold mx-auto mb-3" size={28} />
                  <h3 className="font-heading font-bold text-xl text-charcoal mb-1">{intake.name || intake.title}</h3>
                  <p className="text-sm text-muted-foreground">Deadline: {intake.deadline}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={content.consult_url || "/contact"}>
                <Button variant="outline" className="border-2 border-gold text-gold font-heading font-semibold hover:bg-gold hover:text-charcoal h-11 px-6">
                  {content.consult_button || "Book a Consultation"}
                </Button>
              </Link>
              <Link to={content.apply_url || "/register"} data-testid="apply-now-btn">
                <Button className="bg-gold text-charcoal font-heading font-semibold hover:bg-gold-dark h-11 px-8">
                  {content.apply_button || "Apply Now"}
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AdmissionsPage;
