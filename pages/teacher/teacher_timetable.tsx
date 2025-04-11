import React, { useState, useEffect } from "react";
import TeacherSidebar from "@/components/teacher_sidebar";
import TopBar from "@/components/topbar";
import { CalendarIcon, MapPinIcon, UserGroupIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Typography } from "@mui/material";
import axios from "axios";
import { useRouter } from "next/router";

const TIME_SLOTS = [
  "9:00 - 9:50", "10:00 - 10:50", "11:00 - 11:50",
  "12:00 - 12:50", "1:00 - 1:50", "2:00 - 2:50",
  "3:00 - 3:50", "4:00 - 4:50"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

const TeacherTimetable: React.FC = () => {
  const [timetable, setTimetable] = useState<TeacherTimetable>({});
  const [filterDay, setFilterDay] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState({
    id: "",
    name: "",
    department: "",
    subjects: [] as string[]
  });
  const [courseCount, setCourseCount] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    setCurrentDay(today === 'Sunday' || today === 'Saturday' ? 'Monday' : today);

    const fetchTimetableData = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);
        
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        try {
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
            
            // Set course count
            if (profileResponse.data.subjects) {
              setCourseCount(profileResponse.data.subjects.length);
            }
          }
        } catch (profileErr) {
          console.error("Failed to fetch teacher profile:", profileErr);
          // Continue with default data if profile fetch fails
        }

        try {
          const timetableResponse = await axios.get("/api/teacher/timetable", {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Initialize empty timetable with all days and time slots
          const formattedTimetable: TeacherTimetable = {};
          
          DAYS.forEach(day => {
            formattedTimetable[day] = {};
            TIME_SLOTS.forEach(timeSlot => {
              formattedTimetable[day][timeSlot] = null;
            });
          });
          
          // Add lunch break at 1:00 - 1:50 for all days
          DAYS.forEach(day => {
            formattedTimetable[day]["1:00 - 1:50"] = {
              id: "BREAK",
              subject: "Lunch Break",
              className: "",
              room: "",
              type: "break"
            };
          });

          // Fill with actual schedule data
          if (timetableResponse.data && Array.isArray(timetableResponse.data)) {
            timetableResponse.data.forEach((session: any) => {
              if (session.day && session.timeSlot) {
                formattedTimetable[session.day][session.timeSlot] = {
                  id: session.id,
                  subject: session.subject,
                  className: session.className,
                  room: session.room,
                  type: session.type
                };
              }
            });
          }

          setTimetable(formattedTimetable);
        } catch (timetableErr) {
          console.error("Failed to fetch timetable:", timetableErr);
          setFetchError("Failed to load your schedule. Please try again later.");
          
          // Initialize empty timetable with lunch breaks for fallback
          const emptyTimetable: TeacherTimetable = {};
          
          DAYS.forEach(day => {
            emptyTimetable[day] = {};
            TIME_SLOTS.forEach(timeSlot => {
              emptyTimetable[day][timeSlot] = null;
            });
            
            // Add lunch break
            emptyTimetable[day]["1:00 - 1:50"] = {
              id: "BREAK",
              subject: "Lunch Break",
              className: "",
              room: "",
              type: "break"
            };
          });
          
          setTimetable(emptyTimetable);
        }
      } catch (err) {
        console.error("Failed to fetch timetable:", err);
        setFetchError("Failed to load your schedule. Please try again later.");
        
        // Initialize empty timetable with lunch breaks for fallback
        const emptyTimetable: TeacherTimetable = {};
        
        DAYS.forEach(day => {
          emptyTimetable[day] = {};
          TIME_SLOTS.forEach(timeSlot => {
            emptyTimetable[day][timeSlot] = null;
          });
          
          // Add lunch break
          emptyTimetable[day]["1:00 - 1:50"] = {
            id: "BREAK",
            subject: "Lunch Break",
            className: "",
            room: "",
            type: "break"
          };
        });
        
        setTimetable(emptyTimetable);
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

  const daysToDisplay = filterDay ? [filterDay] : DAYS;

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex">
      <TeacherSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex flex-col gap-6 ml-6 mr-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-blue-500 rounded-xl shadow-lg">
                <CalendarIcon className="text-gray-100 w-6 h-6" />
              </div>
              <Typography variant="h4" component="h1" className="font-bold bg-blue-500 bg-clip-text text-transparent">
                My Teaching Schedule
              </Typography>
            </div>
            <select
              id="day-filter"
              value={filterDay}
              onChange={handleFilterDayChange}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Days</option>
              {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>

          {fetchError && (
            <div className="bg-red-900/40 border border-red-800 rounded-lg p-3 text-red-200 mb-4">
              <p>{fetchError}</p>
            </div>
          )}

          {/* Stat Cards - UPDATED */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="bg-green-900/70 p-4 rounded-lg border border-green-700/50 shadow-lg">
              <div className="flex items-center">
                <div className="p-3 bg-green-800 rounded-lg mr-3">
                  <MapPinIcon className="h-6 w-6 text-green-200" />
                </div>
                <div>
                  <h3 className="text-green-200 text-sm font-medium">Department</h3>
                  <p className="text-white text-xl font-bold">{teacherInfo.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="overflow-x-auto mt-4 bg-gray-900/50 rounded-xl border border-gray-800 w-full lg:w-[1320px]">
            <table className="min-w-full divide-y divide-gray-800">
              <thead>
                <tr>
                  <th className="py-3 px-4 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                  {daysToDisplay.map(day => (
                    <th key={day} className={`py-3 px-4 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${day === currentDay ? "bg-gray-700" : ""}`}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {TIME_SLOTS.map(timeSlot => (
                  <tr key={timeSlot} className="hover:bg-gray-800/60">
                    <td className="py-3 px-4 text-sm font-medium text-gray-300">{timeSlot}</td>
                    {daysToDisplay.map(day => {
                      const session = timetable[day]?.[timeSlot];
                      return (
                        <td key={`${day}-${timeSlot}`} className={`py-2 px-4 text-sm text-gray-300 ${getCellColorClass(session)}`}>
                          {session ? (
                            <div className="p-2">
                              <div className="font-medium">{session.subject}</div>
                              {session.type !== "break" && (
                                <>
                                  <div className="text-xs text-gray-400 flex items-center">
                                    <UserGroupIcon className="h-3 w-3 mr-1" />{session.className}
                                  </div>
                                  <div className="text-xs text-gray-400 flex items-center">
                                    <MapPinIcon className="h-3 w-3 mr-1" />{session.room}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="p-2 text-gray-500 italic">Free</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2 rounded bg-blue-900/60"></span>
              <span className="text-sm text-gray-400">Lecture</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2 rounded bg-green-900/60"></span>
              <span className="text-sm text-gray-400">Lab</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2 rounded bg-purple-900/60"></span>
              <span className="text-sm text-gray-400">Tutorial</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2 rounded bg-gray-700"></span>
              <span className="text-sm text-gray-400">Break</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2 rounded bg-gray-800/50"></span>
              <span className="text-sm text-gray-400">Free</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TeacherTimetable;
