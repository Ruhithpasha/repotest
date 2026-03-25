import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, DollarSign, CheckCircle, AlertTriangle, 
  User, Calendar, CreditCard, RefreshCw, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentTimelinePage = () => {
  const { enrolmentId } = useParams();
  const [enrolment, setEnrolment] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/enrolments/${enrolmentId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch timeline');
        const data = await res.json();
        setEnrolment(data.enrolment);
        setTimeline(data.timeline || []);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
        toast.error('Failed to load timeline');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [enrolmentId, token]);

  const getEventColor = (eventType) => {
    if (eventType.includes('payment')) return { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' };
    if (eventType.includes('commission')) return { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' };
    if (eventType.includes('refund') || eventType.includes('reject') || eventType.includes('cancel')) return { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' };
    if (eventType.includes('status') || eventType.includes('convert')) return { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' };
    return { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600' };
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes('payment')) return DollarSign;
    if (eventType.includes('commission')) return CreditCard;
    if (eventType.includes('refund') || eventType.includes('reject')) return XCircle;
    if (eventType.includes('approved')) return CheckCircle;
    if (eventType.includes('fraud') || eventType.includes('alert')) return AlertTriangle;
    return Clock;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      enrolled: 'bg-green-100 text-green-700',
      payment_pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="payment-timeline-page">
      {/* Back Button */}
      <Link to="/portal/admin/applications" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} />
        <span className="text-sm">Back to Enrolments</span>
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-slate-900">Payment Timeline</h1>
        {enrolment && (
          <p className="text-sm text-slate-500 mt-1">
            {enrolment.student_name} — {enrolment.programme_name || 'Programme'}
          </p>
        )}
      </div>

      {/* Enrolment Summary Card */}
      {enrolment && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-heading">Student</p>
              <p className="text-sm text-slate-900 font-medium">{enrolment.student_name}</p>
              <p className="text-xs text-slate-500">{enrolment.student_email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-heading">Rep</p>
              <p className="text-sm text-slate-900">{enrolment.rep_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-heading">Programme</p>
              <p className="text-sm text-slate-900">{enrolment.programme_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-heading">Enrolled On</p>
              <p className="text-sm text-slate-900">
                {enrolment.enrolled_at ? new Date(enrolment.enrolled_at).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-heading">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(enrolment.status)}`}>
                {enrolment.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-heading">Total Paid</p>
              <p className="text-sm text-green-600 font-semibold">£{parseFloat(enrolment.total_paid || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-heading text-lg text-slate-900 mb-6">Event Timeline</h2>

        {timeline.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No events recorded for this enrolment.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-6">
              {timeline.map((event, index) => {
                const colors = getEventColor(event.event_type);
                const IconComponent = getEventIcon(event.event_type);
                
                return (
                  <div key={index} className="relative flex gap-4">
                    {/* Dot */}
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center z-10 flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${colors.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-heading text-sm text-slate-900">{event.title}</h3>
                        <span className="text-xs text-slate-400">{formatDate(event.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600">{event.description}</p>
                      <p className="text-xs text-slate-400 mt-1">By: {event.actor}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTimelinePage;
