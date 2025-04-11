import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin_sidebar";
import TopBar from "@/components/topbar";
import { PencilIcon, CheckIcon, XMarkIcon, TrashIcon } from "@heroicons/react/24/solid";
import { ClockIcon } from "@heroicons/react/24/outline";
import { Typography } from "@mui/material";

// Define interfaces for data
interface Subject {
  id: string;
  name: string;
  faculty: string;
}

interface TimeTableCell {
  day: string;
  timeSlot: string;
  subject: string;
  faculty: string;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const TIME_SLOTS = [
  "09:00 - 09:50",
  "10:00 - 10:50",
  "11:00 - 11:50",
  "12:00 - 12:50",
  "13:00 - 13:50", // Lunch break
  "14:00 - 14:50",
  "15:00 - 15:50",
  "16:00 - 16:50",
  "17:00 - 17:50"
];

const TimetableManagement: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<string[]>([]);  // Ensure initialized as empty array
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [timetableData, setTimetableData] = useState<TimeTableCell[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: string; timeSlot: string } | null>(null);
  const [tempSubject, setTempSubject] = useState<string>("");

  // Fetch classes, subjects, and initial timetable
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch available classes
        const classResponse = await fetch('/api/admin/timetable/classes');
        const classData = await classResponse.json();
        
        // Ensure classData is an array before setting it
        if (Array.isArray(classData)) {
          setClasses(classData);
          // Set default selected class if available
          if (classData.length > 0) {
            setSelectedClass(classData[0]);
          }
        } else {
          console.error('Expected array but received:', classData);
          setClasses([]); // Set to empty array if not an array
        }

        // Fetch subjects
        const subjectsResponse = await fetch('/api/admin/timetable/subjects');
        const subjectsData = await subjectsResponse.json();
        
