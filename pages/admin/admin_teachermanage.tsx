import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin_sidebar";
import TopBar from "@/components/topbar";
import { useRouter } from "next/router";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { Typography } from "@mui/material";

// Define TypeScript interfaces for our data structures
interface Teacher {
  name: string;
  id: string;
  dept: string;
  subjects: string;
  email: string;
  phone: string;
  feedback?: FeedbackEntry[];
}

interface FeedbackEntry {
  id: string;
  subject: string;
  section: string;
  date: string;
  rating: number;
  comment: string;
  studentId?: string;
  studentName?: string;
  courseRatings?: {
    contentQuality: number;
    difficultyLevel: number;
    practicalApplication: number;
  };
  facultyRatings?: {
    teachingQuality: number;
    communication: number;
    availability: number;
  };
  overallRating?: number;
}

const AdminTFeedback: React.FC = () => {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newTeacher, setNewTeacher] = useState<Teacher>({
    name: "",
    id: "",
    dept: "",
    subjects: "",
    email: "",
    phone: "",
    feedback: [],
  });

  const [selectedTeacherIndex, setSelectedTeacherIndex] = useState<number | null>(null);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editFeedbackForm, setEditFeedbackForm] = useState<FeedbackEntry>({
    id: "",
    subject: "",
    section: "",
    date: "",
    rating: 0,
    comment: "",
    courseRatings: {
      contentQuality: 0,
      difficultyLevel: 0,
      practicalApplication: 0
    },
    facultyRatings: {
      teachingQuality: 0,
      communication: 0,
      availability: 0
    },
    overallRating: 0
  });

  const [showAllFeedback, setShowAllFeedback] = useState(false);

  // Add state for storing student data mapping
  const [studentMap, setStudentMap] = useState<Record<string, string>>({});

  // Add this function to fetch students and create a mapping
  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Create a mapping of student IDs to names
          const mapping = data.data.reduce((map: Record<string, string>, student: any) => {
            map[student.id] = student.name || student.user?.name || 'Unknown Student';
            return map;
          }, {});
          setStudentMap(mapping);
          return mapping;
        }
      }
      return {};
    } catch (e) {
      console.error('Failed to fetch students:', e);
      return {};
    }
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/teachers");

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Fetch departments to map department IDs to names
          const deptResponse = await fetch('/api/departments');
          let departmentsMap = {};
          
          if (deptResponse.ok) {
            const deptData = await deptResponse.json();
            if (deptData.success && Array.isArray(deptData.data)) {
              departmentsMap = deptData.data.reduce((map, dept) => {
                map[dept.id] = dept.name;
                return map;
              }, {});
            }
          }

          // Fetch students to map student IDs to names
          const studentsMap = await fetchStudents();

          // Fetch all feedback in a single request
          let allFeedback = [];
          try {
            const allFeedbackResponse = await fetch(`/api/feedback`);
            if (allFeedbackResponse.ok) {
              const allFeedbackData = await allFeedbackResponse.json();
              if (allFeedbackData.success) {
                allFeedback = allFeedbackData.data || [];
                console.log("Fetched all feedback:", allFeedbackData.data);
              }
            }
          } catch (e) {
            console.error(`Failed to fetch all feedback:`, e);
          }

          const formattedTeachers = await Promise.all(
            data.data.map(async (teacher: any) => {
              let feedback = [];
              
              // Get feedback for this teacher from the allFeedback array
              if (allFeedback.length > 0) {
                feedback = allFeedback.filter(fb => fb.teacherId === teacher.id);
                console.log(`Found ${feedback.length} feedback entries for teacher ${teacher.id}`);
              }

              // If no feedback found in the all feedback request, try individual endpoint
              if (feedback.length === 0) {
                try {
                  console.log(`Fetching individual feedback for teacher ${teacher.id}`);
                  const feedbackResponse = await fetch(`/api/teachers/${teacher.id}/feedback`);
                  
                  if (feedbackResponse.ok) {
                    const feedbackData = await feedbackResponse.json();
                    console.log(`Response from /api/teachers/${teacher.id}/feedback:`, feedbackData);
                    
                    if (feedbackData.success) {
                      feedback = feedbackData.data || [];
                      console.log(`Fetched ${feedback.length} feedback entries for teacher ${teacher.id}`);
                    } else {
                      console.error(`API returned error: ${feedbackData.message || "Unknown error"}`);
                    }
                  } else {
                    console.error(`Failed to fetch feedback: HTTP ${feedbackResponse.status}`);
                  }
                } catch (e) {
                  console.error(`Exception when fetching feedback for teacher ${teacher.id}:`, e);
                }
              }

              // Convert feedback data to match our FeedbackEntry interface
              const formattedFeedback = feedback.map(fb => {
                // Get student name from the map or use fallbacks
                const studentName = fb.studentName || 
                                   (fb.studentId && studentsMap[fb.studentId]) || 
                                   "Anonymous Student";
                
                return {
                  id: fb.id || `f${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  subject: fb.subject || fb.courseName || "",
                  section: fb.section || "All Sections",
                  date: fb.date || new Date().toISOString().split('T')[0],
                  rating: fb.rating || fb.overallRating || 0,
                  comment: fb.comment || fb.comments || "",
                  studentId: fb.studentId || "",
                  studentName: studentName,
                  courseRatings: fb.courseRatings || fb.courseRating || {
                    contentQuality: 0,
                    difficultyLevel: 0,
                    practicalApplication: 0
                  },
                  facultyRatings: fb.facultyRatings || fb.teacherRating || {
                    teachingQuality: 0,
                    communication: 0,
                    availability: 0
                  },
                  overallRating: fb.overallRating || fb.rating || 0
                };
              });

              // Get department name from map or use fallbacks
              const departmentName = teacher.department?.name || 
                                   (teacher.departmentId && departmentsMap[teacher.departmentId]) || 
                                   "Unassigned";

              // Get phone from contact attribute or from direct property
              const phoneNumber = teacher.contact || teacher.phone || "Not provided";

              return {
                name: teacher.name || teacher.user?.name || "Unknown",
                id: teacher.id,
                dept: departmentName,
                subjects: teacher.specialization || "No subjects assigned",
                email: teacher.user?.email || "No email",
                phone: phoneNumber,
                feedback: formattedFeedback,
              };
            })
          );

          console.log("Formatted teachers with feedback:", formattedTeachers);
          setTeachers(formattedTeachers);
        } else {
          setError("Failed to load teachers");
        }
      } catch (err) {
        setError(`Failed to fetch teachers: ${err instanceof Error ? err.message : "Unknown error"}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTeacher({ ...newTeacher, [e.target.name]: e.target.value });
  };

  const addTeacher = async () => {  
    if (newTeacher.name && newTeacher.id && newTeacher.dept && newTeacher.email) {
      try {
        const response = await fetch("/api/teachers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: newTeacher.id,
            name: newTeacher.name,
            department: newTeacher.dept,
            specialization: newTeacher.subjects,
            email: newTeacher.email,
            phone: newTeacher.phone,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setTeachers([
            ...teachers,
            {
              ...newTeacher,
              feedback: [],
            },
          ]);
          setNewTeacher({ name: "", id: "", dept: "", subjects: "", email: "", phone: "", feedback: [] });
        } else {
          alert("Failed to add teacher");
        }
      } catch (err) {
        alert(`Error adding teacher: ${err instanceof Error ? err.message : "Unknown error"}`);
        console.error(err);
      }
    } else {
      alert("Please fill in all required fields");
    }
  };

  const deleteTeacher = async (index: number) => {
    const teacherToDelete = teachers[index];

    if (confirm(`Are you sure you want to delete ${teacherToDelete.name}?`)) {
      try {
        const response = await fetch(`/api/teachers/${teacherToDelete.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setTeachers(teachers.filter((_, i) => i !== index));
          if (selectedTeacherIndex === index) {
            setSelectedTeacherIndex(null);
          }
        } else {
          alert("Failed to delete teacher");
        }
      } catch (err) {
        alert(`Error deleting teacher: ${err instanceof Error ? err.message : "Unknown error"}`);
        console.error(err);
      }
    }
  };

  const viewFeedback = (index: number) => {
    setSelectedTeacherIndex(index);
    setIsEditingFeedback(false);
    setShowAllFeedback(false);
  };

  const handleFeedbackFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.name === "rating" ? parseFloat(e.target.value) : e.target.value;
    setEditFeedbackForm({ ...editFeedbackForm, [e.target.name]: value });
  };

  const addNewFeedback = () => {
    if (selectedTeacherIndex !== null) {
      const newFeedback: FeedbackEntry = {
        id: `f${Date.now()}`,
        subject: "",
        section: "",
        date: new Date().toISOString().split("T")[0],
        rating: 0,
        comment: "",
        studentId: "",
        studentName: "Admin (Manual Entry)",
        courseRatings: {
          contentQuality: 0,
          difficultyLevel: 0,
          practicalApplication: 0
        },
        facultyRatings: {
          teachingQuality: 0,
          communication: 0,
          availability: 0
        },
        overallRating: 0
      };

      setEditFeedbackForm(newFeedback);
      setIsEditingFeedback(true);
      setEditingFeedbackId(newFeedback.id);
    }
  };

  const saveFeedback = () => {
    if (selectedTeacherIndex !== null) {
      const updatedTeachers = [...teachers];
      const teacherFeedback = updatedTeachers[selectedTeacherIndex].feedback || [];

      if (editingFeedbackId) {
        const feedbackIndex = teacherFeedback.findIndex((f) => f.id === editingFeedbackId);
        if (feedbackIndex !== -1) {
          teacherFeedback[feedbackIndex] = { ...editFeedbackForm };
        } else {
          teacherFeedback.push({ ...editFeedbackForm });
        }
      } else {
        teacherFeedback.push({
          ...editFeedbackForm,
          id: `f${Date.now()}`,
        });
      }

      updatedTeachers[selectedTeacherIndex].feedback = teacherFeedback.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTeachers(updatedTeachers);
      setIsEditingFeedback(false);
      setEditingFeedbackId(null);
      setEditFeedbackForm({ id: "", subject: "", section: "", date: "", rating: 0, comment: "" });
    }
  };

  const deleteFeedback = (feedbackId: string) => {
    if (selectedTeacherIndex !== null) {
      const updatedTeachers = [...teachers];
      const teacherFeedback = updatedTeachers[selectedTeacherIndex].feedback || [];

      updatedTeachers[selectedTeacherIndex].feedback = teacherFeedback.filter((feedback) => feedback.id !== feedbackId);

      setTeachers(updatedTeachers);
    }
  };

  const viewAllFeedback = (teacherId: string) => {
    const index = teachers.findIndex((t) => t.id === teacherId);
    if (index !== -1) {
      setSelectedTeacherIndex(index);
      setShowAllFeedback(true);
    }
  };

  const getSubjectSpecificFeedback = (teacherIndex: number, subject: string) => {
    if (teacherIndex < 0 || !teachers[teacherIndex].feedback) return [];
    return teachers[teacherIndex].feedback!.filter((f) => f.subject === subject);
  };

  const getSubjectNames = (subjects: string): string[] => {
    return subjects.split(", ");
  };

  // Add a helper function for date formatting
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      // Format: "Jan 15, 2023" with month name
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex bg-gray-900 min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-xl">Loading teachers...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <AdminSidebar />
      <div className="flex-1 p-6 ml-16 overflow-hidden">
        <TopBar />
        <div className="flex items-center space-x-4 ml-4 md:ml-10">
          <div className="p-3 bg-purple-700 rounded-xl shadow-lg">
            <UserGroupIcon className="w-8 h-8" />
          </div>
          <Typography variant="h4" component="h1" className="font-bold bg-purple-600 bg-clip-text text-transparent">
            Teacher Management
          </Typography>
        </div>
        <div className="ml-4 p-2 md:p-6 w-full text-gray-200 overflow-hidden">
          {selectedTeacherIndex === null ? (
            <>
              <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-6 border border-gray-700 overflow-x-auto max-w-full">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">Faculty Information</h3>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-max table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-700 text-white">
                        <th className="p-2 border-b border-gray-600">Name</th>
                        <th className="p-2 border-b border-gray-600">ID</th>
                        <th className="p-2 border-b border-gray-600">Department</th>
                        <th className="p-2 border-b border-gray-600">Subjects</th>
                        <th className="p-2 border-b border-gray-600">Email</th>
                        <th className="p-2 border-b border-gray-600">Phone</th>
                        <th className="p-2 border-b border-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher, index) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                          <td className="p-2">{teacher.name}</td>
                          <td className="p-2">{teacher.id}</td>
                          <td className="p-2">{teacher.dept !== "Unassigned" ? teacher.dept : 
                            <span className="text-gray-400 italic">Not assigned</span>}</td>
                          <td className="p-2">{teacher.subjects}</td>
                          <td className="p-2">{teacher.email}</td>
                          <td className="p-2">{teacher.phone !== "Not provided" ? teacher.phone : 
                            <span className="text-gray-400 italic">Not provided</span>}</td>
                          <td className="p-2 flex space-x-2">
                            <button
                              onClick={() => viewFeedback(index)}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full"
                            >
                              Feedback
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-4 border border-gray-700 max-w-full overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  Teacher Feedback: {teachers[selectedTeacherIndex].name}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedTeacherIndex(null)}
                    className="bg-gray-600 text-white px-3 py-1 md:px-4 md:py-2 rounded hover:bg-gray-700 transition text-sm md:text-base"
                    title="Return to teacher list"
                  >
                    Back to List
                  </button>
                  <button
                    onClick={() => setShowAllFeedback(!showAllFeedback)}
                    className="bg-blue-600 text-white px-3 py-1 md:px-4 md:py-2 rounded hover:bg-blue-700 transition text-sm md:text-base"
                    title="Toggle between showing all feedback or recent feedback"
                  >
                    {showAllFeedback ? "Show Recent" : "View All"}
                  </button>
                </div>
              </div>

              {isEditingFeedback ? (
                <div className="bg-gray-700 p-3 md:p-4 rounded-lg border border-gray-600 mb-6 overflow-x-auto">
                  <h4 className="text-white font-semibold mb-3">
                    {editingFeedbackId ? "Edit Feedback" : "Add New Feedback"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Subject</label>
                      <select
                        name="subject"
                        value={editFeedbackForm.subject}
                        onChange={handleFeedbackFormChange}
                        className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white"
                      >
                        <option value="">Select Subject</option>
                        {getSubjectNames(teachers[selectedTeacherIndex].subjects).map((subjectName, idx) => (
                          <option key={idx} value={subjectName}>
                            {subjectName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Section</label>
                      <input
                        type="text"
                        name="section"
                        value={editFeedbackForm.section}
                        onChange={handleFeedbackFormChange}
                        placeholder="e.g. AIE-C, AID-A"
                        className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Date</label>
                      <input
                        type="date"
                        name="date"
                        value={editFeedbackForm.date}
                        onChange={handleFeedbackFormChange}
                        className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Overall Rating (0-5)</label>
                      <input
                        type="number"
                        name="overallRating"
                        min="0"
                        max="5"
                        step="0.1"
                        value={editFeedbackForm.overallRating || editFeedbackForm.rating}
                        onChange={handleFeedbackFormChange}
                        className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-300 mb-1">Comment</label>
                      <textarea
                        name="comment"
                        value={editFeedbackForm.comment}
                        onChange={handleFeedbackFormChange}
                        className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white h-24"
                      ></textarea>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 space-x-2">
                    <button
                      onClick={() => setIsEditingFeedback(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                      title="Cancel editing or adding feedback"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFeedback} 
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 transition"
                      title="Save feedback entry"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 overflow-x-auto max-w-full">
                  <h4 className="font-semibold text-lg text-white mb-2">
                    {showAllFeedback ? "All Feedback" : "Recent Feedback"}
                  </h4>
                  {teachers[selectedTeacherIndex].feedback &&
                  teachers[selectedTeacherIndex].feedback!.length > 0 ? (
                    <div className="space-y-3 w-full">
                      {(showAllFeedback
                        ? teachers[selectedTeacherIndex].feedback
                        : teachers[selectedTeacherIndex].feedback!.slice(0, 10)
                      ).map((feedback) => (
                        <div key={feedback.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <p className="text-green-300 text-sm font-medium flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {feedback.studentName && feedback.studentName !== 'Anonymous' 
                                  ? feedback.studentName.replace(/\(\)/g, '').trim() 
                                  : 'Anonymous Student'}
                              </p>
                              <p className="text-blue-300 text-xs mt-1 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(feedback.date)}
                              </p>
                              <p className="text-gray-400 text-xs mt-1 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {feedback.subject} {feedback.section && feedback.section !== 'All Sections' && `(${feedback.section})`}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span className="bg-blue-900 text-white px-3 py-1 rounded text-md font-bold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                                {(feedback.overallRating || feedback.rating).toFixed(1)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 bg-gray-800 p-3 rounded-md">
                            <p className="text-gray-300 font-semibold text-sm mb-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              Feedback:
                            </p>
                            <p className="text-gray-200 break-words text-sm">{feedback.comment || "No comments provided."}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 flex items-center p-4 bg-gray-800 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      No feedback available for this teacher.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default AdminTFeedback;