import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin_sidebar";
import TopBar from "@/components/topbar";
import { BookOpenIcon } from "@heroicons/react/16/solid";
import { Typography } from "@mui/material";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  publisher: string;
  copies: number;
  available: number;
  location: string;
  borrowedBooks?: BorrowedBook[];
}

interface BorrowedBook {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: string;
  student?: {
    name: string;
    studentId: string;
  };
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

const BookManagement: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newBook, setNewBook] = useState<Book>({
    id: "",
    title: "",
    author: "",
    category: "",
    isbn: "",
    publisher: "",
    copies: 0,
    available: 0,
    location: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'books' | 'borrowed'>('books');
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [borrowHistoryVisible, setBorrowHistoryVisible] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowingBook, setBorrowingBook] = useState<Book | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        console.log('Fetching books from API');
        
        // Updated endpoint with proper path
        const response = await fetch('/api/library/books', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn("API endpoint not found, using fallback data");
            useFallbackBooks();
            return;
          }
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (data.success) {
          setBooks(data.data);
        } else if (Array.isArray(data)) {
          setBooks(data);
        } else if (data.books) {
          setBooks(data.books);
        } else {
          console.warn("API returned unexpected format, using fallback data");
          useFallbackBooks();
        }
      } catch (err) {
        console.error("Error fetching books:", err);
        setError(`Failed to fetch books: ${err instanceof Error ? err.message : 'Unknown error'}`);
        useFallbackBooks();
      } finally {
        setLoading(false);
        // Attempt to fetch borrowed books data regardless of books fetch success
        fetchBorrowedBooks();
        fetchStudents();
      }
    };
    
    const fetchBorrowedBooks = async () => {
      try {
        // Updated endpoint for borrowed books
        const response = await fetch('/api/library/borrowed-books', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch borrowed books: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setBorrowedBooks(data.data);
        } else if (Array.isArray(data)) {
          setBorrowedBooks(data);
        } else {
          console.warn("Could not retrieve borrowed books data");
        }
      } catch (err) {
        console.error("Error fetching borrowed books:", err);
      }
    };

    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/students', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`Failed to fetch students: ${response.status}`);
          return;
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setStudents(data.data);
        } else if (Array.isArray(data)) {
          setStudents(data);
        } else {
          console.warn("Could not retrieve students data");
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    
    const useFallbackBooks = () => {
      const seedBooks = [
        { 
          id: "1", 
          title: 'Introduction to Algorithms', 
          author: 'Thomas H. Cormen', 
          category: 'Computer Science',
          isbn: '9780262033848',
          publisher: 'MIT Press',
          copies: 10,
          available: 8,
          location: 'CS Section, Shelf 1'
        },
        { 
          id: "2", 
          title: 'Database System Concepts', 
          author: 'Abraham Silberschatz', 
          category: 'Computer Science',
          isbn: '9780073523323',
          publisher: 'McGraw-Hill',
          copies: 8,
          available: 5,
          location: 'CS Section, Shelf 2'
        },
        { 
          id: "3", 
          title: 'Operating System Concepts', 
          author: 'Abraham Silberschatz', 
          category: 'Computer Science',
          isbn: '9781118063330',
          publisher: 'Wiley',
          copies: 12,
          available: 9,
          location: 'CS Section, Shelf 2'
        },
        {
          id: "4",
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          category: 'Fiction',
          isbn: '9780743273565',
          publisher: 'Scribner',
          copies: 15,
          available: 12,
          location: 'Fiction Section, Shelf 3'
        },
        {
          id: "5",
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          category: 'Fiction',
          isbn: '9780061120084',
          publisher: 'HarperCollins',
          copies: 18,
          available: 14,
          location: 'Fiction Section, Shelf 4'
        }
      ];
      
      setBooks(seedBooks);
      console.log("Using fallback seed data");
    };
    
    fetchBooks();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedValue =
      name === "copies" || name === "available" ? parseInt(value) : value;
    if (editingBook) {
      setEditingBook({ ...editingBook, [name]: updatedValue });
    } else {
      setNewBook({ ...newBook, [name]: updatedValue });
    }
  };

  const addBook = async () => {
    if (!newBook.title || !newBook.author || !newBook.category) {
      alert("Please fill in required fields: Title, Author, and Category");
      return;
    }

    try {
      // Updated API endpoint for adding books
      const response = await fetch('/api/library/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBook),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const bookWithId = {
          ...data.data,
          available: data.data.copies,
        };
        setBooks([...books, bookWithId]);
        setNewBook({
          id: "",
          title: "",
          author: "",
          category: "",
          isbn: "",
          publisher: "",
          copies: 0,
          available: 0,
          location: "",
        });
        setShowModal(false);
      } else {
        alert("Failed to add book");
      }
    } catch (err) {
      alert(`Error adding book: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    }
  };

  const startEditing = (book: Book) => {
    setEditingBook(book);
    setShowModal(true);
  };

  const saveEdits = async () => {
    if (!editingBook) return;
    if (!editingBook.title || !editingBook.author || !editingBook.category) {
      alert("Please fill in required fields: Title, Author, and Category");
      return;
    }

    try {
      // Updated API endpoint for updating books
      const response = await fetch(`/api/library/books/${editingBook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingBook),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBooks(
          books.map((book) => (book.id === editingBook.id ? editingBook : book))
        );
        setEditingBook(null);
        setShowModal(false);
      } else {
        alert("Failed to update book");
      }
    } catch (err) {
      alert(`Error updating book: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    }
  };

  const deleteBook = async (id: string) => {
    if (confirm("Are you sure you want to delete this book?")) {
      try {
        // Updated API endpoint for deleting books
        const response = await fetch(`/api/library/books/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setBooks(books.filter((book) => book.id !== id));
        } else {
          alert("Failed to delete book");
        }
      } catch (err) {
        alert(`Error deleting book: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(err);
      }
    }
  };

  const startBorrowing = (book: Book) => {
    if (book.available <= 0) {
      alert("No copies available for borrowing");
      return;
    }
    setBorrowingBook(book);
    setShowBorrowModal(true);
  };

  const handleBorrow = async () => {
    if (!borrowingBook || !selectedStudent) {
      alert("Please select a student to borrow the book");
      return;
    }

    try {
      const response = await fetch('/api/library/borrow-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: borrowingBook.id,
          studentId: selectedStudent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the UI - reduce available copies for the borrowed book
        setBooks(books.map(book => 
          book.id === borrowingBook.id 
            ? { ...book, available: book.available - 1 } 
            : book
        ));

        // Update borrowed books list
        fetchBorrowedBooks();
        
        alert("Book borrowed successfully!");
        setShowBorrowModal(false);
        setBorrowingBook(null);
        setSelectedStudent("");
      } else {
        alert("Failed to borrow book");
      }
    } catch (err) {
      alert(`Error borrowing book: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    }
  };

  const handleReturn = async (borrowId: string, bookId: string) => {
    try {
      const response = await fetch('/api/library/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          borrowId: borrowId,
          bookId: bookId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the UI - increase available copies for the returned book
        setBooks(books.map(book => 
          book.id === bookId 
            ? { ...book, available: book.available + 1 } 
            : book
        ));

        // Update borrowed books list
        setBorrowedBooks(borrowedBooks.filter(item => item.id !== borrowId));
        
        alert("Book returned successfully!");
      } else {
        alert("Failed to return book");
      }
    } catch (err) {
      alert(`Error returning book: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    }
  };

  const fetchBorrowedBooks = async () => {
    try {
      const response = await fetch('/api/library/borrowed-books', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch borrowed books: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setBorrowedBooks(data.data);
      } else if (Array.isArray(data)) {
        setBorrowedBooks(data);
      } else {
        console.warn("Could not retrieve borrowed books data");
      }
    } catch (err) {
      console.error("Error fetching borrowed books:", err);
    }
  };

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author} ${book.category}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const groupedBooks = filteredBooks.reduce((acc, book) => {
    acc[book.category] = acc[book.category] || [];
    acc[book.category].push(book);
    return acc;
  }, {} as { [key: string]: Book[] });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-xl">Loading books...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16">
          <TopBar />
          <div className="flex justify-center items-center h-[80vh] flex-col">
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg max-w-md">
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
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
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <AdminSidebar />
      <div className="flex-1 p-6 ml-16">
        <TopBar />
        <div className="flex items-center space-x-4 ml-10">
          <div className="p-3 bg-purple-700 rounded-xl shadow-lg">
            <BookOpenIcon className="w-8 h-8" />
          </div>
          <Typography variant="h4" component="h1" className="font-bold bg-purple-600 bg-clip-text text-transparent">
            Library Management
          </Typography>
        </div>

        <div className="mt-4 ml-10 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('books')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'books' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Manage Books
            </button>
            <button
              onClick={() => setActiveTab('borrowed')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'borrowed' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Borrowed Books
            </button>
          </div>
        </div>

      <div className="ml-16 p-6 w-full text-gray-200 ml-4">
        {activeTab === 'books' && (
          <>
            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-lg font-semibold mb-4">
                {editingBook ? "Edit Book" : "Add Book"}
              </h2>
      
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <input
                  name="title"
                  placeholder="Title"
                  value={editingBook ? editingBook.title : newBook.title}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="author"
                  placeholder="Author"
                  value={editingBook ? editingBook.author : newBook.author}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="category"
                  placeholder="Category"
                  value={editingBook ? editingBook.category : newBook.category}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="copies"
                  type="number"
                  placeholder="Copies"
                  value={editingBook ? editingBook.copies : newBook.copies}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="available"
                  type="number"
                  placeholder="Available"
                  value={editingBook ? editingBook.available : newBook.available}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="isbn"
                  placeholder="ISBN"
                  value={editingBook ? editingBook.isbn : newBook.isbn}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="publisher"
                  placeholder="Publisher"
                  value={editingBook ? editingBook.publisher : newBook.publisher}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <input
                  name="location"
                  placeholder="Location"
                  value={editingBook ? editingBook.location : newBook.location}
                  onChange={handleInputChange}
                  className="p-2 rounded bg-gray-700 text-white"
                />
              </div>
      
              <div className="mt-4 flex space-x-2">
                {editingBook ? (
                  <button
                    onClick={saveEdits}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={addBook}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    Add Book
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingBook(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
      
            <div className="bg-gray-800 p-6 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Book List</h2>
              <input
                type="text"
                placeholder="🔍 Search by title, author, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4 w-full p-2 bg-gray-700 text-white rounded"
              />
      
              {books.length === 0 && !loading ? (
                <div className="text-center py-4 text-gray-400">
                  No books found. Add some books to get started.
                </div>
              ) : (
                Object.entries(groupedBooks).map(([category, booksInCategory]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-indigo-400 font-semibold mb-2">📘 {category}</h3>
                    <table className="w-full text-left table-auto">
                      <thead className="text-indigo-300">
                        <tr>
                          <th className="p-2">Title</th>
                          <th className="p-2">Author</th>
                          <th className="p-2">Available</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {booksInCategory.map((book) => (
                          <tr key={book.id} className="border-t border-gray-700">
                            <td className="p-2">{book.title}</td>
                            <td className="p-2">{book.author}</td>
                            <td className="p-2">
                              {book.available}/{book.copies}
                            </td>
                            <td className="p-2 flex space-x-2">
                              <button
                                onClick={() => startEditing(book)}
                                className="text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteBook(book.id)}
                                className="text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => startBorrowing(book)}
                                disabled={book.available <= 0}
                                className={`${
                                  book.available > 0 
                                    ? "text-green-400 hover:underline" 
                                    : "text-gray-500 cursor-not-allowed"
                                }`}
                              >
                                Borrow
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'borrowed' && (
          <div className="bg-gray-800 p-6 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Currently Borrowed Books</h2>
            
            {borrowedBooks.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                No books are currently borrowed.
              </div>
            ) : (
              <table className="w-full text-left table-auto">
                <thead className="text-indigo-300">
                  <tr>
                    <th className="p-2">Book Title</th>
                    <th className="p-2">Student</th>
                    <th className="p-2">Borrow Date</th>
                    <th className="p-2">Due Date</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowedBooks.map((borrowed) => (
                    <tr key={borrowed.id} className="border-t border-gray-700">
                      <td className="p-2">{borrowed.book?.title || "Unknown Book"}</td>
                      <td className="p-2">{borrowed.student?.name || "Unknown Student"}</td>
                      <td className="p-2">{new Date(borrowed.borrowDate).toLocaleDateString()}</td>
                      <td className="p-2">{new Date(borrowed.dueDate).toLocaleDateString()}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          borrowed.status === 'active' 
                            ? 'bg-green-900 text-green-300' 
                            : borrowed.status === 'overdue'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {borrowed.status.charAt(0).toUpperCase() + borrowed.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-2">
                        {borrowed.status === 'active' && (
                          <button
                            onClick={() => handleReturn(borrowed.id, borrowed.bookId)}
                            className="text-yellow-400 hover:underline"
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Borrow Modal */}
    {showBorrowModal && borrowingBook && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Borrow Book: {borrowingBook.title}</h2>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Select Student:</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded"
            >
              <option value="">-- Select Student --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.studentId})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowBorrowModal(false);
                setBorrowingBook(null);
                setSelectedStudent("");
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleBorrow}
              disabled={!selectedStudent}
              className={`px-4 py-2 rounded ${
                selectedStudent 
                  ? "bg-green-600 text-white hover:bg-green-700" 
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
            >
              Confirm Borrow
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default BookManagement;
