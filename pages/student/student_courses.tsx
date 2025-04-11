import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import StudentSidebar from "@/components/student_sidebar";
import TopBar from "@/components/topbar";
import { FaBook, FaInfoCircle, FaSearch } from "react-icons/fa";

interface Teacher {
  id: string;
  name: string;
  profileImage: string;
  designation: string;
  rating: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  teacher: Teacher;
  nextClass: string;
  hasFeedbackSubmitted: boolean;
}

const StudentCourses: React.FC = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Authentication check
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "student") {
      router.push("/");
      return;
    }

    // Fetch courses for the student
    const fetchCourses = async () => {
      try {
        setLoading(true);
        // Use the student ID from localStorage
        const studentId = localStorage.getItem("userId") || "";
        if (!studentId) {
          throw new Error("Student ID not found");
        }
        
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/students/${studentId}/courses?t=${timestamp}`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Format courses
          const formattedCourses = data.data.map((course: any) => ({
            id: course.id,
            code: course.code,
            name: course.title,
            description: course.description || "",
            credits: course.credits,
            status: "Enrolled",
            teacher: {
              id: course.instructorId,
              name: course.instructorName,
              department: course.department,
              profileImage: course.instructorImage || `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 50)}.jpg`,
              designation: course.instructorDesignation || "Professor",
              rating: course.instructorRating || (3 + Math.random() * 2).toFixed(1)
            },
            nextClass: course.schedule || "Not scheduled",
            hasFeedbackSubmitted: course.hasFeedbackSubmitted || false
          }));
          
          setCourses(formattedCourses);
        } else {
          setError(data.message || "Failed to load courses");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to fetch courses: ${errorMessage}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [router]);

  const handleFeedbackClick = (courseCode: string, teacherId: string) => {
    router.push(`/student/student_feedback?course=${courseCode}&teacher=${teacherId}`);
  };

  const handleTeacherProfileClick = (teacherId: string) => {
    router.push(`/student/student_faculties?id=${teacherId}`);
  };

  const filteredCourses = courses.filter((course) => 
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    course.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    course.teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-xl">Loading courses...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <StudentSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        
        <div className="mb-6 flex items-center">
          <div className="p-3 mr-4 bg-green-600 rounded-xl shadow-lg">
            <FaBook className="text-gray-100 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">My Courses</h1>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 mb-6 rounded-lg">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm underline hover:text-red-100"
            >
              Try again
            </button>
          </div>
        )}
        
        <div className="mb-6">
          <div className="relative w-full max-w-lg">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaSearch className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search courses or teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mb-6 ml-5">
          {filteredCourses.length === 0 ? (
            <div className="bg-gray-800 p-5 rounded-lg text-center border border-gray-700">
              <p className="text-gray-400">
                {searchTerm ? "No courses match your search" : "No courses found. Please contact your advisor."}
              </p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
                <div className="md:flex">
                  <div className="p-5 flex-1">
                    <h2 className="text-xl font-semibold mb-2 flex items-center">
                      <span className="text-blue-400">{course.code}</span>
                      <span className="mx-2">-</span>
                      <span>{course.name}</span>
                    </h2>
                    <p className="text-gray-300 mb-4">{course.description}</p>
                    <div className="mb-4">
                      <p className="flex items-center text-sm text-gray-400">
                        <FaInfoCircle className="mr-2" />
                        Next class: <span className="ml-1 text-blue-300">{course.nextClass}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-750 p-5 md:w-80 border-t md:border-t-0 md:border-l border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Course Faculty</h3>
                    <div className="flex items-center mb-4">
                      <div>
                        <img 
                          src={course.teacher.profileImage} 
                          alt={course.teacher.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                        />
                      </div>
                      <div className="ml-4">
                        <h4 className="font-medium">{course.teacher.name}</h4>
                        <p className="text-sm text-gray-400">{course.teacher.designation}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-yellow-400 text-sm">★</span>
                          <span className="text-sm ml-1">{course.teacher.rating}/5</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTeacherProfileClick(course.teacher.id)}
                      className="w-full py-2 mb-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleFeedbackClick(course.code, course.teacher.id)}
                      disabled={course.hasFeedbackSubmitted}
                      className={`w-full py-2 rounded-lg transition duration-200 ${
                        course.hasFeedbackSubmitted
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {course.hasFeedbackSubmitted ? "Feedback Submitted" : "Submit Feedback"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCourses;