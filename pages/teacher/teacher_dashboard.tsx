import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import TeacherSidebar from "@/components/teacher_sidebar";
import TopBar from "@/components/topbar";
import axios from "axios";

// Interfaces
interface TeacherProfile {
  name: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  sections: string[];
  students: number;
}

// TeacherDashboard Component
const TeacherDashboard: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => {
    return localStorage.getItem("token") || "";
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getToken();
        const role = localStorage.getItem("role");
        if (role !== "teacher") {
          router.push("/login");
          return;
        }

        const response = await axios.get("/api/teacher/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.email) {
          setProfile(response.data);
          localStorage.setItem("userName", response.data.name || "Teacher");
          localStorage.setItem("userEmail", response.data.email || "teacher@university.edu");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = getToken();
        const response = await axios.get("/api/teacher/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const uniqueCourses = response.data.filter(
          (course: Course, index: number, self: Course[]) =>
            index === self.findIndex((c) => c.id === course.id)
        );

        setCourses(uniqueCourses);
      } catch (err) {
        console.error("Failed to process courses:", err);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-white">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex">
      <TeacherSidebar />
      <div className="flex-1 ml-16 p-6">
        <TopBar />

        {/* Welcome Banner */}
        <div className="mt-6 mb-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-lg shadow-lg p-6 mx-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome, {profile?.name || 'Teacher'}
          </h1>
          <p className="text-indigo-200">
            {profile?.designation || 'Faculty'} | {profile?.department || 'Department'}
          </p>
        </div>

        {/* Main Content */}
        <div className="px-6">
          {/* Teaching Courses */}
          <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Your Teaching Courses</h2>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-gray-750 p-4 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-blue-300 mb-1">
                      {course.code}
                    </h3>
                    <p className="text-gray-200 mb-2">{course.name}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">
                        Sections: {course.sections.join(", ")}
                      </span>
                      <span className="bg-green-600 text-xs px-2 py-1 rounded">
                        {course.students} Students
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No courses assigned yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
