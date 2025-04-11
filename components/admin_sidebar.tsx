import React from "react";
import { useRouter } from "next/router";
import { 
  ChartBarIcon, 
  UserIcon, 
  AcademicCapIcon, 
  BuildingLibraryIcon, 
  CalendarIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { FiChevronRight } from "react-icons/fi";
import { FaUser } from "react-icons/fa";

const AdminSidebar: React.FC = () => {
  const router = useRouter();
  const currentPath = router.pathname;

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage regardless of API success
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      
      // Redirect to login page
      router.push('/');
    }
  };

  const menuItems = [
    { icon: <ChartBarIcon className="w-6 h-6" />, path: "/admin/admin_dashboard", label: "Dashboard" },
    { icon: <UserIcon className="w-6 h-6" />, path: "/admin/admin_studentmanage", label: "Students" },
    { icon: <AcademicCapIcon className="w-6 h-6" />, path: "/admin/admin_teachermanage", label: "Faculty" },
    { icon: <BuildingLibraryIcon className="w-6 h-6" />, path: "/admin/admin_books", label: "Library" },
    { icon: <CalendarIcon className="w-6 h-6" />, path: "/admin/admin_timetable", label: "Timetable" },
    { icon: <DocumentTextIcon className="w-6 h-6" />, path: "/admin/admin_auditorium", label: "Auditorium" },
  ];

  return (
    <div className="group w-20 hover:w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white h-screen fixed transition-all duration-300 ease-in-out overflow-hidden border-r border-purple-700 shadow-xl">
      <ul className="list-none p-2 m-0">
        {menuItems.map((item) => (
          <li
            key={item.path}
            className={`flex items-center gap-4 p-3 rounded-lg mx-2 mb-1 cursor-pointer transition-all duration-200 ${
              currentPath === item.path
                ? "bg-purple-700 text-white shadow-inner"
                : "hover:bg-purple-700 hover:pl-4 text-gray-300"
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

      <div className="absolute bottom-0 w-full p-4 border-t border-purple-700 hidden group-hover:block bg-purple-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
            <FaUser className="text-white" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="font-medium">Administrator</p>
            <p className="text-xs text-gray-400">admin@university.edu</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;