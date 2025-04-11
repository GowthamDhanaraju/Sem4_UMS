import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ChartBarIcon, UserIcon, CalendarIcon, BuildingOfficeIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { FiChevronRight } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import axios from "axios";

interface TeacherProfile {
  name: string;
  email: string;
}

const TeacherSidebar: React.FC = () => {
  const router = useRouter();
  const currentPath = router.pathname;
  const [profile, setProfile] = useState<TeacherProfile>({ name: "", email: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get("/api/teacher/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile({
          name: response.data.name || "Teacher Name",
          email: response.data.email || "teacher@university.edu",
        });
      } catch (error) {
        console.error("Failed to fetch teacher profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const menuItems = [
    { icon: <ChartBarIcon className="w-6 h-6" />, path: "/teacher/teacher_dashboard", label: "Dashboard" },
    { icon: <UserIcon className="w-6 h-6" />, path: "/teacher/teacher_profile", label: "Profile" },
    { icon: <CalendarIcon className="w-6 h-6" />, path: "/teacher/teacher_timetable", label: "Timetable" },
    { icon: <BuildingOfficeIcon className="w-6 h-6" />, path: "/teacher/teacher_auditorium", label: "Auditorium" },
    { icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, path: "/teacher/teacher_attendance", label: "Attendance" },
  ];

  return (
    <div className="group w-20 hover:w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white h-screen fixed transition-all duration-300 ease-in-out overflow-hidden border-r border-gray-700 shadow-xl">
      <ul className="list-none p-2 m-0">
        {menuItems.map((item) => (
          <li
            key={item.path}
            className={`flex items-center gap-4 p-3 rounded-lg mx-2 mb-1 cursor-pointer transition-all duration-200 ${
              currentPath === item.path
                ? "bg-gray-700 text-white shadow-inner"
                : "hover:bg-gray-700 hover:pl-4 text-gray-300"
            }`}
            onClick={() => navigateTo(item.path)}
          >
            <div className="min-w-[24px] flex justify-center">
              {React.cloneElement(item.icon, {
                className: `w-6 h-6 ${currentPath === item.path ? "text-white" : "text-gray-300"}`,
              })}
            </div>
            <span className="hidden group-hover:inline-block font-medium">
              {item.label}
            </span>
            <FiChevronRight className="ml-auto hidden group-hover:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </li>
        ))}
      </ul>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-700 hidden group-hover:block bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <FaUser className="text-white" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="font-medium">{profile.name}</p>
            <p className="text-xs text-gray-400">{profile.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSidebar;