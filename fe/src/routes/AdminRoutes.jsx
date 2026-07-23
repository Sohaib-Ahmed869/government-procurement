import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from '../admin/layout/AdminLayout.jsx';

import LoginPage from '../admin/pages/LoginPage.jsx';
import DashboardPage from '../admin/pages/DashboardPage.jsx';
import ArticlesAdminPage from '../admin/pages/ArticlesAdminPage.jsx';
import ArticleEditorPage from '../admin/pages/ArticleEditorPage.jsx';
import CategoriesPage from '../admin/pages/CategoriesPage.jsx';
import CoursesAdminPage from '../admin/pages/CoursesAdminPage.jsx';
import CourseEditorPage from '../admin/pages/CourseEditorPage.jsx';
import FaqAdminPage from '../admin/pages/FaqAdminPage.jsx';
import TestimonialsPage from '../admin/pages/TestimonialsPage.jsx';
import ModerationQueuePage from '../admin/pages/ModerationQueuePage.jsx';
import SubscribersPage from '../admin/pages/SubscribersPage.jsx';
import ContactInboxPage from '../admin/pages/ContactInboxPage.jsx';
import ConsultationQueuePage from '../admin/pages/ConsultationQueuePage.jsx';
import RegisterInterestPage from '../admin/pages/RegisterInterestPage.jsx';
import AnnouncementPage from '../admin/pages/AnnouncementPage.jsx';
import LinksManagerPage from '../admin/pages/LinksManagerPage.jsx';
import MediaLibraryPage from '../admin/pages/MediaLibraryPage.jsx';
import UsersRolesPage from '../admin/pages/UsersRolesPage.jsx';
import SettingsPage from '../admin/pages/SettingsPage.jsx';
import AuditLogPage from '../admin/pages/AuditLogPage.jsx';

const SUPER = ['superadmin'];

// The admin sub-application, mounted at /admin/* by App.jsx. AuthProvider is
// scoped here so the public site never carries admin auth state.
export default function AdminRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />

          {/* Content */}
          <Route path="articles" element={<ArticlesAdminPage />} />
          <Route path="articles/new" element={<ArticleEditorPage />} />
          <Route path="articles/:id" element={<ArticleEditorPage />} />
          <Route path="courses" element={<CoursesAdminPage />} />
          <Route path="courses/new" element={<CourseEditorPage />} />
          <Route path="courses/:id" element={<CourseEditorPage />} />
          <Route path="faqs" element={<FaqAdminPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="categories" element={<CategoriesPage />} />

          {/* Community */}
          <Route path="moderation" element={<ModerationQueuePage />} />

          {/* Submissions */}
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="contact" element={<ContactInboxPage />} />
          <Route path="consultations" element={<ConsultationQueuePage />} />
          <Route path="register-interest" element={<RegisterInterestPage />} />

          {/* Site */}
          <Route path="announcements" element={<AnnouncementPage />} />
          <Route path="links" element={<LinksManagerPage />} />
          <Route path="media" element={<MediaLibraryPage />} />

          {/* Admin-only */}
          <Route
            path="users"
            element={<ProtectedRoute roles={SUPER}><UsersRolesPage /></ProtectedRoute>}
          />
          <Route
            path="settings"
            element={<ProtectedRoute roles={SUPER}><SettingsPage /></ProtectedRoute>}
          />
          <Route
            path="audit-log"
            element={<ProtectedRoute roles={SUPER}><AuditLogPage /></ProtectedRoute>}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
