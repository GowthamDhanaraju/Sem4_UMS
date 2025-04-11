import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import StudentSidebar from '@/components/student_sidebar';
import TopBar from '@/components/topbar';
import { FaUserCircle, FaCalendarAlt, FaBook, FaClock, FaClipboardList, FaAward } from 'react-icons/fa';

// Component to display the header with student info
const Header = ({ studentName, program, semester }) => {
  const time = new Date();
  const hours = time.getHours();
  let greeting = "Good Morning";
  
  if (hours >= 12 && hours < 17) {
    greeting = "Good Afternoon";
  } else if (hours >= 17) {
    greeting = "Good Evening";
  }
  
  return (
    <div className="bg-gradient-to-r from-green-700 to-emerald-800 p-6 rounded-xl shadow-lg text-white ml-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{greeting}, {studentName}</h2>
          <p className="text-sm text-indigo-100 mt-1">
            {time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full">
          <FaUserCircle className="text-xl" />
          <span className="font-medium">{program}</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <InfoBox icon={<FaCalendarAlt />} label="Current Semester" value={`Semester ${semester}`} />
      </div>
    </div>
  );
};

// Component for info boxes
const InfoBox = ({ icon, label, value }) => (
  <div className="flex items-center space-x-2">
    <div className="p-2 bg-white/10 rounded-lg">
      {icon}
    </div>
    <div>
      <div className="text-xs text-indigo-100">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  </div>
);

// Component for the timetable
const Timetable = ({ scheduleData }) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const [activeDay, setActiveDay] = useState(0);
  
  // Get current day and set it as active day
  useEffect(() => {
    const currentDay = new Date().getDay();
    // Convert to 0-4 (Monday-Friday) from 1-5
    const dayIndex = currentDay === 0 || currentDay === 6 ? 0 : currentDay - 1;
    setActiveDay(dayIndex);
  }, []);
  
  const activeSchedule = scheduleData[days[activeDay]] || [];
  
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 ml-5">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xl font-bold text-white">Today's Schedule</h3>
        <div className="flex space-x-2">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`px-3 py-1 text-sm rounded-md ${activeDay === i ? "bg-green-500 text-white" : "text-grey-200 hover:bg-green-600"}`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      
      {activeSchedule.length > 0 ? (
        <div className="space-y-3">
          {activeSchedule.map((schedule) => (
            <div key={schedule.id} className="flex items-center bg-gray-700/50 p-3 rounded-lg hover:bg-gray-700 transition">
              <div className="w-28 text-sm text-gray-300">{schedule.timeSlot}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{schedule.courseName}</div>
                  <div className={`text-xs px-2 py-0.5 rounded mr-1 ${
                    schedule.type === 'LECTURE' ? 'bg-blue-900/40 text-blue-200' :
                    schedule.type === 'LAB' ? 'bg-green-900/40 text-green-200' :
                    'bg-purple-900/40 text-purple-200'
                  }`}>
                    {schedule.type.charAt(0) + schedule.type.slice(1).toLowerCase()}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                  <div>
                    <span className="inline-block">{schedule.courseCode}</span>
                    <span className="mx-1">•</span>
                    <span className="inline-block">Room {schedule.room}</span>
                  </div>
                  <div>
                    <span className="inline-block">{schedule.teacher}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <FaCalendarAlt className="mx-auto text-3xl mb-2" />
          <p>No classes scheduled for {days[activeDay]}</p>
        </div>
      )}
    </div>
  );
};

// Quick Actions component
const QuickActions = () => {
  const router = useRouter();
  
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 ml-5 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button className="bg-gradient-to-r from-teal-600 to-teal-800 p-3 rounded-lg w-full flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:from-teal-500 hover:to-teal-700"
          onClick={() => router.push("/student/student_courses")}>
          <FaBook className="mr-2" /> Courses Registered
        </button>
        <button className="bg-gradient-to-r from-purple-600 to-purple-800 p-3 rounded-lg w-full flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:from-purple-500 hover:to-purple-700"
          onClick={() => router.push("/student/student_attendance")}>
          <FaClipboardList className="mr-2" /> Attendance
        </button>
        <button className="bg-gradient-to-r from-rose-600 to-rose-800 p-3 rounded-lg w-full flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:from-rose-500 hover:to-rose-700"
          onClick={() => router.push("/student/student_grade")}>
          <FaAward className="mr-2" /> View Grades
        </button>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const [studentData, setStudentData] = useState<any>(null);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState({
    good: 0,
    warning: 0,
    critical: 0
  });
  const router = useRouter();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/login');
          return;
        }
        
        const storedRole = localStorage.getItem('role');
        if (storedRole !== 'student') {
          router.push('/');
          return;
        }
        
        // Fetch student profile data
        const profileResponse = await fetch('/api/student/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!profileResponse.ok) {
          throw new Error(`Error ${profileResponse.status}: ${profileResponse.statusText}`);
        }
        
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
          throw new Error(profileData.message || 'Failed to load student data');
        }
        
        // Save student data
        setStudentData(profileData.data);
        localStorage.setItem("userName", profileData.data.name || "Student");
        localStorage.setItem("userEmail", profileData.data.email || "student@university.edu");
        setCourseData(profileData.data.currentCourses || []);
        
        // Fetch schedule data
        try {
          const scheduleResponse = await fetch('/api/student/schedule', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            
            if (scheduleData.success) {
              setScheduleData(scheduleData.data);
            } else {
              console.error('Schedule data error:', scheduleData.message);
              setScheduleData(generateFallbackSchedule(profileData?.data?.dept || 'CSE'));
            }
          } else {
            throw new Error(`Error ${scheduleResponse.status}`);
          }
        } catch (err) {
          console.error('Failed to fetch schedule data:', err);
          setScheduleData(generateFallbackSchedule(profileData?.data?.dept || 'CSE'));
        }
        
        // For demo purposes - simulate mock attendance summary
        setAttendanceSummary({
          good: Math.floor(Math.random() * 3) + 2,
          warning: Math.floor(Math.random() * 2) + 1,
          critical: Math.floor(Math.random() * 2)
        });
        
        setError("");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to fetch data: ${errorMessage}`);
        console.error(err);
        
        // Set fallback data for schedule in case of error
        setScheduleData(generateFallbackSchedule('CSE'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);
  
  // Helper function to generate fallback schedule data
  function generateFallbackSchedule(deptCode: string) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const courses = {
      'CSE': [
        { code: 'CSE101', name: 'Introduction to Programming', type: 'LECTURE', teacher: 'Dr. Smith', room: '101' },
        { code: 'CSE102', name: 'Data Structures', type: 'LECTURE', teacher: 'Dr. Johnson', room: '102' },
        { code: 'CSE103', name: 'OOP Concepts', type: 'LAB', teacher: 'Prof. Williams', room: 'Lab 3' },
        { code: 'CSE104', name: 'Database Systems', type: 'LECTURE', teacher: 'Dr. Brown', room: '104' }
      ],
      'ECE': [
        { code: 'ECE101', name: 'Circuit Theory', type: 'LECTURE', teacher: 'Dr. Wilson', room: '201' },
        { code: 'ECE102', name: 'Digital Electronics', type: 'LECTURE', teacher: 'Prof. Davis', room: '202' },
        { code: 'ECE103', name: 'Signals & Systems', type: 'LAB', teacher: 'Dr. Miller', room: 'Lab 5' }
      ]
    };
    
    const timeSlots = [
      '09:00 - 09:50', 
      '10:00 - 10:50', 
      '11:00 - 11:50', 
      '14:00 - 14:50',
      '15:00 - 15:50'
    ];
    
    const schedule = {};
    
    days.forEach(day => {
      const coursesForDay = [];
      const coursesForDept = courses[deptCode] || courses['CSE'];
      
      // Add 2-3 classes per day
      const numClasses = Math.floor(Math.random() * 2) + 2; // 2-3 classes
      
      for (let i = 0; i < numClasses; i++) {
        if (i < timeSlots.length && i < coursesForDept.length) {
          const course = coursesForDept[i];
          coursesForDay.push({
            id: `${day}-${i}`,
            timeSlot: timeSlots[i],
            courseName: course.name,
            courseCode: course.code,
            teacher: course.teacher,
            room: course.room,
            type: course.type
          });
        }
      }
      
      schedule[day] = coursesForDay;
    });
    
    return schedule;
  }
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-xl">Loading dashboard...</span>
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
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-8 max-w-2xl">
              <h2 className="text-2xl font-bold text-red-400 mb-3">Error Loading Dashboard</h2>
              <p className="text-gray-300 mb-4">{error}</p>
              <p className="text-gray-400 mb-4">There may be an issue with the server or API connection. Please try refreshing the page or contact support.</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
              >
                Refresh Page
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
        <div className="flex flex-col">
          <div className="flex-1 space-y-6">
            <Header 
              studentName={studentData?.name || "Student"} 
              program={studentData?.dept || "B.Tech CSE"} 
              semester={studentData?.semester || "1"}
            />
            <Timetable scheduleData={scheduleData} />
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;