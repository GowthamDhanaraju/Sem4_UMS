import React, { useState, useEffect } from "react";
import TeacherSidebar from "@/components/teacher_sidebar";
import TopBar from "@/components/topbar";
import { useRouter } from "next/router";
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import axios from "axios";
import { Typography } from "@mui/material";

interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  section: string;
  semester: number;
  time: string;
  room: string;
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  dutyLeave: number;
  medical: number;
  notTaken: number;
}

const TeacherAttendance: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayCourses, setTodayCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<Course | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [dateString, setDateString] = useState<string>("");
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ [studentId: string]: string }>({});
  const [tempAttendance, setTempAttendance] = useState<{ [studentId: string]: string }>({});
  const [editingAttendance, setEditingAttendance] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    present: 0,
    absent: 0,
    dutyLeave: 0,
    medical: 0,
    notTaken: 0
  });

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "teacher") {
      router.push("/");
      return;
    }
    
    fetchTodayCourses();
  }, [router]);

  useEffect(() => {
    // Update date-related state when selected date changes
    setDateString(format(selectedDate, 'yyyy-MM-dd'));
    setDayOfWeek(format(selectedDate, 'EEEE').toUpperCase());
  }, [selectedDate]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsByCourse(selectedCourse);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse && dateString) {
      fetchAttendance(selectedCourse, dateString);
    }
  }, [selectedCourse, dateString]);

  const fetchTodayCourses = async () => {
    try {
      setLoading(true);
      setError("");
      
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await axios.get("/api/teacher/daily-courses", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTodayCourses(response.data.data.courses);
        setDayOfWeek(response.data.data.day);
        
        // If there are courses, select the first one
        if (response.data.data.courses.length > 0) {
          const firstCourse = response.data.data.courses[0];
          setSelectedCourse(firstCourse.id);
          setSelectedCourseDetails(firstCourse);
        }
      } else {
        setError(response.data.message || "Failed to load courses");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch courses: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsByCourse = async (courseId: string) => {
    try {
      setLoading(true);
      setError("");
      
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await axios.get(`/api/teacher/students-by-course?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStudentList(response.data.data);
        
        // Find course details
        const course = todayCourses.find(c => c.id === courseId);
        if (course) {
          setSelectedCourseDetails(course);
        }
      } else {
        setError(response.data.message || "Failed to load students");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch students: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (courseId: string, date: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await axios.get(`/api/teacher/attendance?courseId=${courseId}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(response.data)) {
        const newAttendanceData: { [studentId: string]: string } = {};
        
        // Map attendance records to studentIds
        response.data.forEach((record: any) => {
          if (record.studentId && record.status) {
            newAttendanceData[record.studentId] = record.status;
          }
        });
        
        setAttendanceData(newAttendanceData);
        // Initialize temp attendance with current data
        setTempAttendance({...newAttendanceData});
        
        // Update statistics
        calculateStats(newAttendanceData);
      }
    } catch (err) {
      console.error(`Failed to fetch attendance for course ${courseId}:`, err);
      // Initialize with empty data
      setAttendanceData({});
      setTempAttendance({});
    }
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourseId = e.target.value;
    setSelectedCourse(newCourseId);
    setEditingAttendance(false);
  };

  const handleDateChange = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
    setEditingAttendance(false);
  };

  const startEditing = () => {
    setEditingAttendance(true);
    setTempAttendance({...attendanceData});
  };

  const cancelEditing = () => {
    setEditingAttendance(false);
  };

  const saveAttendance = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      // Prepare attendance records for API
      const records = Object.entries(tempAttendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const response = await axios.post(
        "/api/teacher/attendance",
        {
          courseId: selectedCourse,
          date: dateString,
          records,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update local state
        setAttendanceData({...tempAttendance});
        calculateStats(tempAttendance);
        setEditingAttendance(false);
        alert("Attendance saved successfully!");
      } else {
        alert("Failed to save attendance: " + response.data.message);
      }
    } catch (err) {
      console.error("Failed to save attendance:", err);
      alert("Failed to save attendance. Please try again.");
    }
  };

  const updateAttendance = (studentId: string, status: string) => {
    setTempAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const calculateStats = (data: { [studentId: string]: string }) => {
    const totalStudents = studentList.length;
    let presentCount = 0;
    let absentCount = 0;
    let dutyLeaveCount = 0;
    let medicalCount = 0;
    let notTakenCount = 0;

    studentList.forEach((student) => {
      const status = data[student.id];
      
      if (status === "present") presentCount++;
      else if (status === "absent") absentCount++;
      else if (status === "dutyLeave") dutyLeaveCount++;
      else if (status === "medical") medicalCount++;
      else notTakenCount++;
    });

    setStats({
      total: totalStudents,
      present: presentCount,
      absent: absentCount,
      dutyLeave: dutyLeaveCount,
      medical: medicalCount,
      notTaken: notTakenCount
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <TeacherSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-white">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <TeacherSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="ml-6 mr-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="p-3 mr-4 bg-blue-600 rounded-xl shadow-lg">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <Typography variant="h4" component="h1" className="font-bold bg-blue-500 bg-clip-text text-transparent">
              Attendance Management
            </Typography>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-800 rounded-lg p-3 mb-6 text-red-200">
              <p>{error}</p>
            </div>
          )}

          {/* Course Selection */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label htmlFor="course-select" className="block mb-2 text-sm font-medium text-gray-400">
                Select Course
              </label>
              <select
                id="course-select"
                value={selectedCourse}
                onChange={handleCourseChange}
                className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg block w-full p-2.5 focus:ring-blue-500 focus:border-blue-500"
                disabled={editingAttendance}
              >
                <option value="">Select a course</option>
                {todayCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name} (Section {course.section})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 rounded-l-lg bg-gray-700 hover:bg-gray-600 border-r border-gray-600"
                disabled={editingAttendance}
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-300" />
              </button>
              <div className="px-4 py-2 bg-gray-700 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-300" />
                <span>{format(selectedDate, 'dd MMM yyyy')}</span>
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="p-2 rounded-r-lg bg-gray-700 hover:bg-gray-600"
                disabled={editingAttendance}
              >
                <ArrowRightIcon className="h-5 w-5 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Selected Course Info */}
          {selectedCourseDetails && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-xs font-medium text-gray-400">Course</h3>
                  <p className="text-lg font-semibold">{selectedCourseDetails.code} - {selectedCourseDetails.name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400">Section</h3>
                  <p className="text-lg font-semibold">{selectedCourseDetails.section}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400">Time</h3>
                  <p className="text-lg font-semibold">{selectedCourseDetails.time}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400">Room</h3>
                  <p className="text-lg font-semibold">{selectedCourseDetails.room}</p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {selectedCourse && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              <div className="bg-gray-800 p-3 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold text-gray-400">Total</h3>
                <p className="text-xl font-bold text-gray-200">{stats.total}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold text-gray-400">Present</h3>
                <p className="text-xl font-bold text-green-400">{stats.present}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold text-gray-400">Absent</h3>
                <p className="text-xl font-bold text-red-400">{stats.absent}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold text-gray-400">Duty Leave</h3>
                <p className="text-xl font-bold text-yellow-400">{stats.dutyLeave}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold text-gray-400">Medical</h3>
                <p className="text-xl font-bold text-blue-400">{stats.medical}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold text-gray-400">Not Taken</h3>
                <p className="text-xl font-bold text-gray-400">{stats.notTaken}</p>
              </div>
            </div>
          )}

          {/* Student List */}
          {selectedCourse && (
            <div className="bg-gray-800 rounded-lg shadow-md">
              <div className="p-4 flex justify-between items-center border-b border-gray-700">
                <h2 className="text-xl font-semibold">
                  <UserGroupIcon className="h-5 w-5 inline mr-2" />
                  Student Attendance
                </h2>
                <div className="space-x-2">
                  {editingAttendance ? (
                    <>
                      <button
                        onClick={saveAttendance}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-colors"
                      >
                        Save Attendance
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-md transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors"
                    >
                      Mark Attendance
                    </button>
                  )}
                </div>
              </div>

              {studentList.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No students enrolled in this course.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 text-gray-300">
                      <tr>
                        <th className="p-3 text-left">Student ID</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-center">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {studentList.map((student) => {
                        const currentStatus = editingAttendance 
                          ? tempAttendance[student.id] 
                          : attendanceData[student.id] || "notTaken";
                        
                        return (
                          <tr key={student.id} className="hover:bg-gray-750 transition-colors">
                            <td className="p-3 text-gray-300">{student.studentId}</td>
                            <td className="p-3">
                              <div className="font-medium text-gray-100">{student.name}</div>
                            </td>
                            <td className="p-3 text-center">
                              {editingAttendance ? (
                                <div className="flex justify-center gap-2">
                                  <button 
                                    onClick={() => updateAttendance(student.id, "present")}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                                      ${currentStatus === 'present' ? 'bg-green-700 text-white' : 'bg-gray-700 text-green-400 hover:bg-green-900'}`}
                                  >
                                    Present
                                  </button>
                                  <button 
                                    onClick={() => updateAttendance(student.id, "absent")}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                                      ${currentStatus === 'absent' ? 'bg-red-700 text-white' : 'bg-gray-700 text-red-400 hover:bg-red-900'}`}
                                  >
                                    Absent
                                  </button>
                                  <div className="relative group">
                                    <button 
                                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                                        ${currentStatus !== 'present' && currentStatus !== 'absent' && currentStatus !== 'notTaken' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-blue-400 hover:bg-blue-900'}`}
                                    >
                                      {currentStatus === 'notTaken' ? 'More...' : 
                                       currentStatus === 'dutyLeave' ? 'Duty Leave' : 
                                       currentStatus === 'medical' ? 'Medical' : 'More...'}
                                    </button>
                                    <div className="absolute z-10 right-0 mt-1 hidden group-hover:block">
                                      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
                                        <button 
                                          onClick={() => updateAttendance(student.id, "dutyLeave")}
                                          className="block w-full text-left px-4 py-1 text-sm text-yellow-400 hover:bg-gray-700"
                                        >
                                          Duty Leave
                                        </button>
                                        <button 
                                          onClick={() => updateAttendance(student.id, "medical")}
                                          className="block w-full text-left px-4 py-1 text-sm text-blue-400 hover:bg-gray-700"
                                        >
                                          Medical
                                        </button>
                                        <button 
                                          onClick={() => updateAttendance(student.id, "notTaken")}
                                          className="block w-full text-left px-4 py-1 text-sm text-gray-400 hover:bg-gray-700"
                                        >
                                          Not Taken
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                                  ${currentStatus === 'present' ? 'bg-green-900 bg-opacity-30 text-green-400' : 
                                    currentStatus === 'absent' ? 'bg-red-900 bg-opacity-30 text-red-400' : 
                                    currentStatus === 'dutyLeave' ? 'bg-yellow-900 bg-opacity-30 text-yellow-400' : 
                                    currentStatus === 'medical' ? 'bg-blue-900 bg-opacity-30 text-blue-400' : 
                                    'bg-gray-700 bg-opacity-30 text-gray-400'}`}
                                >
                                  {currentStatus === 'notTaken' ? 'Not Taken' : 
                                   currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
