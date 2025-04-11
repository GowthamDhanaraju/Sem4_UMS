import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import StudentSidebar from "@/components/student_sidebar";
import TopBar from "@/components/topbar";
import { Typography } from "@mui/material";
import { FiAward } from "react-icons/fi";

const GradesPage: React.FC = () => {
  const router = useRouter();
  const [selectedSemester, setSelectedSemester] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    id: "",
    program: ""
  });
  const [gradesData, setGradesData] = useState<{
    cgpa: number;
    totalCredits: number;
    semesters: Array<{
      semester: number;
      year: number;
      gpa: number;
      courses: Array<{
        code: string;
        name: string;
        credits: number;
        grade: string;
        points: number;
        department?: string;
      }>;
      totalCredits: number;
      totalPoints: number;
    }>;
  }>({
    cgpa: 0,
    totalCredits: 0,
    semesters: []
  });

  const [currentSemester, setCurrentSemester] = useState<{
    semester: number;
    year: number;
    gpa: number;
    courses: Array<{
      code: string;
      name: string;
      credits: number;
      grade: string;
      points: number;
      department?: string;
    }>;
    totalCredits: number;
    totalPoints: number;
  }>({
    semester: 0,
    year: 0,
    gpa: 0,
    courses: [],
    totalCredits: 0,
    totalPoints: 0
  });

  useEffect(() => {
    // Authentication check
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    
    if (!token || storedRole !== "student") {
      router.push("/login");
      return;
    }

    // Fetch student info and grades
    fetchStudentData();
  }, [router]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const studentId = localStorage.getItem("userId");
      
      if (!token || !studentId) {
        throw new Error("Authentication required");
      }
      
      // Get student profile info
      const profileResponse = await fetch(`/api/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!profileResponse.ok) {
        throw new Error(`Error ${profileResponse.status}: ${profileResponse.statusText}`);
      }
      
      const profileData = await profileResponse.json();
      setStudentInfo({
        name: profileData.user?.name || profileData.name || "Student",
        id: profileData.studentId || studentId,
        program: profileData.department?.name || "Program"
      });

      // Get grades data
      const gradesResponse = await fetch(`/api/students/${profileData.id || studentId}/grades`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!gradesResponse.ok) {
        throw new Error(`Error ${gradesResponse.status}: ${gradesResponse.statusText}`);
      }

      const data = await gradesResponse.json();

      if (data.success) {
        setGradesData(data.data);
        
        // Set current semester (most recent one)
        if (data.data.semesters.length > 0) {
          const sortedSemesters = [...data.data.semesters].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.semester - a.semester;
          });
          
          setCurrentSemester(sortedSemesters[0]);
          // Default to showing the most recent semester
          setSelectedSemester(`${sortedSemesters[0].semester}-${sortedSemesters[0].year}`);
        }
      } else {
        setError(data.message || "Failed to load grades data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch grades: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Map for grade colors
  const gradeColors: Record<string, string> = {
    "A+": "bg-green-500",
    "A": "bg-green-400",
    "A-": "bg-green-300",
    "B+": "bg-blue-500",
    "B": "bg-blue-400",
    "B-": "bg-blue-300",
    "C+": "bg-yellow-500",
    "C": "bg-yellow-400",
    "C-": "bg-yellow-300",
    "D+": "bg-orange-500",
    "D": "bg-orange-400",
    "F": "bg-red-500",
    "In Progress": "bg-gray-500"
  };

  // Convert semester number to text
  const getSemesterText = (sem: number | undefined) => {
    if (!sem) return "Unknown";
    return sem % 2 === 1 ? "Spring" : "Fall";
  };

  const displayedSemester = selectedSemester === "current" 
    ? currentSemester 
    : gradesData.semesters.find(
        sem => `${sem.semester}-${sem.year}` === selectedSemester
      ) || currentSemester;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
            <span className="ml-3 text-xl">Loading grades...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg max-w-lg">
              <p className="font-bold text-lg mb-2">Error Loading Grades</p>
              <p>{error}</p>
              <button 
                onClick={() => fetchStudentData()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
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
        <div className="flex justify-between items-center mb-8 mx-6">
          <div className="flex items-center">
            <div className="p-3 mr-4 bg-green-600 rounded-xl shadow-lg">
              <FiAward className="text-gray-100 text-2xl" />
            </div>
            <Typography 
              variant="h4" 
              component="h1" 
              className="font-bold bg-green-600 bg-clip-text text-transparent"
            >
              Student Grades
            </Typography>
          </div>

          <div>
            <select 
              className="bg-gray-800 text-white border-none outline-none px-4 py-2 rounded-md"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              {gradesData.semesters.map(sem => (
                <option key={`${sem.semester}-${sem.year}`} value={`${sem.semester}-${sem.year}`}>
                  {getSemesterText(sem.semester)} {sem.year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Overview */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 border border-gray-700 ml-6">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{studentInfo.name}</h2>
              <p className="text-gray-400">{studentInfo.program}</p>
              <p className="text-sm text-gray-400">Student ID: {studentInfo.id}</p>
              <p className="text-sm text-gray-400 mt-1">Completed Credits: {gradesData.totalCredits}</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <span className="block text-green-400 text-3xl font-bold">{gradesData.cgpa.toFixed(2)}</span>
                <span className="text-sm text-gray-400">CGPA</span>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <span className="block text-blue-400 text-3xl font-bold">
                  {displayedSemester?.gpa > 0 ? displayedSemester.gpa.toFixed(2) : "IP"}
                </span>
                <span className="text-sm text-gray-400">{getSemesterText(displayedSemester?.semester)} GPA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Semester Details */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 mb-6 ml-6">
          <h3 className="text-xl font-bold mb-4 text-green-500 flex items-center">
            {getSemesterText(displayedSemester?.semester)} {displayedSemester?.year}
            {displayedSemester?.courses.some(c => c.grade === "In Progress") && 
              <span className="ml-2 text-sm bg-blue-600 px-2 py-1 rounded-full">In Progress</span>
            }
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-3 rounded-tl-lg">Course Code</th>
                  <th className="p-3">Course Name</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3 rounded-tr-lg">Grade Point</th>
                </tr>
              </thead>
              <tbody>
                {displayedSemester?.courses.map((course, index) => (
                  <tr key={course.code} className={index % 2 === 0 ? 'bg-gray-750' : 'bg-gray-800'}>
                    <td className="p-3">{course.code}</td>
                    <td className="p-3">{course.name}</td>
                    <td className="p-3">{course.credits}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded ${gradeColors[course.grade] || 'bg-gray-600'}`}>
                        {course.grade}
                      </span>
                    </td>
                    <td className="p-3">{course.grade !== "In Progress" ? course.points.toFixed(1) : "-"}</td>
                  </tr>
                ))}
              </tbody>
              {displayedSemester?.gpa > 0 && (
                <tfoot>
                  <tr className="bg-gray-700">
                    <td colSpan={4} className="p-3 text-right font-bold">Semester GPA:</td>
                    <td className="p-3 font-bold text-green-400">{displayedSemester.gpa.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradesPage;