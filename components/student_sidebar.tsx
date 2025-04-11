import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FiChevronRight } from "react-icons/fi";
import {
  ChartBarIcon,
  UserCircleIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  BuildingLibraryIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { FaUser } from "react-icons/fa";

const StudentSidebar: React.FC = () => {
  const router = useRouter();
  const currentPath = router.pathname;
  const [studentName, setStudentName] = useState("Student");
  const [studentEmail, setStudentEmail] = useState("student@university.edu");

  useEffect(() => {
    // Get student data from localStorage or fetch from backend
    const storedStudentName = localStorage.getItem("userName");
    const storedStudentEmail = localStorage.getItem("userEmail");
    
    if (storedStudentName) setStudentName(storedStudentName);
    if (storedStudentEmail) setStudentEmail(storedStudentEmail);
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    // Redirect to login page
    router.push("/");
  };

  const menuItems = [
    { path: "/student/student_dashboard", icon: <ChartBarIcon className="w-6 h-6" />, label: "Dashboard" },
    { path: "/student/student_profile", icon: <UserCircleIcon className="w-6 h-6" />, label: "Profile" },
    { path: "/student/student_grade", icon: <AcademicCapIcon className="w-6 h-6" />, label: "Grades" },
    { path: "/student/student_attendance", icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />, label: "Attendance" },
    { path: "/student/student_feedback", icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />, label: "Feedback" },
    { path: "/student/student_books", icon: <BuildingLibraryIcon className="w-6 h-6" />, label: "Library" },
  ];
  
  return (
    <div className="group w-20 hover:w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white h-screen fixed transition-all duration-300 ease-in-out overflow-hidden border-r border-gray-700 shadow-xl">
      <ul className="list-none p-2 m-0">
        {menuItems.map((item) => (
          <li
            key={item.path}
            className={`flex items-center gap-4 p-3 rounded-lg mx-2 mb-1 cursor-pointer transition-all duration-200 ${
              currentPath === item.path
                ? "bg-gray-700 text-black shadow-inner"
                : "hover:bg-gray-700 hover:pl-4"
            }`}
            onClick={() => navigateTo(item.path)}
          >
            <div className="min-w-[24px] flex justify-center">
              {React.cloneElement(item.icon, {
                className: `text-xl ${currentPath === item.path ? "text-white" : "text-gray-300"}`,
              })}
            </div>
            <span className="hidden group-hover:inline-block font-medium text-gray-200">
              {item.label}
            </span>
            <FiChevronRight className="ml-auto hidden group-hover:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </li>
        ))}
      </ul>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-700 hidden group-hover:block bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
            <FaUser className="text-white" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="font-medium">{studentName}</p>
            <p className="text-xs text-gray-400">{studentEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSidebar;