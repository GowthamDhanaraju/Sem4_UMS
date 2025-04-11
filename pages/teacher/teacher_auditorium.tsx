import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import TopBar from "@/components/topbar";
import TeacherSidebar from "@/components/teacher_sidebar";

const CreateAuditorium: React.FC = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    capacity: "",
    amenities: "",
    status: "available",
    statusNote: "",
    hasWhiteboard: false,
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
  
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prevData) => ({
        ...prevData,
        [name]: checked,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const response = await axios.post("/api/auditoriums", {
        ...formData,
        capacity: parseInt(formData.capacity, 10), // Ensure capacity is a number
        amenities: formData.amenities.split(",").map((amenity) => amenity.trim()), // Convert amenities to an array
      });

      if (response.status === 201) {
        setSuccessMessage("Auditorium created successfully!");
        setFormData({
          name: "",
          location: "",
          capacity: "",
          amenities: "",
          status: "available",
          statusNote: "",
          hasWhiteboard: false,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred while creating the auditorium.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex">
      <TeacherSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h1 className="text-2xl font-bold mb-4">Create Auditorium</h1>

            {error && <div className="bg-red-800 text-red-200 p-3 rounded mb-4">{error}</div>}
            {successMessage && <div className="bg-green-800 text-green-200 p-3 rounded mb-4">{successMessage}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  name="amenities"
                  value={formData.amenities}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded"
                  placeholder="e.g., Projector, Sound System, Air Conditioning"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status Note</label>
                <textarea
                  name="statusNote"
                  value={formData.statusNote}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="hasWhiteboard"
                  checked={formData.hasWhiteboard}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Has Whiteboard</label>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
              >
                Book Auditorium
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAuditorium;
