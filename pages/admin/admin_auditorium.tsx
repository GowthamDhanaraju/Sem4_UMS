import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin_sidebar";
import TopBar from "@/components/topbar";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { Typography } from "@mui/material";

interface Auditorium {
  id: string;
  name: string;
  location: string;
  capacity: number;
  hasWhiteboard: boolean;
  status: "available" | "maintenance" | "renovation" | "occupied";
  statusNote?: string;
  amenities: string[];
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  auditoriumId: string;
  faculty: string;
  club?: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "completed";
}

const AdminAuditoriumPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"list" | "add" | "bookings" | "availability">("list");
  const [selectedAuditorium, setSelectedAuditorium] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [auditoriums, setAuditoriums] = useState<Auditorium[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // Form states
  const [auditoriumForm, setAuditoriumForm] = useState<Omit<Auditorium, "id">>({
    name: "",
    location: "",
    capacity: 0,
    hasWhiteboard: false,
    status: "available",
    amenities: []
  });

  const [bookingForm, setBookingForm] = useState({
    title: "",
    date: "",
    time: "",
    auditoriumId: "",
    faculty: "",
    club: "",
    description: ""
  });

  // Fetch auditoriums and events data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch auditoriums - Fix the API endpoint
        const audResponse = await fetch('/api/admin/auditoriums');
        const audData = await audResponse.json();
        setAuditoriums(audData || []);

        // Fetch events/bookings - Fix the API endpoint
        const eventsResponse = await fetch('/api/admin/auditorium-events');
        const eventsData = await eventsResponse.json();
        setEvents(eventsData || []);
      } catch (error) {
        console.error('Error fetching auditorium data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAuditoriumFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setAuditoriumForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setAuditoriumForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAmenityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setAuditoriumForm(prev => {
      if (checked) {
        return { ...prev, amenities: [...prev.amenities, value] };
      } else {
        return { ...prev, amenities: prev.amenities.filter(a => a !== value) };
      }
    });
  };

  const handleAddAuditorium = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/auditoriums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditoriumForm),
      });

      if (!response.ok) {
        throw new Error('Failed to add auditorium');
      }

      const newAuditorium = await response.json();

      // Update local state - Fix to use the returned data directly
      setAuditoriums(prev => [...prev, newAuditorium]);

      // Reset form
      setAuditoriumForm({
        name: "",
        location: "",
        capacity: 0,
        hasWhiteboard: false,
        status: "available",
        amenities: []
      });

      // Switch to list view
      setActiveTab("list");

      alert('Auditorium added successfully!');
    } catch (error) {
      console.error('Error adding auditorium:', error);
      alert('Failed to add auditorium. Please try again.');
    }
  };

  const handleAuditoriumDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this auditorium?")) {
      try {
        await fetch(`/api/admin/auditoriums/${id}`, {
          method: 'DELETE',
        });

        // Update local state
        setAuditoriums(prev => prev.filter(a => a.id !== id));

        alert('Auditorium deleted successfully!');
      } catch (error) {
        console.error('Error deleting auditorium:', error);
        alert('Failed to delete auditorium. Please try again.');
      }
    }
  };

  const handleStatusChange = async (id: string) => {
    const auditorium = auditoriums.find(a => a.id === id);
    if (!auditorium) return;

    const newStatus = prompt("Enter new status (available, maintenance, renovation, occupied)", auditorium.status);
    if (!newStatus) return;

    if (!["available", "maintenance", "renovation", "occupied"].includes(newStatus)) {
      alert("Invalid status. Status must be one of: available, maintenance, renovation, occupied");
      return;
    }

    let statusNote = "";
    if (newStatus !== "available") {
      statusNote = prompt("Enter status note (e.g., duration of renovation)") || "";
    }

    try {
      await fetch(`/api/admin/auditoriums/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, statusNote }),
      });

      // Update local state
      setAuditoriums(prev => prev.map(a => 
        a.id === id ? { ...a, status: newStatus as any, statusNote } : a
      ));

      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating auditorium status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleBookingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/auditorium-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingForm,
          status: "pending"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add booking');
      }

      const newEvent = await response.json();

      // Update local state
      setEvents(prev => [...prev, newEvent]);

      // Reset form
      setBookingForm({
        title: "",
        date: "",
        time: "",
        auditoriumId: "",
        faculty: "",
        club: "",
        description: ""
      });

      alert('Booking added successfully!');
    } catch (error) {
      console.error('Error adding booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to add booking. Please try again.');
    }
  };

  const handleEventStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/auditorium-events/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === id ? { ...event, status: newStatus as any } : event
      ));

      alert(`Event ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Failed to update event status. Please try again.');
    }
  };

  const handleEventDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await fetch(`/api/admin/auditorium-events/${id}`, {
          method: 'DELETE',
        });

        // Update local state
        setEvents(prev => prev.filter(e => e.id !== id));

        alert('Event deleted successfully!');
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  // Helper functions for styling
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "available": return "bg-green-900 text-green-300";
      case "maintenance": return "bg-yellow-900 text-yellow-300";
      case "renovation": return "bg-purple-900 text-purple-300";
      case "occupied": return "bg-red-900 text-red-300";
      default: return "bg-gray-900 text-gray-300";
    }
  };

  const getEventStatusColorClass = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-900 text-green-300";
      case "pending": return "bg-yellow-900 text-yellow-300";
      case "rejected": return "bg-red-900 text-red-300";
      case "completed": return "bg-gray-600 text-gray-300";
      default: return "bg-gray-900 text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200">
        <AdminSidebar />
        <div className="ml-16 p-6 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl">Loading auditorium data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <AdminSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex items-center space-x-4 ml-12">
          <div className="p-3 bg-purple-700 rounded-xl shadow-lg">
            <BuildingOfficeIcon className="w-8 h-8" />
          </div>
          <Typography variant="h4" component="h1" className="font-bold bg-purple-600 bg-clip-text text-transparent">
            Auditorium Management
          </Typography>
        </div>
        <div className="ml-8 p-6">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
              <button 
                className={`px-4 py-2 font-medium ${activeTab === "list" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"}`}
                onClick={() => setActiveTab("list")}
              >
                Auditoriums List
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === "add" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"}`}
                onClick={() => setActiveTab("add")}
              >
                Add New Auditorium
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === "bookings" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"}`}
                onClick={() => setActiveTab("bookings")}
              >
                Manage Bookings
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === "availability" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"}`}
                onClick={() => setActiveTab("availability")}
              >
                Availability Overview
              </button>
            </div>
            
            {/* Content based on activeTab */}
            {activeTab === "list" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Available Auditoriums</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {auditoriums.length > 0 ? (
                    auditoriums.map((auditorium) => (
                      <div key={auditorium.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-colors">
                        <h3 className="text-lg font-semibold">{auditorium.name}</h3>
                        <p className="text-gray-300">Location: {auditorium.location}</p>
                        <p className="text-gray-300">Capacity: {auditorium.capacity} seats</p>
                        <div className="flex items-center mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColorClass(auditorium.status)}`}>
                            {auditorium.status.charAt(0).toUpperCase() + auditorium.status.slice(1)}
                          </span>
                          {auditorium.statusNote && (
                            <span className="text-xs ml-2 text-gray-400">{auditorium.statusNote}</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-1">Amenities:</p>
                          <div className="flex flex-wrap gap-1">
                            {auditorium.amenities.map((amenity, index) => (
                              <span key={index} className="text-xs bg-gray-600 px-2 py-1 rounded">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                          <button 
                            onClick={() => handleStatusChange(auditorium.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Change Status
                          </button>
                          <button 
                            onClick={() => handleAuditoriumDelete(auditorium.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      No auditoriums found. Add some to get started.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === "add" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Add New Auditorium</h2>
                <form onSubmit={handleAddAuditorium} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Auditorium Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={auditoriumForm.name}
                        onChange={handleAuditoriumFormChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Location</label>
                      <input 
                        type="text" 
                        name="location"
                        value={auditoriumForm.location}
                        onChange={handleAuditoriumFormChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Capacity</label>
                      <input 
                        type="number" 
                        name="capacity"
                        value={auditoriumForm.capacity}
                        onChange={handleAuditoriumFormChange}
                        min="1"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Status</label>
                      <select
                        name="status"
                        value={auditoriumForm.status}
                        onChange={handleAuditoriumFormChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      >
                        <option value="available">Available</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="renovation">Renovation</option>
                        <option value="occupied">Occupied</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <input 
                        type="checkbox"
                        name="hasWhiteboard"
                        id="hasWhiteboard"
                        checked={auditoriumForm.hasWhiteboard}
                        onChange={handleAuditoriumFormChange}
                        className="mr-2 bg-gray-700 border-gray-600"
                      />
                      <label htmlFor="hasWhiteboard" className="text-gray-300">Has Whiteboard</label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1">Amenities</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Projector', 'Sound System', 'Air Conditioning', 'Stage Lighting', 'Video Conferencing', 'Lecture Recording System'].map(amenity => (
                        <div key={amenity} className="flex items-center">
                          <input 
                            type="checkbox"
                            id={`amenity-${amenity}`}
                            value={amenity}
                            checked={auditoriumForm.amenities.includes(amenity)}
                            onChange={handleAmenityChange}
                            className="mr-2"
                          />
                          <label htmlFor={`amenity-${amenity}`} className="text-gray-300">{amenity}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Add Auditorium
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {activeTab === "bookings" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Manage Auditorium Bookings</h2>
                <div className="mb-6">
                  <label className="block text-gray-300 mb-1">Filter by Auditorium</label>
                  <select
                    value={selectedAuditorium || ""}
                    onChange={(e) => setSelectedAuditorium(e.target.value || null)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">All Auditoriums</option>
                    {auditoriums.map(aud => (
                      <option key={aud.id} value={aud.id}>{aud.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Auditorium</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {events.length > 0 ? (
                        events
                          .filter(event => !selectedAuditorium || event.auditoriumId === selectedAuditorium)
                          .map(event => {
                            const auditorium = auditoriums.find(a => a.id === event.auditoriumId);
                            return (
                              <tr key={event.id} className="hover:bg-gray-650">
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-white">{event.title}</p>
                                    <p className="text-sm text-gray-400">{event.faculty}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm">{new Date(event.date).toLocaleDateString()}</p>
                                  <p className="text-sm text-gray-400">{event.time}</p>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {auditorium?.name || 'Unknown'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusColorClass(event.status)}`}>
                                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="flex space-x-2">
                                    {event.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleEventStatusChange(event.id, 'approved')}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleEventStatusChange(event.id, 'rejected')}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    {event.status === 'approved' && (
                                      <button
                                        onClick={() => handleEventStatusChange(event.id, 'completed')}
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        Mark Completed
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleEventDelete(event.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                            No bookings found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-3">Add New Booking</h3>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-1">Event Title</label>
                        <input 
                          type="text" 
                          name="title"
                          value={bookingForm.title}
                          onChange={handleBookingInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Auditorium</label>
                        <select
                          name="auditoriumId"
                          value={bookingForm.auditoriumId}
                          onChange={handleBookingInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                          required
                        >
                          <option value="">Select an Auditorium</option>
                          {auditoriums.map(aud => (
                            <option key={aud.id} value={aud.id}>{aud.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Date</label>
                        <input 
                          type="date" 
                          name="date"
                          value={bookingForm.date}
                          onChange={handleBookingInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Time Slot</label>
                        <select
                          name="time"
                          value={bookingForm.time}
                          onChange={handleBookingInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                          required
                        >
                          <option value="">Select Time Slot</option>
                          <option value="9:00 AM - 11:00 AM">9:00 AM - 11:00 AM</option>
                          <option value="11:30 AM - 1:30 PM">11:30 AM - 1:30 PM</option>
                          <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                          <option value="4:30 PM - 6:30 PM">4:30 PM - 6:30 PM</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Faculty</label>
                        <input 
                          type="text" 
                          name="faculty"
                          value={bookingForm.faculty}
                          onChange={handleBookingInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Club (Optional)</label>
                        <input 
                          type="text" 
                          name="club"
                          value={bookingForm.club}
                          onChange={handleBookingInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={bookingForm.description}
                        onChange={handleBookingInputChange}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      ></textarea>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Add Booking
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {activeTab === "availability" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Auditorium Availability</h2>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1">Select Date</label>
                  <input 
                    type="date" 
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    value={new Date().toISOString().split('T')[0]} // Default to today
                    onChange={(e) => {
                      // You could add date filtering functionality here
                      console.log("Selected date:", e.target.value);
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {auditoriums.map(auditorium => (
                    <div key={auditorium.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h3 className="text-lg font-semibold">{auditorium.name}</h3>
                      <p className="text-sm text-gray-300 mb-2">Capacity: {auditorium.capacity} seats</p>
                      
                      <div className={`text-xs px-2 py-1 rounded inline-block mb-2 ${getStatusColorClass(auditorium.status)}`}>
                        {auditorium.status.charAt(0).toUpperCase() + auditorium.status.slice(1)}
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-1">Available Time Slots:</p>
                        <div className="space-y-1">
                          {['9:00 AM - 11:00 AM', '11:30 AM - 1:30 PM', '2:00 PM - 4:00 PM', '4:30 PM - 6:30 PM'].map(slot => {
                            const isBooked = auditorium.status !== 'available' || events.some(event => 
                              event.auditoriumId === auditorium.id &&
                              event.time === slot &&
                              new Date(event.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0] &&
                              (event.status === 'approved' || event.status === 'pending')
                            );
                            return (
                              <div 
                                key={slot} 
                                className={`text-sm py-1 px-2 rounded ${isBooked ? 'bg-red-900/40 text-red-200' : 'bg-green-900/40 text-green-200'}`}
                              >
                                {slot} - {isBooked ? 'Booked' : 'Available'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditoriumPage;