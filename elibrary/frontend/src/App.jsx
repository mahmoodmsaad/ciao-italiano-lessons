import { Link, Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

import Catalog from './pages/student/Catalog.jsx';
import BookDetail from './pages/student/BookDetail.jsx';
import MyBooks from './pages/student/MyBooks.jsx';
import Profile from './pages/student/Profile.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import ManageBooks from './pages/admin/ManageBooks.jsx';
import ManageStudents from './pages/admin/ManageStudents.jsx';
import IssueReturn from './pages/admin/IssueReturn.jsx';
import Reports from './pages/admin/Reports.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Student + admin dono ye pages dekh sakte hain */}
        <Route index element={<Catalog />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="my-books" element={<MyBooks />} />
        <Route path="profile" element={<Profile />} />

        {/* Sirf admin */}
        <Route path="admin" element={<AdminOnly><Dashboard /></AdminOnly>} />
        <Route path="admin/books" element={<AdminOnly><ManageBooks /></AdminOnly>} />
        <Route path="admin/issues" element={<AdminOnly><IssueReturn /></AdminOnly>} />
        <Route path="admin/students" element={<AdminOnly><ManageStudents /></AdminOnly>} />
        <Route path="admin/reports" element={<AdminOnly><Reports /></AdminOnly>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const AdminOnly = ({ children }) => <ProtectedRoute role="admin">{children}</ProtectedRoute>;

function NotFound() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl">🔍</span>
      <h1 className="text-2xl font-bold text-slate-900">Page nahi mila</h1>
      <p className="text-slate-600">Jo page aap dhoond rahe hain wo mojood nahi hai.</p>
      <Link to={user?.role === 'admin' ? '/admin' : '/'} className="btn-primary">
        Wapas home par
      </Link>
    </div>
  );
}
