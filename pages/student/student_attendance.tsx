import React, { useState, useEffect } from "react";
import Sidebar from "../../components/student_sidebar";
import TopBar from "@/components/topbar";
import { FaTasks, FaChevronDown, FaChevronUp } from "react-icons/fa";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/router";

interface AttendanceRecord {
  courseID: string;
  courseName: string;
  courseCode: string;
  faculty: string;
  total: number;
  present: number;
  absent: number;
  dutyLeave: number;
  medical: number;
  absentDates: string[];
  presentDates: string[];
  dutyLeaveDates: string[];
  medicalDates: string[];
}

interface SemesterData {
  semester: string;
  year: number;
  records: AttendanceRecord[];
}

const Attendance: React.FC = () => {
  const router = useRouter();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<SemesterData[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Authentication check
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "student") {
      router.push("/");
      return;
    }

    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const studentId = localStorage.getItem("userId") || "";
        if (!studentId) {
          throw new Error("Student ID not found");
        }

        const timestamp = new Date().getTime();
        const response = await fetch(`/api/students/${studentId}/attendance?t=${timestamp}`);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          setAttendanceData(data.data || []);
          // Set the current semester as default
          if (data.data.length > 0) {
            setSelectedSemester(`${data.data[0].semester}-${data.data[0].year}`);
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

    fetchAttendance();
  }, [router]);

  const toggleRow = (courseID: string) => {
    setExpandedRow(expandedRow === courseID ? null : courseID);
  };

  const handleSemesterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSemester(event.target.value);
  };

  // Get the selected semester data
  const getSelectedSemesterData = (): SemesterData | null => {
    if (!selectedSemester || !attendanceData.length) return null;
    
    const [semester, yearStr] = selectedSemester.split('-');
    const year = parseInt(yearStr);
    
    return attendanceData.find(data => 
      data.semester === semester && data.year === year
    ) || null;
  };

  const selectedSemesterData = getSelectedSemesterData()?.records || [];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200 overflow-x-hidden">
        <div className="fixed z-50">
          <Sidebar />
        </div>
        <div className="flex-1 p-6 ml-16 w-[calc(100%-4rem)] relative">
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
      <div className="flex min-h-screen bg-gray-900 text-gray-200 overflow-x-hidden">
        <div className="fixed z-50">
          <Sidebar />
        </div>
        <div className="flex-1 p-6 ml-16 w-[calc(100%-4rem)] relative">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh] flex-col">
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg max-w-md">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
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

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200 overflow-x-hidden">
      {/* Sidebar */}
      <div className="fixed z-50">
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-6 ml-16 w-[calc(100%-4rem)] relative">
        <TopBar />

        <div className="flex-1 p-4">
          <div className="w-full mx-auto max-w-7xl">
            {/* Header and Dropdown */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
              <div className="flex items-center">
                <div className="p-3 mr-4 bg-green-500 rounded-xl shadow-lg">
                  <FaTasks className="text-gray-100 text-2xl" />
                </div>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  className="font-bold bg-green-500 bg-clip-text text-transparent"
                >
                  Attendance Overview
                </Typography>
              </div>

              {/* Semester Dropdown */}
              <div className="relative">
                <select
                  className="p-3 pl-4 pr-10 w-full md:w-64 bg-gray-800 text-gray-200 border border-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                  value={selectedSemester}
                  onChange={handleSemesterChange}
                >
                  {attendanceData.map((sem, index) => (
                    <option key={index} value={`${sem.semester}-${sem.year}`}>
                      {`${sem.semester} (${sem.year})`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                  <FaChevronDown />
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-700 to-gray-600 text-gray-100">
                    <th className="p-4 text-left rounded-tl-2xl">Course</th>
                    <th className="p-4 text-left">Faculty</th>
                    <th className="p-4 text-center">Total</th>
                    <th className="p-4 text-center">Present</th>
                    <th className="p-4 text-center">Duty Leave</th>
                    <th className="p-4 text-center">Absent</th>
                    <th className="p-4 text-center">Medical</th>
                    <th className="p-4 text-center rounded-tr-2xl">Percentage</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700">
                  {selectedSemesterData.map((record, index) => {
                    const attendancePercentage =
                      record.total > 0
                        ? ((record.present + record.dutyLeave + record.medical) / record.total) * 100
                        : 0;

                    const isExpanded = expandedRow === record.courseID;
                    let percentageColor = "text-red-400";
                    let percentageBg = "bg-red-900 bg-opacity-30";

                    if (attendancePercentage >= 75) {
                      percentageColor = "text-green-400";
                      percentageBg = "bg-green-900 bg-opacity-30";
                    } else if (attendancePercentage >= 60) {
                      percentageColor = "text-yellow-400";
                      percentageBg = "bg-yellow-900 bg-opacity-30";
                    }

                    return (
                      <React.Fragment key={index}>
                        <tr
                          onClick={() => toggleRow(record.courseID)}
                          className={`cursor-pointer transition-colors duration-200 ${isExpanded ? 'bg-gray-750' : 'hover:bg-gray-750'}`}
                        >
                          <td className="p-4">
                            <div className="font-medium text-gray-100">{record.courseName}</div>
                            <div className="text-sm text-gray-400">{record.courseID}</div>
                          </td>
                          <td className="p-4 text-gray-300">{record.faculty}</td>
                          <td className="p-4 text-center text-gray-300 font-medium">{record.total}</td>
                          <td className="p-4 text-center text-green-400 font-medium">{record.present}</td>
                          <td className="p-4 text-center text-yellow-400 font-medium">{record.dutyLeave}</td>
                          <td className="p-4 text-center text-red-400 font-medium">{record.absent}</td>
                          <td className="p-4 text-center text-blue-400 font-medium">{record.medical}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${percentageBg} ${percentageColor}`}>
                              {attendancePercentage.toFixed(1)}%
                            </span>
                            <div className="mt-1 text-xs text-gray-400">
                              {isExpanded ? <FaChevronUp className="mx-auto" /> : <FaChevronDown className="mx-auto" />}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-gray-750 transition-all duration-300">
                            <td colSpan={8} className="px-4 pb-4 text-sm">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                                <div className="p-3 bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600">
                                  <h4 className="font-bold text-red-400 mb-2 flex items-center">
                                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                                    Absent Days
                                  </h4>
                                  <p className="text-gray-300">
                                    {record.absentDates.length > 0 ? record.absentDates.join(", ") : "No absent days"}
                                  </p>
                                </div>
                                <div className="p-3 bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600">
                                  <h4 className="font-bold text-blue-400 mb-2 flex items-center">
                                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                                    Medical Leave
                                  </h4>
                                  <p className="text-gray-300">
                                    {record.medicalDates.length > 0 ? record.medicalDates.join(", ") : "No medical leave days"}
                                  </p>
                                </div>
                                <div className="p-3 bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600">
                                  <h4 className="font-bold text-yellow-400 mb-2 flex items-center">
                                    <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                                    Duty Leave
                                  </h4>
                                  <p className="text-gray-300">
                                    {record.dutyLeaveDates.length > 0 ? record.dutyLeaveDates.join(", ") : "No duty leave days"}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-gray-800 p-6 rounded-2xl shadow-md border-t-4 border-green-500">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Good Attendance</h3>
                <p className="text-3xl font-bold text-green-400">
                  {selectedSemesterData.filter(r => ((r.present + r.dutyLeave + r.medical) / r.total) >= 0.75).length}
                </p>
                <p className="text-sm text-gray-400 mt-1">Courses with ≥75% attendance</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl shadow-md border-t-4 border-yellow-500">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Warning Zone</h3>
                <p className="text-3xl font-bold text-yellow-400">
                  {selectedSemesterData.filter(r => {
                    const percentage = ((r.present + r.dutyLeave + r.medical) / r.total);
                    return percentage < 0.75 && percentage >= 0.6;
                  }).length}
                </p>
                <p className="text-sm text-gray-400 mt-1">Courses between 60-75%</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl shadow-md border-t-4 border-red-500">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Critical</h3>
                <p className="text-3xl font-bold text-red-400">
                  {selectedSemesterData.filter(r => ((r.present + r.dutyLeave + r.medical) / r.total) < 0.6).length}
                </p>
                <p className="text-sm text-gray-400 mt-1">Courses below 60%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;