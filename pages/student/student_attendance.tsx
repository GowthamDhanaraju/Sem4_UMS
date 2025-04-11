import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import StudentSidebar from "@/components/student_sidebar";
import TopBar from "@/components/topbar";
import { Typography } from "@mui/material";
import { 
  FiCalendar, 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle 
} from "react-icons/fi";

interface CourseAttendance {
  id: string;
  code: string;
  name: string;
  section: string;
  attendancePercentage: number;
  totalClasses: number;
  present: number;
  absent: number;
  medical: number;
  dutyLeave: number;
  records: Array<{
    date: string;
    status: string;
    note?: string;
  }>;
}

interface SemesterData {
  semester: number;
  year: number;
  courses: CourseAttendance[];
}

const StudentAttendance: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendanceData, setAttendanceData] = useState<SemesterData[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "student") {
      router.push("/");
      return;
    }
    
    fetchAttendanceData();
  }, [router]);
  
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const studentId = localStorage.getItem("userId");
      
      if (!token || !studentId) {
        router.push("/login");
        return;
      }
      
      const response = await fetch(`/api/students/${studentId}/attendance`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.data);
        
        // Set default selections if data is available
        if (data.data.length > 0) {
          const latestSemester = data.data[0];
          setSelectedSemester(`${latestSemester.year}-${latestSemester.semester}`);
          
          if (latestSemester.courses.length > 0) {
            setSelectedCourse(latestSemester.courses[0].id);
          }
        }
      } else {
        setError(data.message || "Failed to load attendance data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch attendance: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSemesterChange = (semesterKey: string) => {
    setSelectedSemester(semesterKey);
    
    // Find the selected semester
    const [year, semester] = semesterKey.split('-').map(Number);
    const selectedSemData = attendanceData.find(
      sem => sem.year === year && sem.semester === parseInt(semester.toString())
    );
    
    // Reset and set course if available
    if (selectedSemData && selectedSemData.courses.length > 0) {
      setSelectedCourse(selectedSemData.courses[0].id);
    } else {
      setSelectedCourse("");
    }
  };
  
  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
  };
  
  const getStatusColor = (status: string) => {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case 'PRESENT':
        return 'bg-green-500';
      case 'ABSENT':
        return 'bg-red-500';
      case 'EXCUSED':
      case 'MEDICAL':
      case 'DUTYLEAVE':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getStatusIcon = (status: string) => {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case 'PRESENT':
        return <FiCheckCircle className="mr-1" />;
      case 'ABSENT':
        return <FiXCircle className="mr-1" />;
      case 'EXCUSED':
      case 'MEDICAL':
      case 'DUTYLEAVE':
        return <FiAlertCircle className="mr-1" />;
      default:
        return null;
    }
  };
  
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-500';
    if (percentage >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Get currently selected semester data
  const getCurrentSemesterData = () => {
    if (!selectedSemester) return null;
    
    const [year, semester] = selectedSemester.split('-').map(Number);
    return attendanceData.find(
      sem => sem.year === year && sem.semester === parseInt(semester.toString())
    );
  };
  
  // Get currently selected course data
  const getSelectedCourseData = () => {
    const semesterData = getCurrentSemesterData();
    if (!semesterData || !selectedCourse) return null;
    
    return semesterData.courses.find(course => course.id === selectedCourse);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-xl">Loading attendance data...</span>
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
          <div className="flex justify-center items-center h-[80vh] flex-col">
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg max-w-md">
              <p>{error}</p>
              <button 
                onClick={fetchAttendanceData} 
                className="mt-2 text-sm underline hover:text-white"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const semesterData = getCurrentSemesterData();
  const selectedCourseData = getSelectedCourseData();
  
  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <StudentSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex items-center mb-8 ml-6">
          <div className="p-3 mr-4 bg-green-500 rounded-xl shadow-lg">
            <FiCalendar className="text-gray-100 text-2xl" />
          </div>
          <Typography 
            variant="h4" 
            component="h1" 
            className="font-bold bg-green-500 bg-clip-text text-transparent"
          >
            Attendance Records
          </Typography>
        </div>
        
        {attendanceData.length === 0 ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 ml-6">
            <p className="text-center text-gray-400">No attendance records found for any registered courses.</p>
          </div>
        ) : (
          <>
            {/* Semester Selector */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 ml-6">
              <h3 className="text-xl font-bold mb-4 text-green-400">Select Semester</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attendanceData.map((semester) => (
                  <div 
                    key={`${semester.year}-${semester.semester}`}
                    onClick={() => handleSemesterChange(`${semester.year}-${semester.semester}`)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedSemester === `${semester.year}-${semester.semester}` 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <h4 className="font-bold">Year {semester.year}</h4>
                    <p className="text-sm">Semester {semester.semester}</p>
                    <div className="mt-1 text-xs">
                      <span>{semester.courses.length} Courses</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Course Selector */}
            {semesterData && (
              <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 ml-6">
                <h3 className="text-xl font-bold mb-4 text-green-400">Select Course</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {semesterData.courses.map((course) => (
                    <div 
                      key={course.id}
                      onClick={() => handleCourseChange(course.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedCourse === course.id 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <h4 className="font-bold">{course.name}</h4>
                      <p className="text-sm">{course.code} - Section {course.section}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs">
                          <span>Attendance:</span>
                          <span className={getPercentageColor(course.attendancePercentage)}>
                            {course.attendancePercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 h-1.5 mt-1 rounded overflow-hidden">
                          <div 
                            className={`h-full ${
                              course.attendancePercentage >= 85 
                                ? 'bg-green-500' 
                                : course.attendancePercentage >= 75 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${course.attendancePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Attendance Details */}
            {selectedCourseData && (
              <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 ml-6 mb-6">
                <h3 className="text-xl font-bold mb-2 text-green-400">
                  {selectedCourseData.name} ({selectedCourseData.code}) - Section {selectedCourseData.section}
                </h3>
                
                {/* Attendance Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400">Total Classes</h4>
                    <p className="text-2xl font-bold">{selectedCourseData.totalClasses}</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400">Present</h4>
                    <p className="text-2xl font-bold text-green-500">{selectedCourseData.present}</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400">Absent</h4>
                    <p className="text-2xl font-bold text-red-500">{selectedCourseData.absent}</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400">Attendance Percentage</h4>
                    <p className={`text-2xl font-bold ${getPercentageColor(selectedCourseData.attendancePercentage)}`}>
                      {selectedCourseData.attendancePercentage}%
                    </p>
                  </div>
                </div>
                
                {/* Attendance History */}
                <h4 className="font-bold text-lg mb-3">Attendance History</h4>
                {selectedCourseData.records.length === 0 ? (
                  <p className="text-gray-400">No attendance records available for this course.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-700 text-gray-300">
                        <tr>
                          <th className="py-3 px-4 rounded-tl-lg">Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 rounded-tr-lg">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCourseData.records.map((record, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-700/30' : 'bg-gray-700/10'}>
                            <td className="py-3 px-4">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getStatusColor(record.status)}`}></span>
                                <div className="flex items-center">
                                  {getStatusIcon(record.status)}
                                  <span>{record.status.charAt(0) + record.status.slice(1).toLowerCase()}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {record.status.toUpperCase() === 'ABSENT' ? (
                                <span className="text-red-400">Class missed</span>
                              ) : record.status.toUpperCase() === 'EXCUSED' || 
                                  record.status.toUpperCase() === 'MEDICAL' || 
                                  record.status.toUpperCase() === 'DUTYLEAVE' ? (
                                <span className="text-yellow-400">{record.note || 'Excused absence'}</span>
                              ) : (
                                <span className="text-green-400">Attended</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;