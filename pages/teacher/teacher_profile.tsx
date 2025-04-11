import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import TeacherSidebar from "@/components/teacher_sidebar";
import TopBar from "@/components/topbar";
import { Typography } from "@mui/material";
import { FiUser } from "react-icons/fi";
import axios from "axios";

interface ProfileData {
  personal: {
    name: string;
    photo: string;
    dob: string;
    gender: string;
    facultyId: string;
    joinDate: string;
  };
  contact: {
    email: string;
    contact: string; // Changed from phone to contact
  };
  professional: {
    department: string;
    designation: string;
    specialization: string;
    officeHours: string;
  };
}

const TeacherProfile: React.FC = () => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    personal: {
      name: "",
      photo: "",
      dob: "",
      gender: "",
      facultyId: "",
      joinDate: "",
    },
    contact: {
      email: "",
      contact: "", // Changed from phone to contact
    },
    professional: {
      department: "",
      designation: "",
      specialization: "",
      officeHours: "",
    },
  });

  const [editData, setEditData] = useState({ ...profileData });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          router.push("/login");
          return;
        }

        const storedRole = localStorage.getItem("role");
        if (storedRole !== "teacher") {
          router.push("/");
          return;
        }

        const response = await axios.get("/api/teacher/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Transform API data to match our UI structure if needed
        const apiData = response.data;
        const formattedData = {
          personal: {
            name: apiData.name || "",
            dob: apiData.dob || "",
            gender: apiData.gender || "",
            facultyId: apiData.facultyId || "",
            joinDate: apiData.joinDate || "", // Ensure joinDate is properly captured
          },
          contact: {
            email: apiData.email || "",
            contact: apiData.contact || "", // Changed from phone to contact
          },
          professional: {
            department: apiData.department || "",
            designation: apiData.designation || "",
            specialization: apiData.specialization || "",
            officeHours: apiData.officeHours || "",
          },
        };

        setProfileData(formattedData);
        setEditData(formattedData);
        setError("");
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
        setError("Failed to load profile data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [router]);

  const handleEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(true);
    setSaveSuccess(false);
    setSaveError("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
  };

  const handleSave = async () => {
    try {
      setSaveError("");
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      // Transform our UI data structure to match what the API expects
      const apiData = {
        name: editData.personal.name,
        dob: editData.personal.dob,
        gender: editData.personal.gender,
        facultyId: editData.personal.facultyId,
        email: editData.contact.email,
        contact: editData.contact.contact, // Changed from phone to contact
        department: editData.professional.department,
        designation: editData.professional.designation,
        specialization: editData.professional.specialization,
        officeHours: editData.professional.officeHours,
      };

      await axios.put("/api/teacher/profile", apiData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProfileData({ ...editData });
      setIsEditing(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveError("Failed to update profile. Please try again.");
    }
  };

  const handleInputChange = (
    section: keyof typeof profileData,
    field: string,
    value: string
  ) => {
    setEditData({
      ...editData,
      [section]: {
        ...editData[section],
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex bg-gray-900 min-h-screen">
        <TeacherSidebar />
        <div className="ml-16 p-6 w-full text-gray-200 flex items-center justify-center">
          <div>Loading profile data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <TeacherSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 mb-6 rounded-lg">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 p-4 mb-6 rounded-lg">
            Profile updated successfully!
          </div>
        )}

        <div className="flex items-center justify-between mb-8 ml-6 mr-6">
          <div className="flex items-center">
            <div className="p-3 mr-4 bg-blue-500 rounded-xl shadow-lg">
              <FiUser className="text-gray-100 text-2xl" />
            </div>
            <Typography
              variant="h4"
              component="h1"
              className="font-bold bg-blue-500 bg-clip-text text-transparent"
            >
              Teacher Profile
            </Typography>
          </div>
          {/* Removed edit profile button */}
        </div>

        {saveError && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 mt-4 rounded-lg">
            {saveError}
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 border border-gray-700 flex flex-wrap gap-6 ml-6">
          <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold">
            {profileData.personal.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{profileData.personal.name}</h2>
            <p className="text-xl text-blue-400">
              {profileData.professional.designation}
            </p>
            <p className="text-gray-400">{profileData.professional.department}</p>
            <div className="mt-2 flex gap-4">
              <div className="px-3 py-1 rounded-full bg-gray-700 text-sm">
                Faculty ID: {profileData.personal.facultyId}
              </div>
              <div className="px-3 py-1 rounded-full bg-gray-700 text-sm">
                Joined:{" "}
                {new Date(profileData.personal.joinDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 ml-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Full Name</p>
              <p>{profileData.personal.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Date of Birth</p>
              <p>
                {new Date(profileData.personal.dob).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Gender</p>
              <p>{profileData.personal.gender}</p>
            </div>
            <div>
              <p className="text-gray-400">Faculty ID</p>
              <p>{profileData.personal.facultyId}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 ml-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Email</p>
              <p>{profileData.contact.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Contact</p>
              <p>{profileData.contact.contact}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-md mt-6 border border-gray-700 ml-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">
            Professional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Department</p>
              <p>{profileData.professional.department}</p>
            </div>
            <div>
              <p className="text-gray-400">Designation</p>
              <p>{profileData.professional.designation}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-400">Specialization</p>
              <p>{profileData.professional.specialization}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-400">Office Hours</p>
              <p>{profileData.professional.officeHours}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
