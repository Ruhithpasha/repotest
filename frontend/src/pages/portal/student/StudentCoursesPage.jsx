import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  Loader2,
  ArrowRight,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const StudentCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/student/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      if (error.response?.status === 403) {
        setCourses([]);
      } else {
        toast.error("Failed to load courses");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="courses-loading">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-courses-page">
      <h1 className="font-heading text-2xl font-semibold text-slate-900">My Courses</h1>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <GraduationCap className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="font-heading text-xl text-slate-900 mb-2">
            No Active Courses
          </h2>
          <p className="text-slate-500">
            You have no active courses. Contact your advisor to get enrolled.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              data-testid={`course-card-${course.id}`}
            >
              {/* Course Header */}
              <div className="p-6 pb-4">
                <h3 className="font-heading font-semibold text-lg text-slate-900 mb-2">
                  {course.program_name}
                </h3>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <Progress 
                    value={course.progressPercent} 
                    className="h-2"
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {course.completedModules} of {course.totalModules} modules completed
                  </span>
                  <span className="font-medium text-slate-700">
                    {course.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Course Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-slate-200">
                {course.isComplete ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="font-medium">Completed</span>
                    </div>
                    <Link to={`/portal/student/courses/${course.id}`}>
                      <Button variant="outline" size="sm">
                        Review Course
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Link to={`/portal/student/courses/${course.id}`}>
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                      Continue
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
