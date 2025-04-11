import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

const TopBar: React.FC = () => {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("");
  
  useEffect(() => {
    setMounted(true);
    // Update time every minute
    const interval = setInterval(() => setTime(new Date()), 60000);
    
    // Get user data from localStorage
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) setUserName(storedUserName);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleLogout = () => {
    // Clear user session data
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("role");
    
    // Redirect to login page
    router.push("/");
  };
  
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center pl-4">
          {mounted ? (
            <>
              <span className="text-2xl font-semibold mr-2">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-gray-400">|</span>
              <span className="ml-2 text-gray-300">
                {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </>
          ) : (
            <span className="text-gray-400">Loading...</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
      <hr className="border-gray-700 mb-6" />
    </>
  );
};

export default TopBar;
