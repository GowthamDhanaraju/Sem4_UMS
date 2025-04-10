import React, { useState, useEffect } from "react";
import TeacherSidebar from "@/components/teacher_sidebar";
import TopBar from "@/components/topbar";
import { CalendarIcon, MapPinIcon, UserGroupIcon, ClockIcon } from "@heroicons/react/24/outline";
import { FaChalkboardTeacher } from "react-icons/fa";
import { Typography } from "@mui/material";
import axios from "axios";
import { useRouter } from "next/router";

const TIME_SLOTS = [
  "9:00 - 9:50",
  "10:00 - 10:50",
  "11:00 - 11:50",
  "12:00 - 12:50",
  "1:00 - 1:50",
  "2:00 - 2:50",
  "3:00 - 3:50",
  "4:00 - 4:50"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const CLASSES = ["CSE-A", "CSE-B", "CSE-C", "CSE-D", "AID-A", "AID-B"];

// Sample data for teacher's timetable
interface ClassSession {
  id: string;
  subject: string;
  className: string;
  room: string;
  type: "lecture" | "lab" | "tutorial" | "break";
}

type TeacherTimetable = {
  [day: string]: {
    [timeSlot: string]: ClassSession | null;
  };
};

// Generate teacher timetable data
const generateTeacherTimetable = (): TeacherTimetable => {
  const timetable: TeacherTimetable = {};
  
  DAYS.forEach(day => {
    timetable[day] = {};
    TIME_SLOTS.forEach(timeSlot => {
      // Lunch break
      if (timeSlot === "1:00 - 1:50") {
        timetable[day][timeSlot] = {
          id: "BREAK",
          subject: "Lunch Break",
          className: "",
          room: "",
          type: "break"
        };
      } else {
        // 30% chance of having a class in this slot
        const hasClass = Math.random() < 0.3;
        
        if (hasClass) {
          const subjectIndex = Math.floor(Math.random() * CLASSES.length);
          const classIndex = Math.floor(Math.random() * CLASSES.length);
          const roomNumber = Math.floor(Math.random() * 10) + 101;
          const sessionTypes: ("lecture" | "lab" | "tutorial")[] = ["lecture", "lab", "tutorial"];
          const sessionType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
          
          timetable[day][timeSlot] = {
            id: `${day}-${timeSlot}`,
            subject: CLASSES[subjectIndex],
            className: CLASSES[classIndex],
            room: sessionType === "lab" ? `Lab ${roomNumber}` : `Room ${roomNumber}`,
            type: sessionType
          };
        } else {
          timetable[day][timeSlot] = null;
        }
      }
    });
  });
  
  return timetable;
};

const TeacherTimetable: React.FC = () => {
  const [timetable, setTimetable] = useState<TeacherTimetable>({});
  const [filterDay, setFilterDay] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState<string>("");
  const [teacherInfo, setTeacherInfo] = useState({
    id: "",
    name: "",
    department: "",
    subjects: [] as string[]
  });
  const router = useRouter();

  useEffect(() => {
    // Get current day of the week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    setCurrentDay(today === 'Sunday' || today === 'Saturday' ? 'Monday' : today);
    
    const fetchTimetableData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          router.push("/login");
          return;
        }
        
        // Fetch teacher profile first to get basic info
        const profileResponse = await axios.get("/api/teacher/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (profileResponse.data) {
          setTeacherInfo({
            id: profileResponse.data.facultyId || "T102",
            name: profileResponse.data.name || "Unknown",
            department: profileResponse.data.department || "Unknown",
            subjects: profileResponse.data.subjects || []
          });
        }
        
        // Fetch timetable data
        const timetableResponse = await axios.get("/api/teacher/timetable", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (timetableResponse.data) {
          // Transform API response to our timetable format
          const formattedTimetable: TeacherTimetable = {};
          
          DAYS.forEach(day => {
            formattedTimetable[day] = {};
            
            // Initialize all time slots as empty
            TIME_SLOTS.forEach(timeSlot => {
              formattedTimetable[day][timeSlot] = null;
            });
          });
          
          // Fill in the timetable with fetched sessions
          timetableResponse.data.forEach((session: any) => {
            if (session.day && session.timeSlot) {
              formattedTimetable[session.day][session.timeSlot] = {
                id: session.id || `${session.day}-${session.timeSlot}`,
                subject: session.subject || session.courseName,
                className: session.className || session.section,
                room: session.room || session.location,
                type: session.type || "lecture"
              };
            }
          });
          
          setTimetable(formattedTimetable);
        } else {
          // Fall back to generated data if no real data exists
          setTimetable(generateTeacherTimetable());
        }
      } catch (err) {
        console.error("Failed to fetch timetable:", err);
        // Fall back to generated data if API fails
        setTimetable(generateTeacherTimetable());
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimetableData();
  }, [router]);

  const handleFilterDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterDay(e.target.value);
  };

  const getCellColorClass = (session: ClassSession | null) => {
    if (!session) return "bg-gray-800/50";
    if (session.type === "break") return "bg-gray-700";
    
    const typeColors = {
      lecture: "bg-blue-900/60",
      lab: "bg-green-900/60",
      tutorial: "bg-purple-900/60"
    };
    
    return typeColors[session.type];
  };

  // Filter days if a day filter is applied
  const daysToDisplay = filterDay ? [filterDay] : DAYS;

  // Count total teaching hours
  const getTeachingHours = () => {
    let count = 0;
    Object.values(timetable).forEach(day => {
      Object.values(day).forEach(session => {
        if (session && session.type !== "break") count++;
      });
    });
    return count;
  };

  // Get next class
  const getNextClass = () => {
    if (!timetable[currentDay]) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Convert to 24-hour format
    const convertTimeToMinutes = (timeSlot: string) => {
      const [startTime] = timeSlot.split(' - ');
      const [hours, minutes] = startTime.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Find the next class
    let nextClass: { timeSlot: string; session: ClassSession } | null = null;
    
    for (const timeSlot in timetable[currentDay]) {
      const session = timetable[currentDay][timeSlot];
      if (!session || session.type === "break") continue;
      
      const classTimeInMinutes = convertTimeToMinutes(timeSlot);
      
      if (classTimeInMinutes > currentTimeInMinutes) {
        nextClass = { timeSlot, session };
        break;
      }
    }
    
    return nextClass;
  };

  if (isLoading) {
    return (
      <div className="flex bg-gray-900 min-h-screen">
        <TeacherSidebar />
        <div className="ml-16 p-6 w-full text-white">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3">Loading your timetable...</span>
          </div>
        </div>
      </div>
    );
  }

  const nextClass = getNextClass();


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex">
      <TeacherSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex flex-col gap-6 ml-6 mr-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-blue-500 rounded-xl shadow-lg">
                <CalendarIcon className="text-gray-100 w-6 h-6" />
              </div>
              <Typography
                variant="h4"
                component="h1"
                className="font-bold bg-blue-500 bg-clip-text text-transparent"
              >
                My Teaching Schedule
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <select
                id="day-filter"
                value={filterDay}
                onChange={handleFilterDayChange}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Days</option>
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-900/70 to-blue-800/40 p-4 rounded-lg border border-blue-700/50 shadow-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-800 rounded-lg mr-3">
                  <ClockIcon className="h-6 w-6 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-blue-200 text-sm font-medium">Teaching Hours</h3>
                  <p className="text-white text-xl font-bold">{getTeachingHours()} hrs/week</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/70 to-purple-800/40 p-4 rounded-lg border border-purple-700/50 shadow-lg">
              <div className="
