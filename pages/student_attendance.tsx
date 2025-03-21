import React from "react";
import Sidebar from "../components/student_sidebar";
import { FaTasks } from "react-icons/fa";
import { attendanceData, AttendanceRecord } from "../data/attendanceData";

const Attendance: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <Sidebar />
      <div className="flex-1 flex flex-col mt-10 ml-10">
        <h1 className="text-2xl font-bold mb-4 flex items-center self-start ml-10">
          <FaTasks className="mr-2 text-green-400 text-3xl" />  Attendance
        </h1>

        <div className="w-full max-w-7xl mx-auto">
          <table className="w-full bg-gray-800 text-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-700 text-left">
                <th className="p-4">Course ID</th>
                <th className="p-4">Course Name</th>
                <th className="p-4">Faculty</th>
                <th className="p-4">Total</th>
                <th className="p-4">Present</th>
                <th className="p-4">Duty Leave</th>
                <th className="p-4">Absent</th>
                <th className="p-4">Percentage</th>
                <th className="p-4">Medical</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((row: AttendanceRecord, index: number) => {
                const attendancePercentage =
                  row.total > 0
                    ? ((row.present + row.dutyLeave + row.medical) / row.total) * 100
                    : 0;

                return (
                  <tr
                    key={index}
                    className={`transition-all duration-300 ${
                      attendancePercentage >= 75
                        ? "hover:bg-green-600"
                        : "hover:bg-red-600"
                    } hover:scale-105 rounded-xl`}
                  >
                    <td className="p-4 rounded-l-xl">{row.courseID}</td>
                    <td className="p-4 whitespace-nowrap">{row.courseName}</td>
                    <td className="p-4 whitespace-nowrap">{row.faculty}</td>
                    <td className="p-4">{row.total}</td>
                    <td className="p-4">{row.present}</td>
                    <td className="p-4">{row.dutyLeave}</td>
                    <td className="p-4">{row.absent}</td>
                    <td className="p-4">
                      {attendancePercentage.toFixed(2)}%
                    </td>
                    <td className="p-4 rounded-r-xl">{row.medical}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
