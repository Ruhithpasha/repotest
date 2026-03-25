import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Circle,
  Loader2,
  BookOpen,
  Play,
  PartyPopper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const CourseDetailPage = () => {
  const { programmeId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [programmeId]);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/student/courses/${programmeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourse(response.data.course);
      setModules(response.data.modules || []);
      
      // Auto-select first non-completed module or first module
      const firstIncomplete = response.data.modules.find(m => m.status !== 'completed');
      setSelectedModule(firstIncomplete || response.data.modules[0]);
    } catch (error) {
      console.error("Error fetching course:", error);
      if (error.response?.status === 403) {
        toast.error("You are not enrolled in this course");
      } else {
        toast.error("Failed to load course");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (moduleId, status) => {
    setUpdatingProgress(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${API}/student/courses/${programmeId}/modules/${moduleId}/progress`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setModules(prev => prev.map(m => 
        m.id === moduleId 
          ? { ...m, status: response.data.module.status, completed_at: response.data.module.completed_at }
          : m
      ));

      setCourse(prev => ({
        ...prev,
        ...response.data.overallProgress
      }));

      if (status === 'in_progress') {
        toast.success("Module started");
      } else if (status === 'completed') {
        toast.success("Module completed!");
        
        // Check if course is complete
        if (response.data.overallProgress.isComplete) {
          setShowCongrats(true);
        } else {
          // Auto-navigate to next module
          const currentIndex = modules.findIndex(m => m.id === moduleId);
          const nextModule = modules[currentIndex + 1];
          if (nextModule) {
            setSelectedModule(nextModule);
          }
        }
      }
    } catch (error) {
      toast.error("Failed to update progress");
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'in_progress':
        return <Clock className="text-blue-500" size={20} />;
      default:
        return <Circle className="text-slate-300" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="course-loading">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Course not found</p>
        <Link to="/portal/student/courses">
          <Button variant="outline" className="mt-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to My Courses
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="course-detail-page">
      {/* Header */}
      <div>
        <Link 
          to="/portal/student/courses" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          My Courses
        </Link>
        
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          {course.program_name}
        </h1>
        
        <p className="text-sm text-slate-500 mt-1">
          {course.totalModules} modules · {course.totalDuration} mins total
        </p>

        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600">Overall Progress</span>
            <span className="font-medium text-slate-900">{course.progressPercent}%</span>
          </div>
          <Progress value={course.progressPercent} className="h-3" />
        </div>
      </div>

      {/* Congratulations Banner */}
      {showCongrats && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <PartyPopper className="mx-auto text-green-500 mb-3" size={40} />
          <h2 className="font-heading text-xl font-semibold text-green-800 mb-2">
            Congratulations!
          </h2>
          <p className="text-green-700">
            You've completed <strong>{course.program_name}</strong>. Well done!
          </p>
          <Button 
            onClick={() => setShowCongrats(false)}
            className="mt-4 bg-green-500 hover:bg-green-600 text-white"
          >
            Continue Exploring
          </Button>
        </div>
      )}

      {/* Course Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Module List (Sidebar) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-gray-50">
            <h2 className="font-heading font-medium text-slate-900">Modules</h2>
          </div>
          <div className="divide-y divide-slate-200 max-h-[500px] overflow-y-auto">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedModule?.id === module.id ? 'bg-amber-50' : ''
                }`}
                data-testid={`module-list-item-${module.id}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(module.status)}
                  <div className="flex-1 min-w-0">
                    <p className={`font-heading font-medium text-sm ${
                      selectedModule?.id === module.id ? 'text-amber-700' : 'text-slate-900'
                    }`}>
                      {String(module.order).padStart(2, '0')}. {module.title}
                    </p>
                    {module.duration_minutes && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {module.duration_minutes} min
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Module Content */}
        <div className="lg:col-span-2">
          {selectedModule ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              {/* Module Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-slate-900">
                      {selectedModule.title}
                    </h2>
                    {selectedModule.description && (
                      <p className="text-slate-500 mt-2">{selectedModule.description}</p>
                    )}
                    {selectedModule.duration_minutes && (
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-2">
                        <Clock size={14} />
                        {selectedModule.duration_minutes} minutes
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedModule.status === 'completed' 
                      ? 'bg-green-100 text-green-700'
                      : selectedModule.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedModule.status === 'completed' 
                      ? 'Completed' 
                      : selectedModule.status === 'in_progress' 
                        ? 'In Progress' 
                        : 'Not Started'}
                  </div>
                </div>
              </div>

              {/* Module Content */}
              <div className="p-6">
                {selectedModule.content ? (
                  <div 
                    className="prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedModule.content }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto text-slate-300 mb-4" size={40} />
                    <p className="text-slate-500">
                      No content available for this module yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-slate-200 bg-gray-50">
                {selectedModule.status === 'not_started' && (
                  <Button
                    onClick={() => updateProgress(selectedModule.id, 'in_progress')}
                    disabled={updatingProgress}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    data-testid="start-module-btn"
                  >
                    {updatingProgress ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Play size={16} className="mr-2" />
                        Start Module
                      </>
                    )}
                  </Button>
                )}

                {selectedModule.status === 'in_progress' && (
                  <Button
                    onClick={() => updateProgress(selectedModule.id, 'completed')}
                    disabled={updatingProgress}
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    data-testid="complete-module-btn"
                  >
                    {updatingProgress ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                )}

                {selectedModule.status === 'completed' && (
                  <Button
                    disabled
                    className="w-full bg-green-100 text-green-700 cursor-default"
                    data-testid="completed-badge"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Completed ✓
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <BookOpen className="mx-auto text-slate-300 mb-4" size={40} />
              <p className="text-slate-500">Select a module to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