        // Ensure subjectsData is an array before setting it
        if (Array.isArray(subjectsData)) {
          setSubjects(subjectsData);
        } else {
          console.error('Expected array but received:', subjectsData);
          setSubjects([]); // Set to empty array if not an array
        }
      } catch (error) {
        console.error('Error fetching initial timetable data:', error);
        setClasses([]);   // Ensure classes is set to an empty array on error
        setSubjects([]);  // Ensure subjects is set to an empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch timetable data when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchTimetableForClass(selectedClass);
    }
  }, [selectedClass]);

  const fetchTimetableForClass = async (className: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/timetable/data?class=${encodeURIComponent(className)}`);
      const data = await response.json();
      setTimetableData(data);
    } catch (error) {
      console.error('Error fetching timetable for class:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
  };

  const handleEditCell = (day: string, timeSlot: string) => {
    // Don't allow editing lunch break
    if (timeSlot === "13:00 - 13:50") return;

    setEditingCell({ day, timeSlot });

    // Set initial value in temp subject from existing timetable data
    const existingCell = timetableData.find(
      cell => cell.day === day && cell.timeSlot === timeSlot
    );
    setTempSubject(existingCell?.subject || "");
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;

    const { day, timeSlot } = editingCell;

    try {
      // Send update to backend
      await fetch('/api/admin/timetable/update-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class: selectedClass,
          day,
          timeSlot,
          subject: tempSubject
        }),
      });

      // Update local state
      const updatedData = [...timetableData];
      const existingIndex = updatedData.findIndex(
        cell => cell.day === day && cell.timeSlot === timeSlot
      );

      if (existingIndex !== -1) {
        // Update existing cell
        updatedData[existingIndex] = {
          ...updatedData[existingIndex],
          subject: tempSubject,
          faculty: subjects.find(s => s.id === tempSubject)?.faculty || ""
        };
      } else {
        // Add new cell
        updatedData.push({
          day,
          timeSlot,
          subject: tempSubject,
          faculty: subjects.find(s => s.id === tempSubject)?.faculty || ""
        });
      }

      setTimetableData(updatedData);
    } catch (error) {
      console.error('Error updating timetable cell:', error);
      alert('Failed to update timetable. Please try again.');
    }

    // Reset editing state
    setEditingCell(null);
    setTempSubject("");
  };

  const handleClearCell = async () => {
    if (!editingCell) return;

    const { day, timeSlot } = editingCell;

    try {
      // Send update to backend
      await fetch('/api/admin/timetable/clear-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class: selectedClass,
          day,
          timeSlot
        }),
      });

      // Update local state
      const updatedData = timetableData.filter(
        cell => !(cell.day === day && cell.timeSlot === timeSlot)
      );

      setTimetableData(updatedData);
    } catch (error) {
      console.error('Error clearing timetable cell:', error);
      alert('Failed to clear timetable cell. Please try again.');
    }

    // Reset editing state
    setEditingCell(null);
    setTempSubject("");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setTempSubject("");
  };

  // Get cell content for a specific day and time slot
  const getCellContent = (day: string, timeSlot: string) => {
    const cell = timetableData.find(c => c.day === day && c.timeSlot === timeSlot);
    
    if (!cell) {
      return null;
    }
    
    return {
      subject: subjects.find(s => s.id === cell.subject)?.name || cell.subject,
      faculty: cell.faculty
    };
  };

  // Check if a cell is being edited
  const isEditing = (day: string, timeSlot: string) => {
    return editingCell?.day === day && editingCell?.timeSlot === timeSlot;
  };

  // Render class selector dropdown - ensure we check if classes is an array
  const renderClassSelector = () => {
    if (!Array.isArray(classes)) {
      console.error('Classes is not an array:', classes);
      return <p>Error loading classes</p>;
    }
    
    return (
      <select
        value={selectedClass}
        onChange={handleClassChange}
        className="bg-gray-800 text-white border border-gray-700 rounded px-4 py-2"
      >
        {classes.length > 0 ? (
          classes.map((className, index) => (
            <option key={index} value={className}>
              {className}
            </option>
          ))
        ) : (
          <option value="">No classes available</option>
        )}
      </select>
    );
  };

  if (isLoading) {
    return (
      <div className="flex bg-gray-900 min-h-screen">
        <AdminSidebar />
        <div className="ml-16 p-6 w-full text-white">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3">Loading timetable data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <AdminSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="ml-6 p-6 w-full text-gray-200">
          <div className="flex items-center mb-6">
            <div className="p-3 mr-4 bg-purple-700 rounded-xl shadow-lg">
              <ClockIcon className="text-gray-100 w-6 h-6" />
            </div>
            <Typography
              variant="h4"
              component="h1"
              className="font-bold bg-purple-600 bg-clip-text text-transparent"
            >
              Timetable Management
            </Typography>
          </div>
          
          {/* Control Panel */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6 border border-gray-700">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-base font-semibold text-gray-200">
                  Select Class
                </h1>
                <div className="ml-auto">
                  {renderClassSelector()}
                </div>
              </div>
            </div>

          {/* Timetable Grid */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-md overflow-x-auto border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-3">Timetable for {selectedClass}</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-gray-700 bg-gray-750 min-w-[100px]">Time / Day</th>
                    {DAYS.map((day) => (
                      <th key={day} className="p-2 border border-gray-700 bg-gray-750 min-w-[180px]">
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((timeSlot) => (
                    <tr key={timeSlot}>
                      <td className={`p-2 border border-gray-700 font-medium ${timeSlot === "13:00 - 13:50" ? "bg-gray-700" : "bg-gray-800"}`}>
                        {timeSlot}
                      </td>
                      {DAYS.map((day) => {
                        const isLunchBreak = timeSlot === "13:00 - 13:50";
                        const cellContent = getCellContent(day, timeSlot);
                        
                        return (
                          <td 
                            key={`${day}-${timeSlot}`} 
                            className={`p-2 border border-gray-700 ${isLunchBreak ? "bg-gray-700" : "bg-gray-800"}`}
                          >
                            {isLunchBreak ? (
                              <div className="text-center text-gray-400">Lunch Break</div>
                            ) : isEditing(day, timeSlot) ? (
                              <div className="flex flex-col space-y-2">
                                <select
                                  value={tempSubject}
                                  onChange={(e) => setTempSubject(e.target.value)}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option value="">Select subject</option>
                                  {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                      {subject.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex justify-between">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-gray-400 hover:text-gray-300"
                                    title="Cancel"
                                  >
                                    <XMarkIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={handleClearCell}
                                    className="text-red-500 hover:text-red-400"
                                    title="Clear cell"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={handleSaveCell}
                                    className="text-green-500 hover:text-green-400"
                                    title="Save"
                                  >
                                    <CheckIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className={`h-full relative ${cellContent ? "cursor-default" : "cursor-pointer hover:bg-gray-750"}`} 
                                onClick={() => !cellContent && handleEditCell(day, timeSlot)}
                              >
                                {cellContent ? (
                                  <div className="flex flex-col">
                                    <div className="font-medium text-white">{cellContent.subject}</div>
                                    <div className="text-xs text-gray-400">{cellContent.faculty}</div>
                                    <button
                                      className="absolute top-0 right-0 text-blue-500 hover:text-blue-400"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCell(day, timeSlot);
                                      }}
                                      title="Edit"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-500 text-sm">
                                    Click to add
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gray-800 mt-4 p-4 rounded-lg shadow-md border border-gray-700">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Instructions</h3>
            <ul className="text-sm text-gray-400 list-disc ml-5 space-y-1">
              <li>Click on an empty cell to add a class</li>
              <li>Click the edit icon to modify an existing class</li>
              <li>Use the trash icon to remove a class</li>
              <li>Lunch break cells cannot be edited</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableManagement;