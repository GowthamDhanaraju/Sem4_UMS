import React, { useState, useEffect } from 'react';

const TimetableManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/classes');
        const data = await response.json();
        
        if (data.success) {
          // Ensure we're setting an array
          setClasses(Array.isArray(data.data) ? data.data : []);
        } else {
          console.error("API returned error:", data.message);
          setError("Failed to load classes: " + (data.message || "Unknown error"));
          setClasses([]); // Initialize as empty array on error
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("An error occurred while fetching classes");
        setClasses([]); // Initialize as empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (loading) return <p>Loading classes...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="timetable-management">
      <h1>Timetable Management</h1>
      
      {Array.isArray(classes) && classes.length > 0 ? (
        <div className="classes-list">
          {classes.map((classItem) => (
            <div key={classItem.id} className="class-item">
              <h3>{classItem.name}</h3>
              <p>Time: {classItem.time}</p>
              <p>Room: {classItem.room}</p>
              <p>Instructor: {classItem.instructor}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No classes available</p>
      )}
    </div>
  );
};

export default TimetableManagement;