import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import StudentSidebar from "@/components/student_sidebar";
import TopBar from "@/components/topbar";
import { FaChalkboardTeacher, FaComments, FaPaperPlane, FaStar as FilledStar } from "react-icons/fa";
import { FaRegStar as EmptyStar } from "react-icons/fa";
import { Typography } from "@mui/material";

interface Ratings {
  [key: string]: number;
}

interface StarRatingProps {
  rating: number;
  setRating: (rating: number) => void;
  maxRating?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, setRating, maxRating = 5 }) => {
  return (
    <div className="flex items-center">
      {[...Array(maxRating)].map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setRating(i + 1)}
          className={`text-xl md:text-2xl mx-0.5 transition-colors duration-200 hover:text-yellow-300`}
          aria-label={`Rate ${i + 1} out of ${maxRating}`}
        >
          {i < rating ? (
            <FilledStar className="text-yellow-400" />
          ) : (
            <EmptyStar className="text-gray-400" />
          )}
        </button>
      ))}
    </div>
  );
};

const StudentFeedback: React.FC = () => {
  const router = useRouter();
  const [faculties, setFaculties] = useState<{ id: number | string, courseId: number | string, name: string, course: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courseRatings, setCourseRatings] = useState<Ratings>({
    contentQuality: 0,
    difficultyLevel: 0,
    practicalApplication: 0,
  });

  const [facultyRatings, setFacultyRatings] = useState<Ratings>({
    teachingQuality: 0,
    communication: 0,
    availability: 0,
  });

  const [overallRating, setOverallRating] = useState<number>(0);
  const [additionalFeedback, setAdditionalFeedback] = useState<string>("");

  useEffect(() => {
    // Authentication check
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "student") {
      router.push("/");
      return;
    }

    // Check for pre-selected faculty and course from query params
    const { teacher, course } = router.query;
    
    const fetchFaculties = async () => {
      try {
        setLoading(true);
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
          // Extract unique faculty members from enrolled courses
          const facultyList = data.data.map((course: any) => ({
            id: course.instructorId,
            courseId: course.id, // Store the actual course ID
            name: course.instructorName,
            course: course.title
          }));
          
          setFaculties(facultyList);
          
          // Pre-select faculty and course if provided in URL
          if (teacher && course) {
            const selectedTeacher = facultyList.find(
              (f: any) => f.id === teacher || f.name === teacher
            );
            
            if (selectedTeacher) {
              setSelectedFaculty(selectedTeacher.name);
              setSelectedCourse(selectedTeacher.course);
            }
          }
        } else {
          setError(data.message || "Failed to load faculty data");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to fetch faculty data: ${errorMessage}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFaculties();
  }, [router]);

  const handleFacultyChange = (facultyName: string) => {
    setSelectedFaculty(facultyName);
    
    // Find the corresponding course for the selected faculty
    const faculty = faculties.find(f => f.name === facultyName);
    if (faculty) {
      setSelectedCourse(faculty.course);
    } else {
      setSelectedCourse("");
    }
  };

  const handleCourseRatingChange = (aspect: string, rating: number) => {
    setCourseRatings((prev) => ({
      ...prev,
      [aspect]: rating,
    }));
  };

  const handleFacultyRatingChange = (aspect: string, rating: number) => {
    setFacultyRatings((prev) => ({
      ...prev,
      [aspect]: rating,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) {
      alert("Please select a faculty member");
      return;
    }
    
    try {
      setSubmitting(true);
      const studentId = localStorage.getItem("userId") || "";
      
      // Find faculty information
      const faculty = faculties.find(f => f.name === selectedFaculty);
      if (!faculty) {
        throw new Error("Faculty not found");
      }
      
      // Ensure all required ratings are provided
      const allRatingsProvided = Object.values(courseRatings).every(rating => rating > 0) && 
                                 Object.values(facultyRatings).every(rating => rating > 0) &&
                                 overallRating > 0;
      
      if (!allRatingsProvided) {
        alert("Please provide all ratings before submitting");
        setSubmitting(false);
        return;
      }
      
      const feedbackData = {
        studentId,
        courseId: faculty.courseId, // Use the proper course ID
        facultyId: faculty.id,
        courseName: selectedCourse,
        facultyName: selectedFaculty,
        courseRatings,
        facultyRatings,
        overallRating,
        comments: additionalFeedback,
        date: new Date().toISOString().split('T')[0]
      };
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      if (data.success) {
        alert("Feedback submitted successfully!");
        // Reset form
        setSelectedFaculty("");
        setSelectedCourse("");
        setCourseRatings({
          contentQuality: 0,
          difficultyLevel: 0,
          practicalApplication: 0,
        });
        setFacultyRatings({
          teachingQuality: 0,
          communication: 0,
          availability: 0,
        });
        setOverallRating(0);
        setAdditionalFeedback("");
      } else {
        alert(data.message || "Failed to submit feedback");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error submitting feedback: ${errorMessage}`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-xl">Loading faculty data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex">
      <StudentSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />

        <div className="flex items-center mb-6 ml-6">
          <div className="p-3 mr-4 bg-green-500 rounded-xl shadow-lg">
            <FaComments className="text-gray-100 text-2xl" />
          </div>
          <Typography 
            variant="h4" 
            component="h1" 
            className="font-bold bg-green-500 bg-clip-text text-transparent"
          >
            Feedback Form
          </Typography>
        </div>
        
        <div className="flex-1 w-full px-4">
          <form 
            onSubmit={handleSubmit}
            className="w-full max-w-5xl mx-auto bg-gray-800 rounded-xl shadow-lg p-6"
          >

            {/* Selection Dropdowns */}
            <div className="mb-6">
              <label htmlFor="faculty" className="block text-sm font-medium mb-2">
                Select Faculty
              </label>
              <select
                id="faculty"
                value={selectedFaculty}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Select a faculty member --</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.name}>
                    {faculty.name} - {faculty.course}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Selected Course */}
            {selectedCourse && (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-green-300 font-medium mb-1">Selected Course:</h3>
                <p className="text-lg font-semibold">{selectedCourse}</p>
              </div>
            )}

            {/* Feedback Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Course Feedback */}
              <div className="bg-gray-700 p-5 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-center text-green-300">
                  Course Feedback
                </h2>
                <div className="space-y-5">
                  {["contentQuality", "difficultyLevel", "practicalApplication"].map((aspect) => (
                    <div key={aspect} className="flex flex-col md:flex-row md:items-center justify-between">
                      <p className="font-medium capitalize mb-1 md:mb-0 md:w-1/2">
                        {aspect.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </p>
                      <StarRating
                        rating={courseRatings[aspect] || 0}
                        setRating={(rating) => handleCourseRatingChange(aspect, rating)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Feedback */}
              <div className="bg-gray-700 p-5 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-center text-green-300">
                  Faculty Feedback
                </h2>
                <div className="space-y-5">
                  {["teachingQuality", "communication", "availability"].map((aspect) => (
                    <div key={aspect} className="flex flex-col md:flex-row md:items-center justify-between">
                      <p className="font-medium capitalize mb-1 md:mb-0 md:w-1/2">
                        {aspect.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </p>
                      <StarRating
                        rating={facultyRatings[aspect] || 0}
                        setRating={(rating) => handleFacultyRatingChange(aspect, rating)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overall Feedback */}
            <div className="bg-gray-700 p-5 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold mb-4 text-center text-green-300">
                Overall Feedback
              </h2>
              <div className="flex justify-center">
                <StarRating rating={overallRating} setRating={setOverallRating} />
              </div>
            </div>

            {/* Additional Feedback */}
            <div className="mb-6">
              <label htmlFor="additionalFeedback" className="block text-sm font-medium mb-2">
                Additional Comments
              </label>
              <textarea
                id="additionalFeedback"
                rows={4}
                className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please share any additional thoughts about the course or faculty..."
                value={additionalFeedback}
                onChange={(e) => setAdditionalFeedback(e.target.value)}
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-lg text-white transition duration-200 shadow-lg hover:shadow-blue-500/20"
                disabled={submitting}
              >
                <FaPaperPlane className="text-white" />
                <span>{submitting ? "Submitting..." : "Submit Feedback"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedback;