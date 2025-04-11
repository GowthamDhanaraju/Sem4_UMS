import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import StudentSidebar from "@/components/student_sidebar";
import TopBar from "@/components/topbar";
import { Typography } from "@mui/material";
import { FiUser } from "react-icons/fi";

const StudentProfile: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Student profile data
  const [profileData, setProfileData] = useState({
    personal: {
      name: "",
      photo: "", 
      dob: "",
      gender: "",
      studentId: "",
      joinYear: "",
      bloodGroup: "",
      nationality: ""
    },
    contact: {
      email: "",
      phone: ""
    },
    academic: {
      department: "",
      year: "",
      semester: "",
      cgpa: "",
      attendance: "",
      previousEducation: {
        school: "",
        grade: "",
        year: ""
      }
    }
  });
  
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "student") {
      router.push("/");
      return;
    }
    
    fetchStudentProfile();
  }, [router]);
  
  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem("userId") || "";
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/login");
        return;
      }
      
      // First fetch profile data
      const response = await fetch(`/api/students/${studentId}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Then fetch grades to get calculated CGPA
      const gradesResponse = await fetch(`/api/students/${studentId}/grades`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      let calculatedCGPA = "";
      if (gradesResponse.ok) {
        const gradesData = await gradesResponse.json();
        if (gradesData.success && gradesData.data && gradesData.data.cgpa) {
          calculatedCGPA = gradesData.data.cgpa.toFixed(2);
        }
      }
      
      if (data.success) {
        // If we got a calculated CGPA from grades, use that instead
        if (calculatedCGPA) {
          data.data.academic.cgpa = calculatedCGPA;
        }
        setProfileData(data.data);
        
        // Update local storage with latest name and email
        localStorage.setItem("userName", data.data.personal.name || "Student");
        localStorage.setItem("userEmail", data.data.contact.email || "student@university.edu");
      } else {
        setError(data.message || "Failed to load profile");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch profile: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-gray-200">
        <StudentSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-xl">Loading profile...</span>
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
                onClick={fetchStudentProfile} 
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
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <StudentSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex items-center justify-between mb-8 ml-6 mr-6">
          <div className="flex items-center">
            <div className="p-3 mr-4 bg-green-500 rounded-xl shadow-lg">
              <FiUser className="text-gray-100 text-2xl" />
            </div>
            <Typography 
              variant="h4" 
              component="h1" 
              className="font-bold bg-green-500 bg-clip-text text-transparent"
            >
              Student Profile
            </Typography>
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 border border-gray-700 flex flex-wrap gap-6 ml-6">
          <div className="w-32 h-32 rounded-full bg-green-600 flex items-center justify-center text-4xl font-bold">
            {profileData.personal.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{profileData.personal.name}</h2>
            <p className="text-xl text-green-400">{profileData.academic.department}</p>
            <p className="text-gray-400">{profileData.academic.year}, {profileData.academic.semester} Semester</p>
            <div className="mt-2 flex gap-4 flex-wrap">
              <div className="px-3 py-1 rounded-full bg-gray-700 text-sm">Student ID: {profileData.personal.studentId}</div>
              <div className="px-3 py-1 rounded-full bg-gray-700 text-sm">CGPA: {profileData.academic.cgpa}</div>
              <div className="px-3 py-1 rounded-full bg-gray-700 text-sm">Attendance: {profileData.academic.attendance}</div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 ml-6">
          <h3 className="text-xl font-bold mb-4 text-green-400">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Full Name</p>
              <p>{profileData.personal.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Date of Birth</p>
              <p>{new Date(profileData.personal.dob).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-400">Gender</p>
              <p>{profileData.personal.gender}</p>
            </div>
            <div>
              <p className="text-gray-400">Student ID</p>
              <p>{profileData.personal.studentId}</p>
            </div>
            <div>
              <p className="text-gray-400">Join Year</p>
              <p>{profileData.personal.joinYear}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 ml-6">
          <h3 className="text-xl font-bold mb-4 text-green-400">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Email</p>
              <p>{profileData.contact.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Phone</p>
              <p>{profileData.contact.phone}</p>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 mb-6 ml-6">
          <h3 className="text-xl font-bold mb-4 text-green-400">Academic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Department</p>
              <p>{profileData.academic.department}</p>
            </div>
            <div>
              <p className="text-gray-400">Current Year</p>
              <p>{profileData.academic.year}</p>
            </div>
            <div>
              <p className="text-gray-400">Current Semester</p>
              <p>{profileData.academic.semester}</p>
            </div>
            <div>
              <p className="text-gray-400">CGPA</p>
              <p>{profileData.academic.cgpa}</p>
            </div>
            <div>
              <p className="text-gray-400">Attendance</p>
              <p>{profileData.academic.attendance}</p>
            </div>
          </div>
        </div>

        {/* Previous Education */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 mb-6 ml-6">
          <h3 className="text-xl font-bold mb-4 text-green-400">Previous Education</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">School/Institution</p>
              <p>{profileData.academic.previousEducation?.school || "Not available"}</p>
            </div>
            <div>
              <p className="text-gray-400">Grade/Percentage</p>
              <p>{profileData.academic.previousEducation?.grade || "Not available"}</p>
            </div>
            <div>
              <p className="text-gray-400">Year of Completion</p>
              <p>{profileData.academic.previousEducation?.year || "Not available"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;