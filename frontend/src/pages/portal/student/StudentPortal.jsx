import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Loader2,
  GraduationCap,
  Award,
  BookOpen,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import StudentReferrals from "./StudentReferrals";
import StudentCoursesPage from "./StudentCoursesPage";
import CourseDetailPage from "./CourseDetailPage";
import { getRoleLabel, getRoleColor } from "../../../utils/roleUtils";

// Student Dashboard Overview
const StudentOverview = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState({ payments: [], total_paid_gbp: 0, remaining_gbp: 6250 });
  const [loading, setLoading] = useState(true);
  const [redirectingToCourse, setRedirectingToCourse] = useState(false);
  const navigate = useNavigate();

  // GHL Booking URL - using correct production URL
  const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call';
  const API_URL = API;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [profileRes, docsRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/students/me`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/student-documents/my`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/student-payments/my`, { headers }).catch(() => ({ data: { payments: [], total_paid_gbp: 0, remaining_gbp: 6250 } }))
      ]);

      setProfile(profileRes.data);
      setDocuments(docsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCourse = async () => {
    setRedirectingToCourse(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/sso-redirect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast.error(data.error || 'Failed to redirect to course platform');
        setRedirectingToCourse(false);
      }
    } catch (err) {
      toast.error('Failed to redirect to course platform. Please try again.');
      setRedirectingToCourse(false);
    }
  };

  // Status configuration with labels and colors
  const statusConfig = {
    registered: { label: 'Application Received', color: 'bg-gray-500', message: 'Your application has been received. Please wait while we process your documents.' },
    documents_uploaded: { label: 'Documents Submitted', color: 'bg-blue-500', message: 'Your documents have been uploaded. Awaiting admin verification.' },
    under_review: { label: 'Under Review', color: 'bg-yellow-500', message: 'Your application is being reviewed by our admissions team.' },
    approved: { label: 'Approved', color: 'bg-green-500', message: 'Congratulations! Your application is approved. A booking link will be sent shortly.' },
    call_booking_sent: { label: 'Book Your Interview', color: 'bg-purple-500', message: 'Your application has been approved! Please book your interview call to proceed.' },
    call_booked: { label: 'Interview Scheduled', color: 'bg-indigo-500', message: 'Your interview call is scheduled. Check your email for the Zoom link.' },
    interview_completed: { label: 'Interview Completed', color: 'bg-teal-500', message: 'Thank you for attending your interview. Our team is reviewing your performance.' },
    qualified: { label: 'Qualified - Payment Required', color: 'bg-purple-600', message: 'Congratulations! You\'ve passed your interview. Complete your payment to secure your place.' },
    payment_pending: { label: 'Payment Pending', color: 'bg-orange-500', message: 'Please complete your payment to finalize enrollment.' },
    paid_in_full: { label: 'Paid', color: 'bg-green-600', message: 'Payment received. Your enrollment is being processed.' },
    enrolled: { label: 'Enrolled', color: 'bg-green-700', message: 'Welcome to Plan4Growth Academy! You are now enrolled.' },
    rejected: { label: 'Not Successful', color: 'bg-red-500', message: 'Unfortunately, your application was not approved. Please contact us if you have any questions.' },
  };

  const getStatusInfo = (status) => {
    return statusConfig[status] || statusConfig.registered;
  };

  // Timeline progress mapping for 6 steps
  const getTimelineProgress = (status) => {
    // Applied → always green
    const applied = true;
    // Verified → green if documents_uploaded, under_review, approved, or any later status
    const verified = ['documents_uploaded', 'under_review', 'approved', 'call_booking_sent', 'call_booked', 'interview_completed', 'qualified', 'payment_pending', 'paid_in_full', 'enrolled'].includes(status);
    // Approved → green if approved or any later status
    const approved = ['approved', 'call_booking_sent', 'call_booked', 'interview_completed', 'qualified', 'payment_pending', 'paid_in_full', 'enrolled'].includes(status);
    // Call Booked → green if call_booked or later
    const callBooked = ['call_booked', 'interview_completed', 'qualified', 'payment_pending', 'paid_in_full', 'enrolled'].includes(status);
    // Qualified → green if qualified or later
    const qualified = ['qualified', 'payment_pending', 'paid_in_full', 'enrolled'].includes(status);
    // Enrolled → green only if enrolled
    const enrolled = status === 'enrolled';

    return { applied, verified, approved, callBooked, qualified, enrolled };
  };

  // Check if payment section should be shown
  const canShowPayment = ['qualified', 'payment_pending', 'paid_in_full'].includes(profile?.status);

  const statusInfo = profile ? getStatusInfo(profile.status) : getStatusInfo("registered");
  const timelineProgress = profile ? getTimelineProgress(profile.status) : getTimelineProgress("registered");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="student-overview">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl mb-2">
              Welcome, {user?.name?.split(" ")[0]}!
            </h1>
            {profile?.enrollment_number ? (
              <div className="flex items-center gap-2">
                <Award className="text-amber-400" size={20} />
                <span className="text-amber-400 font-mono text-lg">{profile.enrollment_number}</span>
              </div>
            ) : (
              <p className="text-slate-400">Level 7 Diploma in Dental Implantology</p>
            )}
          </div>
          {profile?.status === "enrolled" && (
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg">
              <GraduationCap className="text-green-400" size={24} />
              <span className="text-green-400 font-medium">Enrolled Student</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="font-heading text-xl text-slate-900 mb-4">Application Status</h2>
        
        <div className="flex items-center gap-3 mb-4">
          <span className={`font-medium px-3 py-1.5 rounded-full text-white text-sm ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        
        <div className={`p-4 rounded-lg ${
          profile?.status === "enrolled" ? "bg-green-50 border border-green-200" :
          profile?.status === "rejected" ? "bg-red-50 border border-red-200" :
          profile?.status === "qualified" ? "bg-purple-50 border border-purple-200" :
          profile?.status === "call_booking_sent" ? "bg-purple-50 border border-purple-200" :
          profile?.status === "call_booked" ? "bg-indigo-50 border border-indigo-200" :
          profile?.status === "interview_completed" ? "bg-teal-50 border border-teal-200" :
          "bg-blue-50 border border-blue-200"
        }`}>
          <p className={`text-sm ${
            profile?.status === "enrolled" ? "text-green-700" :
            profile?.status === "rejected" ? "text-red-700" :
            profile?.status === "qualified" ? "text-purple-700" :
            profile?.status === "call_booking_sent" ? "text-purple-700" :
            profile?.status === "call_booked" ? "text-indigo-700" :
            profile?.status === "interview_completed" ? "text-teal-700" :
            "text-blue-700"
          }`}>
            {profile?.status === "enrolled" ? <CheckCircle className="inline mr-2" size={16} /> :
             profile?.status === "rejected" ? <AlertCircle className="inline mr-2" size={16} /> :
             <Clock className="inline mr-2" size={16} />}
            {statusInfo.message}
          </p>
        </div>

        {/* 6-Step Progress Timeline */}
        <div className="flex justify-between mt-8">
          {[
            { label: "Applied", key: "applied" },
            { label: "Verified", key: "verified" },
            { label: "Approved", key: "approved" },
            { label: "Call Booked", key: "callBooked" },
            { label: "Qualified", key: "qualified" },
            { label: "Enrolled", key: "enrolled" }
          ].map((item, i) => {
            const isComplete = timelineProgress[item.key];
            return (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isComplete ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {isComplete ? <CheckCircle size={18} /> : i + 1}
                </div>
                <span className={`text-xs mt-2 text-center ${isComplete ? "text-green-600" : "text-slate-500"}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Action Card Based on Status */}
      {profile?.status === 'call_booking_sent' && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl mb-1">Book Your Interview Call</h3>
              <p className="text-purple-100">Your application has been approved! The next step is to book your interview call with our team.</p>
            </div>
            <Button 
              onClick={() => window.open(BOOKING_URL, '_blank')}
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              Book My Interview →
            </Button>
          </div>
        </div>
      )}

      {profile?.status === 'call_booked' && (
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 rounded-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl mb-1">Interview Scheduled ✓</h3>
              <p className="text-indigo-100">Your interview call is booked. We'll send you the Zoom link and reminders via email.</p>
            </div>
            {profile.zoom_join_url && (
              <Button 
                onClick={() => window.open(profile.zoom_join_url, '_blank')}
                className="bg-white text-indigo-600 hover:bg-indigo-50"
              >
                Join Zoom Call
              </Button>
            )}
          </div>
        </div>
      )}

      {profile?.status === 'interview_completed' && (
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 rounded-xl text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Clock size={32} />
            </div>
            <div>
              <h3 className="font-heading text-xl mb-1">Interview Completed</h3>
              <p className="text-teal-100">Thank you for attending your interview. Our team is reviewing your performance and will be in touch shortly with your results.</p>
            </div>
          </div>
        </div>
      )}

      {profile?.status === 'qualified' && !payments.is_fully_paid && (
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl mb-1">Congratulations — You're Qualified! 🎉</h3>
              <p className="text-purple-200">You've successfully passed your interview. Complete your payment to secure your place on the programme.</p>
              <p className="mt-2">
                <span className="text-purple-200">Amount Due:</span>{' '}
                <span className="text-2xl font-bold">£{payments.remaining_gbp?.toLocaleString()}</span>
              </p>
            </div>
            <Button 
              onClick={() => navigate('/portal/student/payments')}
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              <CreditCard className="mr-2" size={18} />
              Pay Now
            </Button>
          </div>
        </div>
      )}

      {profile?.status === 'rejected' && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="font-heading text-xl mb-1">Application Unsuccessful</h3>
              <p className="text-red-100">Unfortunately you were not successful at this stage. Please contact us if you have any questions.</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Section - Only show for qualified, payment_pending, or paid_in_full */}
      {canShowPayment && !payments.is_fully_paid && profile?.status !== 'qualified' && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl mb-1">Complete Your Enrollment</h3>
              <p className="text-purple-100">Pay your course fee to secure your spot in the programme.</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-purple-200 text-sm">Amount Due</p>
              <p className="text-3xl font-bold mb-2">£{payments.remaining_gbp?.toLocaleString()}</p>
              <Button 
                onClick={() => navigate('/portal/student/payments')}
                className="bg-white text-purple-600 hover:bg-purple-50"
              >
                <CreditCard className="mr-2" size={18} />
                Pay Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enrolled Success Banner */}
      {profile?.status === "enrolled" && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <GraduationCap size={32} />
            </div>
            <div>
              <h3 className="font-heading text-xl mb-1">You're Enrolled!</h3>
              <p className="text-green-100">Welcome to Plan4Growth Academy. Your learning journey begins now.</p>
            </div>
          </div>
        </div>
      )}

      {/* Go to Course Banner - for enrolled or paid_in_full students */}
      {['enrolled', 'paid_in_full'].includes(profile?.status) && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-1">Your Course is Ready</h2>
          <p className="text-purple-200 text-sm mb-4">
            Click below to go to your course dashboard on the learning platform.
          </p>
          <button
            onClick={handleGoToCourse}
            disabled={redirectingToCourse}
            className="bg-white text-purple-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-70"
            data-testid="go-to-course-btn"
          >
            {redirectingToCourse ? 'Redirecting...' : 'Go to Your Course →'}
          </button>
        </div>
      )}

      {/* Quick Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Documents Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <FileText className="text-amber-600" size={24} />
            </div>
            <div>
              <h3 className="font-heading text-lg text-slate-900">My Documents</h3>
              <p className="text-sm text-slate-500">{documents.length} documents on file</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            Your documents were uploaded by your educational representative. View them below.
          </p>
          <Link to="/portal/student/documents">
            <Button variant="outline" className="w-full">
              <Eye className="mr-2" size={16} />
              View Documents
            </Button>
          </Link>
        </div>

        {/* Payment Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <CreditCard className="text-purple-600" size={24} />
            </div>
            <div>
              <h3 className="font-heading text-lg text-slate-900">Payments</h3>
              <p className="text-sm text-slate-500">
                {payments.is_fully_paid ? "Fully Paid" : `£${payments.total_paid_gbp?.toLocaleString()} / £6,250`}
              </p>
            </div>
          </div>
          <div className="mb-4">
            <Progress value={(payments.total_paid_gbp / 6250) * 100} className="h-2" />
          </div>
          <Link to="/portal/student/payments">
            <Button 
              variant={canShowPayment && !payments.is_fully_paid ? "default" : "outline"} 
              className={`w-full ${canShowPayment && !payments.is_fully_paid ? "bg-purple-500 hover:bg-purple-600 text-white" : ""}`}
            >
              {canShowPayment && !payments.is_fully_paid ? "Make Payment" : "View Payment History"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Course Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <BookOpen className="text-slate-600" size={24} />
          </div>
          <div>
            <h3 className="font-heading text-lg text-slate-900">Your Programme</h3>
            <p className="text-sm text-slate-500">Level 7 Diploma in Dental Implantology</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Duration</p>
            <p className="font-medium text-slate-900">12 Months</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Accreditation</p>
            <p className="font-medium text-slate-900">EduQual UK</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Course Fee</p>
            <p className="font-medium text-slate-900">£6,250</p>
          </div>
        </div>
      </div>

      {/* Admin Feedback */}
      {profile?.admin_feedback && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="font-medium text-slate-900 mb-1">Message from Admissions</h3>
              <p className="text-slate-700">{profile.admin_feedback}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Documents Page - Self-registered students can upload, rep-registered can only view
const StudentDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const REQUIRED_DOCS = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];

  const documentLabels = {
    bds_degree: "BDS Degree Certificate",
    bds_certificate: "BDS Certificate",
    tenth_marksheet: "10th Marksheet",
    "10th_marksheet": "10th Marksheet",
    twelfth_marksheet: "12th Marksheet",
    "12th_marksheet": "12th Marksheet",
    passport_photo: "Passport Photograph",
    photograph: "Passport Photograph",
    id_proof: "ID Proof (Passport/Aadhaar)",
    supporting: "Supporting Document"
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [docsRes, profileRes] = await Promise.all([
        axios.get(`${API}/student-documents/my`, { headers }),
        axios.get(`${API}/students/me`, { headers }).catch(() => ({ data: null }))
      ]);
      
      setDocuments(docsRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const canUpload = profile?.registration_source === 'self' && 
    ['registered', 'documents_uploaded'].includes(profile?.status);

  const handleFileUpload = async (docType, file) => {
    if (!profile?.application_token) {
      toast.error("Upload not available for your account type");
      return;
    }

    setError('');
    setUploading(prev => ({ ...prev, [docType]: true }));

    try {
      // Step 1: Get upload URL
      const urlRes = await axios.post(`${API}/applicant/upload-url`, {
        token: profile.application_token,
        doc_type: docType,
        file_name: file.name,
        content_type: file.type,
        file_size: file.size
      });

      const { document_id, upload_url } = urlRes.data;

      // Step 2: Upload file to S3
      if (!upload_url.includes('mock-s3')) {
        await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
      }

      // Step 3: Confirm upload
      await axios.post(`${API}/applicant/confirm-upload`, {
        token: profile.application_token,
        document_id
      });

      toast.success(`${documentLabels[docType]} uploaded successfully`);
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleDelete = async (documentId) => {
    if (!profile?.application_token) return;
    
    try {
      await axios.delete(`${API}/applicant/documents/${documentId}`, {
        data: { token: profile.application_token }
      });
      toast.success('Document removed');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleSubmitForReview = async () => {
    if (!profile?.application_token) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/applicant/submit-for-review`, {
        token: profile.application_token
      });
      toast.success('Documents submitted for review!');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const token = localStorage.getItem("token");
      const downloadUrl = `${API}/student-documents/${doc.document_id}/download?token=${token}`;
      
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('View document error:', error);
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      } else {
        toast.error("Unable to view document");
      }
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
      uploaded: { label: "Uploaded", color: "bg-blue-100 text-blue-700" },
      verified: { label: "Verified", color: "bg-green-100 text-green-700" },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-700" }
    };
    return styles[status] || styles.pending;
  };

  const getDocForType = (docType) => {
    return documents.find(d => d.doc_type === docType && ['uploaded', 'verified'].includes(d.status));
  };

  const uploadedTypes = documents.filter(d => ['uploaded', 'verified'].includes(d.status)).map(d => d.doc_type);
  const allRequiredUploaded = REQUIRED_DOCS.every(t => uploadedTypes.includes(t));

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="animate-spin text-amber-500 mx-auto" size={32} />
      </div>
    );
  }

  // Self-registered student - can upload
  if (canUpload) {
    return (
      <div className="space-y-6" data-testid="student-documents-upload">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-3xl text-slate-900">My Documents</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <p className="text-blue-800 text-sm">
            <AlertCircle className="inline mr-2" size={16} />
            Please upload all required documents. Accepted formats: PDF, JPG, PNG (max 10MB each).
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {REQUIRED_DOCS.map((docType) => {
            const uploaded = getDocForType(docType);
            const isUploading = uploading[docType];
            const statusBadge = uploaded ? getStatusBadge(uploaded.status) : null;

            return (
              <div
                key={docType}
                className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    uploaded ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {uploaded ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{documentLabels[docType]}</p>
                    {uploaded && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${statusBadge?.color}`}>
                          {statusBadge?.label}
                        </span>
                        <span className="text-xs text-slate-400 truncate">{uploaded.file_name}</span>
                      </div>
                    )}
                    {uploaded?.admin_comment && (
                      <p className="text-xs text-red-600 mt-1">{uploaded.admin_comment}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {uploaded ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleViewDocument(uploaded)}>
                        <Eye size={16} className="mr-1" /> View
                      </Button>
                      {uploaded.status !== 'verified' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(uploaded.document_id)}
                        >
                          Remove
                        </Button>
                      )}
                    </>
                  ) : (
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isUploading
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}>
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Upload
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          if (e.target.files[0]) handleFileUpload(docType, e.target.files[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit for Review Button */}
        {allRequiredUploaded && profile?.status !== 'under_review' && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg text-green-800">All Documents Uploaded!</h3>
                <p className="text-green-700 text-sm">Submit your documents for admin review to proceed with enrollment.</p>
              </div>
              <Button 
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={16} />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {profile?.status === 'under_review' && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
            <Clock className="mx-auto text-blue-500 mb-2" size={32} />
            <h3 className="font-heading text-lg text-blue-800">Documents Under Review</h3>
            <p className="text-blue-700 text-sm">Our admissions team will review your documents within 2-3 business days.</p>
          </div>
        )}

        {!allRequiredUploaded && (
          <p className="text-sm text-amber-600 text-center bg-amber-50 p-3 rounded-lg">
            Upload all {REQUIRED_DOCS.length} required documents to submit for review.
          </p>
        )}
      </div>
    );
  }

  // Rep/Manager registered student - view only
  return (
    <div className="space-y-6" data-testid="student-documents">
      <h1 className="font-heading text-3xl text-slate-900">My Documents</h1>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <p className="text-blue-800 text-sm">
          <AlertCircle className="inline mr-2" size={16} />
          Your documents were submitted by your educational representative. You can view them below.
        </p>
      </div>

      {documents.length > 0 ? (
        <div className="grid gap-4">
          {documents.map((doc) => {
            const statusBadge = getStatusBadge(doc.status);
            return (
              <div key={doc.document_id} className="bg-white p-6 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    doc.status === "verified" ? "bg-green-100" : 
                    doc.status === "rejected" ? "bg-red-100" : "bg-slate-100"
                  }`}>
                    <FileText className={
                      doc.status === "verified" ? "text-green-600" : 
                      doc.status === "rejected" ? "text-red-600" : "text-slate-500"
                    } size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {documentLabels[doc.doc_type] || doc.doc_type?.replace(/_/g, " ")}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block text-xs px-2 py-1 rounded ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                      {doc.file_name && (
                        <span className="text-xs text-slate-400">{doc.file_name}</span>
                      )}
                    </div>
                    {doc.admin_comment && (
                      <p className="text-xs text-red-600 mt-1">{doc.admin_comment}</p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDocument(doc)}
                >
                  <Eye size={16} className="mr-1" /> View
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <FileText className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">No documents uploaded yet.</p>
          <p className="text-slate-400 text-sm mt-1">Your representative will upload your documents.</p>
        </div>
      )}
    </div>
  );
};

// Payments Page with Stripe Integration (Full Payment & Installments)
const StudentPayments = () => {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const navigate = useNavigate();

  // Course fee configuration
  const COURSE_FEE = 6250;
  const DEPOSIT_AMOUNT = 500;
  const MONTHLY_INSTALLMENT = 1249.83;
  const TOTAL_INSTALLMENTS = 6;

  useEffect(() => {
    fetchData();
    loadStripe();
  }, []);

  const loadStripe = async () => {
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => setStripeLoaded(true);
      document.body.appendChild(script);
    } else {
      setStripeLoaded(true);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [paymentRes, profileRes] = await Promise.all([
        axios.get(`${API}/payments/my-info`, { headers }),
        axios.get(`${API}/students/me`, { headers }).catch(() => ({ data: null }))
      ]);

      setPaymentInfo(paymentRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Error fetching payment data:", error);
      toast.error("Failed to load payment information");
    } finally {
      setLoading(false);
    }
  };

  const handleFullPayment = async () => {
    if (processing) return;
    setProcessing(true);
    setPaymentError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/payments/create-full-payment`, {
        origin_url: window.location.origin
      }, { headers: { Authorization: `Bearer ${token}` } });

      const { session_url } = response.data;

      if (!session_url) {
        throw new Error('Invalid payment response - no checkout URL');
      }

      // Redirect to Stripe Checkout
      window.location.href = session_url;

    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(error.response?.data?.error || error.message || "Payment failed");
      toast.error(error.response?.data?.error || "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  const handleDepositPayment = async () => {
    if (processing) return;
    setProcessing(true);
    setPaymentError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/payments/create-deposit-payment`, {
        origin_url: window.location.origin
      }, { headers: { Authorization: `Bearer ${token}` } });

      const { session_url } = response.data;

      if (!session_url) {
        throw new Error('Invalid payment response - no checkout URL');
      }

      // Redirect to Stripe Checkout
      window.location.href = session_url;

    } catch (error) {
      console.error("Deposit payment error:", error);
      setPaymentError(error.response?.data?.error || error.message || "Payment failed");
      toast.error(error.response?.data?.error || "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/payments/cancel-pending-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Subscription cancelled. You can now choose a different payment option.');
      fetchData(); // Reload payment info
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error(error.response?.data?.error || "Failed to cancel subscription");
    } finally {
      setProcessing(false);
    }
  };

  const canPay = ['approved', 'qualified', 'payment_pending'].includes(profile?.status);
  const hasSubscription = paymentInfo?.subscription;
  const isFullyPaid = paymentInfo?.is_fully_paid || profile?.status === 'paid_in_full';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-payments">
      <h1 className="font-heading text-3xl text-slate-900">Payments</h1>

      {/* Fee Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="font-heading text-xl text-slate-900 mb-4">Fee Summary</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Total Course Fee</p>
            <p className="text-2xl font-bold text-slate-900">£{COURSE_FEE.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-slate-500">Amount Paid</p>
            <p className="text-2xl font-bold text-green-600">£{(paymentInfo?.total_paid_gbp || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-slate-500">Remaining</p>
            <p className="text-2xl font-bold text-amber-600">£{(paymentInfo?.remaining_gbp || COURSE_FEE).toLocaleString()}</p>
          </div>
        </div>
        <Progress value={((paymentInfo?.total_paid_gbp || 0) / COURSE_FEE) * 100} className="h-3" />
      </div>

      {/* Fully Paid Success */}
      {isFullyPaid && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
          <CheckCircle className="mx-auto text-green-500 mb-2" size={48} />
          <h3 className="font-heading text-xl text-green-800">Payment Complete!</h3>
          <p className="text-green-700 mb-4">Your enrollment has been confirmed.</p>
          <Button 
            onClick={() => navigate('/portal/student')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Go to Dashboard
          </Button>
        </div>
      )}

      {/* Payment Options - Only show if not fully paid and can pay */}
      {!isFullyPaid && canPay && !hasSubscription && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="font-heading text-xl text-slate-900 mb-6">Choose Your Payment Plan</h2>
          
          {paymentError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{paymentError}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Option A: Pay in Full */}
            <div 
              className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'full' 
                  ? 'border-purple-500 bg-purple-50/50' 
                  : 'border-slate-200 hover:border-purple-300'
              }`}
              onClick={() => setSelectedPlan('full')}
              data-testid="payment-plan-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-slate-900">Pay in Full</h3>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'full' ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                }`}>
                  {selectedPlan === 'full' && <CheckCircle className="text-white" size={14} />}
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-600 mb-2">
                £{(paymentInfo?.remaining_gbp || COURSE_FEE).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mb-4">One-time payment</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  Instant enrollment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  Immediate course access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  No additional fees
                </li>
              </ul>
            </div>

            {/* Option B: Installments */}
            <div 
              className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'installment' 
                  ? 'border-amber-500 bg-amber-50/50' 
                  : 'border-slate-200 hover:border-amber-300'
              }`}
              onClick={() => setSelectedPlan('installment')}
              data-testid="payment-plan-installment"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-slate-900">Pay in Installments</h3>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'installment' ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                }`}>
                  {selectedPlan === 'installment' && <CheckCircle className="text-white" size={14} />}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-lg font-bold text-amber-600">
                  £{DEPOSIT_AMOUNT.toLocaleString()} deposit
                </p>
                <p className="text-sm text-slate-500">
                  + {TOTAL_INSTALLMENTS} monthly payments of £{MONTHLY_INSTALLMENT.toLocaleString()}
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  Spread payments over 7 months
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  Automatic monthly billing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  Start with deposit only
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Button */}
          {selectedPlan && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <Button
                onClick={selectedPlan === 'full' ? handleFullPayment : handleDepositPayment}
                disabled={processing || !stripeLoaded}
                className={`w-full h-12 text-lg font-semibold ${
                  selectedPlan === 'full' 
                    ? 'bg-purple-500 hover:bg-purple-600' 
                    : 'bg-amber-500 hover:bg-amber-600'
                } text-white`}
                data-testid="payment-submit-btn"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2" size={20} />
                    {selectedPlan === 'full' 
                      ? `Pay £${(paymentInfo?.remaining_gbp || COURSE_FEE).toLocaleString()} Now`
                      : `Pay £${DEPOSIT_AMOUNT.toLocaleString()} Deposit`
                    }
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-400 mt-3">
                Secure payment powered by Stripe. Your card details are encrypted.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subscription Status (for installment plans) */}
      {hasSubscription && !isFullyPaid && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="font-heading text-xl text-slate-900 mb-4">Installment Plan Status</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Plan Status</p>
              <p className={`text-lg font-semibold ${
                paymentInfo.subscription.status === 'active' ? 'text-green-600' :
                paymentInfo.subscription.status === 'past_due' ? 'text-red-600' : 'text-amber-600'
              }`}>
                {paymentInfo.subscription.status === 'active' ? 'Active' :
                 paymentInfo.subscription.status === 'past_due' ? 'Past Due' :
                 paymentInfo.subscription.status}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Installments Paid</p>
              <p className="text-lg font-semibold text-slate-900">
                {paymentInfo.subscription.installments_paid} / {paymentInfo.subscription.total_installments}
              </p>
            </div>
            {paymentInfo.subscription.next_payment_date && (
              <div className="p-4 bg-amber-50 rounded-lg md:col-span-2">
                <p className="text-sm text-slate-500">Next Payment Date</p>
                <p className="text-lg font-semibold text-amber-600">
                  {new Date(paymentInfo.subscription.next_payment_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Amount: £{paymentInfo.subscription.monthly_amount?.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <Progress 
            value={(paymentInfo.subscription.installments_paid / paymentInfo.subscription.total_installments) * 100} 
            className="h-3" 
          />
          
          {/* Pay Deposit Button - Show if subscription is pending deposit */}
          {paymentInfo.subscription.status === 'pending_deposit' && !paymentInfo.subscription.deposit_paid && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-purple-700 mb-3">Your installment plan requires a deposit of <strong>£500</strong> to activate.</p>
              {paymentError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{paymentError}</p>
                </div>
              )}
              <Button
                onClick={handleDepositPayment}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="pay-deposit-btn"
              >
                {processing ? (
                  <><Loader2 className="animate-spin mr-2" size={16} /> Processing...</>
                ) : (
                  <>Pay Deposit £500</>
                )}
              </Button>
              <p className="text-xs text-purple-600 mt-2 text-center">
                Or <button onClick={() => {
                  // Clear the pending subscription so they can choose a different plan
                  // This requires a backend endpoint to cancel the pending subscription
                  if (window.confirm('Cancel installment plan and choose a different option?')) {
                    handleCancelSubscription();
                  }
                }} className="underline hover:no-underline">choose a different payment option</button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Not eligible for payment */}
      {!canPay && !isFullyPaid && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <p className="text-amber-800 text-sm">
            <Clock className="inline mr-2" size={16} />
            Payment will be enabled after your application is approved and you complete your interview.
          </p>
        </div>
      )}

      {/* Payment History */}
      {paymentInfo?.payments?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-heading text-xl text-slate-900">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paymentInfo.payments.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 font-mono text-sm text-slate-900">{payment.payment_id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                      {payment.payment_type}
                      {payment.installment_number && ` #${payment.installment_number}`}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">£{payment.amount_gbp?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === "paid" ? "bg-green-100 text-green-700" :
                        payment.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(payment.paid_at || payment.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Profile Page
const StudentProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/students/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="student-profile">
      <h1 className="font-heading text-3xl text-slate-900">My Profile</h1>

      <div className="bg-white p-8 rounded-xl border border-slate-200">
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-3xl">{user?.name?.charAt(0) || "S"}</span>
          </div>
          <div>
            <h2 className="font-heading text-2xl text-slate-900">{user?.name}</h2>
            <p className="text-slate-500">{user?.email}</p>
            {profile?.enrollment_number && (
              <p className="font-mono text-amber-600 mt-2">Enrollment: {profile.enrollment_number}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="animate-spin text-amber-500 mx-auto" size={32} />
          </div>
        ) : profile ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Phone / WhatsApp</label>
              <p className="text-slate-900">{profile.whatsapp_number || "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Date of Birth</label>
              <p className="text-slate-900">{profile.dob ? new Date(profile.dob).toLocaleDateString() : "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">City</label>
              <p className="text-slate-900">{profile.city || "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">State</label>
              <p className="text-slate-900">{profile.state || "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Dental Registration Number</label>
              <p className="text-slate-900">{profile.dental_reg_number || "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Years of Experience</label>
              <p className="text-slate-900">{profile.experience_years ? `${profile.experience_years} years` : "Not set"}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Profile not found</p>
        )}
      </div>
    </div>
  );
};

// Main Student Portal Layout
const StudentPortal = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [studentStatus, setStudentStatus] = useState(null);

  // Fetch student status to conditionally show referral item
  useEffect(() => {
    const fetchStudentStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API}/students/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudentStatus(response.data?.status);
      } catch (error) {
        console.error("Error fetching student status:", error);
      }
    };
    fetchStudentStatus();
  }, []);

  // Base nav items
  const baseNavItems = [
    { path: "/portal/student", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { path: "/portal/student/courses", icon: BookOpen, label: "My Courses" },
    { path: "/portal/student/documents", icon: FileText, label: "Documents" },
    { path: "/portal/student/payments", icon: CreditCard, label: "Payments" },
  ];

  // Add referral item for all students (shows locked/unlocked state based on enrollment)
  const navItems = [
    ...baseNavItems,
    { path: "/portal/student/referrals", icon: Gift, label: "Refer a Friend", highlight: studentStatus === 'enrolled' },
    { path: "/portal/student/profile", icon: User, label: "Profile" },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="student-portal">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-heading text-lg font-bold text-slate-900">Plan<span className="text-amber-500">4</span>Growth</span>
        </Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-700">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6">
          <Link to="/" className="flex items-center gap-1 mb-2">
            <span className="font-heading text-xl font-bold text-white">Plan<span className="text-amber-500">4</span>Growth</span>
          </Link>
          <span className="inline-block px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded font-medium">Student Portal</span>

          <nav className="space-y-1 mt-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path, item.exact) 
                    ? "bg-amber-500/15 text-amber-500" 
                    : item.highlight 
                      ? "text-amber-400 hover:text-amber-300 hover:bg-slate-800" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon size={20} />
                {item.label}
                {item.highlight && !isActive(item.path, item.exact) && (
                  <span className="ml-auto w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(user?.role).badge}`}>
              <span className="text-white font-bold">{user?.name?.charAt(0) || "S"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{getRoleLabel(user?.role)}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <LogOut size={18} />Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          <Routes>
            <Route index element={<StudentOverview />} />
            <Route path="courses" element={<StudentCoursesPage />} />
            <Route path="courses/:programmeId" element={<CourseDetailPage />} />
            <Route path="documents" element={<StudentDocuments />} />
            <Route path="payments" element={<StudentPayments />} />
            <Route path="payment/success" element={<StudentPayments />} />
            <Route path="payment/cancel" element={<StudentPayments />} />
            <Route path="referrals" element={<StudentReferrals />} />
            <Route path="profile" element={<StudentProfile />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
