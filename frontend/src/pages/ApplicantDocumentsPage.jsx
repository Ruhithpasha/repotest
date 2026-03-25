import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import ApplicantDocumentUpload from '@/components/ApplicantDocumentUpload';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ApplicantDocumentsPage = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Get token from URL or localStorage
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem('application_token');
    
    if (urlToken) {
      setToken(urlToken);
      // Store for future visits
      localStorage.setItem('application_token', urlToken);
    } else if (storedToken) {
      setToken(storedToken);
    }
  }, [searchParams]);

  if (!token) {
    return (
      <PublicLayout>
        <section className="pt-32 pb-20 min-h-screen bg-slate-50">
          <div className="max-w-xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h1 className="font-heading text-2xl text-slate-900 mb-4">
                Application Token Required
              </h1>
              <p className="text-slate-600 mb-6">
                To upload your documents, you need a valid application token. 
                This token was provided to you after submitting your application.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                If you've lost your token, please contact our admissions team at{' '}
                <a href="mailto:admissions@plan4growth.uk" className="text-amber-600 hover:underline">
                  admissions@plan4growth.uk
                </a>
              </p>
              <Link to="/apply">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Applications
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="pt-32 pb-20 min-h-screen bg-slate-50" data-testid="applicant-documents-page">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-8">
            <Link to="/apply" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Applications
            </Link>
            <h1 className="font-heading text-3xl md:text-4xl text-slate-900">
              Complete Your Application
            </h1>
            <p className="text-slate-600 mt-2">
              Upload the required documents to proceed with your application.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
            <ApplicantDocumentUpload token={token} />
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>
              Need help? Contact us at{' '}
              <a href="mailto:admissions@plan4growth.uk" className="text-amber-600 hover:underline">
                admissions@plan4growth.uk
              </a>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ApplicantDocumentsPage;
