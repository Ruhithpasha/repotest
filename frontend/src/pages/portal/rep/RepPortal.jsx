import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Upload,
  Send,
  Loader2,
  ArrowLeft,
  XCircle,
  CreditCard,
  PoundSterling
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";

// Rep Dashboard Overview
const RepOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_students: 0,
    documents_pending: 0,
    under_review: 0,
    approved: 0,
    enrolled: 0,
    commission: {
      total_gbp: 0,
      pending_gbp: 0,
      paid_gbp: 0,
      rate: 4,
      per_student_gbp: 319.96
    }
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, studentsRes] = await Promise.all([
          axios.get(`${API}/rep/dashboard/stats`, { headers }),
          axios.get(`${API}/rep/students`, { headers })
        ]);

        setStats(statsRes.data);
        setStudents(studentsRes.data);
      } catch (error) {
        console.error("Error fetching rep data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    const styles = {
      registered: "bg-slate-100 text-slate-700",
      documents_uploaded: "bg-amber-100 text-amber-700",
      under_review: "bg-blue-100 text-blue-700",
      approved: "bg-purple-100 text-purple-700",
      payment_pending: "bg-orange-100 text-orange-700",
      enrolled: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-8" data-testid="rep-overview">
      <div className="bg-slate-900 text-white p-8 rounded-2xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-heading text-3xl mb-2">Welcome, {user?.name?.split(" ")[0]}!</h1>
            <p className="text-slate-400">Manage your student registrations and track your commissions.</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Commission Rate</p>
            <p className="text-amber-400 text-2xl font-bold">{stats.commission?.rate || 4}%</p>
            <p className="text-slate-500 text-xs">£{(stats.commission?.per_student_gbp || 319.96).toFixed(2)}/student</p>
          </div>
        </div>
      </div>

      {/* Commission Summary */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg opacity-90">Total Commission Earned</h3>
            <p className="text-4xl font-bold mt-1">£{(stats.commission?.total_gbp || 0).toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-right">
            <div>
              <p className="text-amber-100 text-sm">Pending</p>
              <p className="text-xl font-semibold">£{(stats.commission?.pending_gbp || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-amber-100 text-sm">Paid Out</p>
              <p className="text-xl font-semibold">£{(stats.commission?.paid_gbp || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <Link to="/portal/rep/commissions" className="inline-block mt-4 text-sm text-amber-100 hover:text-white underline">
          View Commission Details →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <Users className="text-blue-500 mb-3" size={28} />
          <p className="text-3xl font-bold text-slate-900">{loading ? "..." : stats.total_students}</p>
          <p className="text-sm text-slate-500">Total Students</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <FileText className="text-amber-500 mb-3" size={28} />
          <p className="text-3xl font-bold text-slate-900">{loading ? "..." : stats.documents_pending}</p>
          <p className="text-sm text-slate-500">Docs Pending</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <Clock className="text-blue-500 mb-3" size={28} />
          <p className="text-3xl font-bold text-slate-900">{loading ? "..." : stats.under_review}</p>
          <p className="text-sm text-slate-500">Under Review</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <CheckCircle className="text-purple-500 mb-3" size={28} />
          <p className="text-3xl font-bold text-slate-900">{loading ? "..." : stats.approved}</p>
          <p className="text-sm text-slate-500">Approved</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <CheckCircle className="text-green-500 mb-3" size={28} />
          <p className="text-3xl font-bold text-slate-900">{loading ? "..." : stats.enrolled}</p>
          <p className="text-sm text-slate-500">Enrolled</p>
        </div>
      </div>

      {/* Quick Action */}
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg text-slate-900 mb-1">Register a New Student</h3>
          <p className="text-slate-600 text-sm">Start the enrollment process for a new dental professional.</p>
        </div>
        <Link to="/portal/rep/register">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <UserPlus className="mr-2" size={18} />
            Register Student
          </Button>
        </Link>
      </div>

      {/* Recent Students */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-heading text-xl text-slate-900">Your Students</h2>
          <Link to="/portal/rep/students" className="text-amber-600 text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : students.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Documents</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.slice(0, 5).map((student, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{student.user?.name || "N/A"}</td>
                  <td className="px-6 py-4 text-slate-500">{student.user?.email || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(student.status)}`}>
                      {student.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{student.documents_uploaded || 0}/5</td>
                  <td className="px-6 py-4">
                    <Link to={`/portal/rep/students/${student.student_id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye size={16} />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 mb-4">No students registered yet</p>
            <Link to="/portal/rep/register">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">Register First Student</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Student Registration Form (Rep creates student)
const RegisterStudent = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp_number: "",
    dob: "",
    city: "",
    state: "",
    dental_reg_number: "",
    experience_years: ""
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/rep/students`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Student registered successfully! They can login after document approval.");
      navigate(`/portal/rep/students/${response.data.student.student_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="register-student">
      <div className="flex items-center gap-4">
        <Link to="/portal/rep">
          <Button variant="ghost" size="sm"><ArrowLeft size={18} /></Button>
        </Link>
        <h1 className="font-heading text-3xl text-slate-900">Register New Student</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <p className="text-blue-800 text-sm">
          <AlertCircle className="inline mr-2" size={16} />
          Set the student's login credentials below. Once all documents are approved by admin, the student account will be automatically activated and they can login using these credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. John Doe"
              required
              data-testid="student-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="doctor@example.com"
              required
              data-testid="student-email-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Student Login Password *</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              data-testid="student-password-input"
            />
            <p className="text-xs text-slate-500 mt-1">Student will use this password to login after approval</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number *</label>
            <Input
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="+44 7XXX XXXXXX"
              required
              data-testid="student-whatsapp-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <Input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="London"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State/Region</label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="England"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dental Registration Number</label>
            <Input
              value={formData.dental_reg_number}
              onChange={(e) => setFormData({ ...formData, dental_reg_number: e.target.value })}
              placeholder="GDC-123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
            <Input
              type="number"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
              placeholder="5"
            />
          </div>
        </div>

        <Button 
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4"
          disabled={loading || !formData.name || !formData.email || !formData.password || !formData.whatsapp_number}
          data-testid="register-student-btn"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus className="mr-2" size={18} />}
          Register Student
        </Button>
      </form>
    </div>
  );
};

// Student Detail Page with Document Upload
const StudentDetail = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingBookingLink, setSendingBookingLink] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRefs = {};
  const navigate = useNavigate();

  const requiredDocs = [
    { type: "bds_degree", label: "BDS Degree Certificate", accept: ".pdf,.jpg,.jpeg,.png" },
    { type: "tenth_marksheet", label: "10th Marksheet", accept: ".pdf,.jpg,.jpeg,.png" },
    { type: "twelfth_marksheet", label: "12th Marksheet", accept: ".pdf,.jpg,.jpeg,.png" },
    { type: "passport_photo", label: "Passport Photo", accept: ".jpg,.jpeg,.png" },
    { type: "id_proof", label: "ID Proof (Passport/Aadhaar)", accept: ".pdf,.jpg,.jpeg,.png" }
  ];

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/rep/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudent(response.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load student");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (docType, event) => {
    const file = event.target.files[0];
    if (file) {
      handleUpload(docType, file);
    }
  };

  const handleUpload = async (docType, file) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB allowed.");
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only PDF, JPG, PNG allowed.");
      return;
    }

    setUploading(docType);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', docType);

      await axios.post(`${API}/rep/students/${studentId}/documents/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      toast.success("Document uploaded to S3 successfully!");
      fetchStudent();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/rep/students/${studentId}/submit-review`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application submitted for review!");
      fetchStudent();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBookingLink = async () => {
    setSendingBookingLink(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/crm/students/${studentId}/send-booking-link`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Booking link sent to student!");
      fetchStudent();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send booking link");
    } finally {
      setSendingBookingLink(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const token = localStorage.getItem("token");
      const downloadUrl = `${API}/rep/students/${studentId}/documents/${doc.document_id}/download?token=${token}`;
      
      // Fetch the file as blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('View document error:', error);
      toast.error("Unable to view document");
    }
  };

  const getDocStatus = (docType) => {
    const doc = student?.documents?.find(d => d.doc_type === docType);
    if (!doc) return { status: "not_uploaded", label: "Not Uploaded", color: "bg-slate-100 text-slate-600" };
    
    const styles = {
      pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700" },
      verified: { label: "Verified", color: "bg-green-100 text-green-700" },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-700" }
    };
    return { ...styles[doc.status], status: doc.status, doc };
  };

  const getStatusBadge = (status) => {
    const styles = {
      registered: "bg-slate-500",
      documents_uploaded: "bg-amber-500",
      under_review: "bg-blue-500",
      approved: "bg-purple-500",
      call_booking_sent: "bg-indigo-500",
      call_booked: "bg-cyan-500",
      interview_completed: "bg-teal-500",
      qualified: "bg-emerald-500",
      payment_pending: "bg-orange-500",
      enrolled: "bg-green-500",
      rejected: "bg-red-500"
    };
    return styles[status] || "bg-slate-500";
  };

  const getProgress = (status) => {
    const progress = {
      registered: 10,
      documents_uploaded: 20,
      under_review: 30,
      approved: 40,
      call_booking_sent: 50,
      call_booked: 60,
      interview_completed: 70,
      qualified: 80,
      payment_pending: 90,
      enrolled: 100,
      rejected: 0
    };
    return progress[status] || 0;
  };

  // Check if booking link can be sent (approved but not yet sent)
  const canSendBookingLink = student?.status === 'approved' && !student?.booking_link_sent;

  const allDocsUploaded = requiredDocs.every(d => {
    const status = getDocStatus(d.type);
    return status.status !== "not_uploaded";
  });

  const canSubmit = allDocsUploaded && student?.status === "registered";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Student not found</p>
        <Link to="/portal/rep/students">
          <Button className="mt-4">Back to Students</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-detail">
      <div className="flex items-center gap-4">
        <Link to="/portal/rep/students">
          <Button variant="ghost" size="sm"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="font-heading text-3xl text-slate-900">{student.user?.name}</h1>
          <p className="text-slate-500">{student.user?.email}</p>
        </div>
      </div>

      {/* Status Progress */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-slate-900">Application Progress</h2>
          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusBadge(student.status)}`}>
            {student.status?.replace(/_/g, " ")}
          </span>
        </div>
        <Progress value={getProgress(student.status)} className="h-3 mb-4" />
        
        {student.enrollment_number && (
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-800 font-medium">Enrollment Number: {student.enrollment_number}</p>
          </div>
        )}

        {/* Booking Link Sent Badge */}
        {student.booking_link_sent && (
          <div className="bg-indigo-50 p-4 rounded-lg mt-4 flex items-center gap-2">
            <CheckCircle className="text-indigo-600" size={18} />
            <p className="text-indigo-800">Booking link sent on {student.booking_link_sent_at ? new Date(student.booking_link_sent_at).toLocaleDateString() : 'N/A'}</p>
          </div>
        )}

        {/* Send Booking Link Button - for approved students without booking link */}
        {canSendBookingLink && (
          <div className="mt-4">
            <Button
              onClick={handleSendBookingLink}
              disabled={sendingBookingLink}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              data-testid="send-booking-link-btn"
            >
              {sendingBookingLink ? (
                <><Loader2 className="animate-spin mr-2" size={16} /> Sending...</>
              ) : (
                <><Send className="mr-2" size={16} /> Send Booking Link</>
              )}
            </Button>
            <p className="text-sm text-slate-500 mt-2">Send interview booking link to student's email</p>
          </div>
        )}

        {student.admin_feedback && (
          <div className="bg-red-50 p-4 rounded-lg mt-4">
            <p className="text-red-800"><strong>Admin Feedback:</strong> {student.admin_feedback}</p>
          </div>
        )}
      </div>

      {/* Student Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="font-heading text-xl text-slate-900 mb-4">Student Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">WhatsApp</p>
            <p className="font-medium text-slate-900">{student.whatsapp_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Date of Birth</p>
            <p className="font-medium text-slate-900">{student.dob ? new Date(student.dob).toLocaleDateString() : "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Location</p>
            <p className="font-medium text-slate-900">{student.city}, {student.state}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Dental Reg. Number</p>
            <p className="font-medium text-slate-900">{student.dental_reg_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Experience</p>
            <p className="font-medium text-slate-900">{student.experience_years ? `${student.experience_years} years` : "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Registered</p>
            <p className="font-medium text-slate-900">{new Date(student.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="font-heading text-xl text-slate-900 mb-4">Required Documents</h2>
        <p className="text-sm text-slate-500 mb-4">Upload PDF, JPG, or PNG files (max 10MB each)</p>
        <div className="space-y-4">
          {requiredDocs.map((doc) => {
            const status = getDocStatus(doc.type);
            const canUpload = ["registered", "documents_uploaded"].includes(student.status) && 
                             (status.status === "not_uploaded" || status.status === "rejected");
            
            return (
              <div key={doc.type} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    status.status === "verified" ? "bg-green-500" : 
                    status.status === "pending" ? "bg-amber-500" : 
                    status.status === "rejected" ? "bg-red-500" : "bg-slate-300"
                  }`}>
                    {status.status === "verified" ? <CheckCircle className="text-white" size={20} /> :
                     status.status === "rejected" ? <XCircle className="text-white" size={20} /> :
                     <FileText className={status.status === "pending" ? "text-white" : "text-slate-500"} size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{doc.label}</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${status.color}`}>
                      {status.label}
                    </span>
                    {status.doc?.file_name && (
                      <p className="text-xs text-slate-500 mt-1">{status.doc.file_name}</p>
                    )}
                    {status.doc?.admin_comment && (
                      <p className="text-xs text-red-600 mt-1">{status.doc.admin_comment}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Document Button */}
                  {status.doc && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(status.doc)}
                    >
                      <Eye size={16} className="mr-1" /> View
                    </Button>
                  )}
                  
                  {/* Upload Button with Hidden File Input */}
                  {canUpload && (
                    <>
                      <input
                        type="file"
                        id={`file-input-${doc.type}`}
                        accept={doc.accept}
                        onChange={(e) => handleFileSelect(doc.type, e)}
                        className="hidden"
                      />
                      <Button
                        onClick={() => document.getElementById(`file-input-${doc.type}`).click()}
                        disabled={uploading === doc.type}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        size="sm"
                      >
                        {uploading === doc.type ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span>{uploadProgress}%</span>
                          </div>
                        ) : (
                          <><Upload size={16} className="mr-1" /> {status.doc ? "Replace" : "Upload"}</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        {canSubmit && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Button
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4"
            >
              {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={18} />}
              Submit for Admin Review
            </Button>
          </div>
        )}

        {student.status === "documents_uploaded" && !allDocsUploaded && (
          <div className="mt-6 bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800 text-sm">
              <AlertCircle className="inline mr-2" size={16} />
              Upload all required documents before submitting for review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Students List
const RepStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/rep/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      registered: "bg-slate-100 text-slate-700",
      documents_uploaded: "bg-amber-100 text-amber-700",
      under_review: "bg-blue-100 text-blue-700",
      approved: "bg-purple-100 text-purple-700",
      payment_pending: "bg-orange-100 text-orange-700",
      enrolled: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const filteredStudents = statusFilter === "all" 
    ? students 
    : students.filter(s => s.status === statusFilter);

  return (
    <div className="space-y-6" data-testid="rep-students">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-slate-900">Your Students</h1>
        <Link to="/portal/rep/register">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <UserPlus className="mr-2" size={18} />
            Register New
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "registered", "documents_uploaded", "under_review", "approved", "enrolled", "rejected"].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {status === "all" ? "All" : status.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : filteredStudents.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Enrollment</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{student.user?.name || "N/A"}</td>
                  <td className="px-6 py-4">
                    <p className="text-slate-500 text-sm">{student.user?.email}</p>
                    <p className="text-slate-400 text-xs">{student.whatsapp_number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(student.status)}`}>
                      {student.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {student.documents_uploaded || 0}/{student.documents_verified || 0} verified
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">
                    {student.enrollment_number || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/portal/rep/students/${student.student_id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye size={16} className="mr-1" /> View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 mb-4">No students found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Rep Commissions Page
const RepCommissions = () => {
  const [data, setData] = useState({ commissions: [], summary: {}, commission_rate: 4, per_student_gbp: 319.96 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/rep/commissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const filteredCommissions = statusFilter === "all" 
    ? data.commissions 
    : data.commissions.filter(c => c.status === statusFilter);

  return (
    <div className="space-y-6" data-testid="rep-commissions">
      <h1 className="font-heading text-3xl text-slate-900">My Commissions</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Total Earned</p>
          <p className="text-3xl font-bold text-slate-900">£{(data.summary?.total_gbp || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-600">£{(data.summary?.pending_gbp || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="text-3xl font-bold text-blue-600">£{(data.summary?.approved_gbp || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Paid Out</p>
          <p className="text-3xl font-bold text-green-600">£{(data.summary?.paid_gbp || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
        <p className="text-amber-800 text-sm">
          <AlertCircle className="inline mr-2" size={16} />
          Commission rate: <strong>{data.commission_rate}%</strong> per enrolled student (£{data.per_student_gbp?.toFixed(2)} for £6,250 course fee)
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "paid"].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : filteredCommissions.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Enrollment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCommissions.map((commission, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{commission.student_name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">
                    {commission.student?.enrollment_number || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-green-600">£{commission.commission_amount_gbp.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(commission.status)}`}>
                      {commission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(commission.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No commissions yet</p>
            <p className="text-slate-400 text-sm mt-2">Commissions are earned when your students complete enrollment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Rep Portal Layout
const RepPortal = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { path: "/portal/rep", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { path: "/portal/rep/register", icon: UserPlus, label: "Register Student" },
    { path: "/portal/rep/students", icon: Users, label: "My Students" },
    { path: "/portal/rep/commissions", icon: PoundSterling, label: "Commissions" },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && !location.pathname.includes("/students/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="rep-portal">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-heading text-lg font-bold text-slate-900">Plan<span className="text-amber-500">4</span>Growth</span>
          <span className="text-xs text-slate-500 ml-1">Rep</span>
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
          <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">Rep Portal</span>

          <nav className="space-y-1 mt-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path, item.exact) ? "bg-amber-500/15 text-amber-500" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{user?.name?.charAt(0) || "R"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
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
            <Route index element={<RepOverview />} />
            <Route path="register" element={<RegisterStudent />} />
            <Route path="students" element={<RepStudents />} />
            <Route path="students/:studentId" element={<StudentDetail />} />
            <Route path="commissions" element={<RepCommissions />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default RepPortal;
