import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from '../admin/layout/AdminLayout.jsx';

import LoginPage from '../admin/pages/LoginPage.jsx';
import DashboardPage from '../admin/pages/DashboardPage.jsx';
import ArticlesAdminPage from '../admin/pages/ArticlesAdminPage.jsx';
import ArticleEditorPage from '../admin/pages/ArticleEditorPage.jsx';
import CategoriesPage from '../admin/pages/CategoriesPage.jsx';
import TeamAdminPage from '../admin/pages/TeamAdminPage.jsx';
import CareersAdminPage from '../admin/pages/CareersAdminPage.jsx';
import RulesAdminPage from '../admin/pages/RulesAdminPage.jsx';
import PanelsAdminPage from '../admin/pages/PanelsAdminPage.jsx';
import PromptsAdminPage from '../admin/pages/PromptsAdminPage.jsx';
import TemplatesAdminPage from '../admin/pages/TemplatesAdminPage.jsx';
import BidWritersAdminPage from '../admin/pages/BidWritersAdminPage.jsx';
import HomeHeroPage from '../admin/pages/HomeHeroPage.jsx';
import ServiceOfferingAdminPage from '../admin/pages/ServiceOfferingAdminPage.jsx';
import AdvisorRulesPage from '../admin/pages/AdvisorRulesPage.jsx';
import TendersAdminPage from '../admin/pages/TendersAdminPage.jsx';
import CoursesAdminPage from '../admin/pages/CoursesAdminPage.jsx';
import ModerationQueuePage from '../admin/pages/ModerationQueuePage.jsx';
import SubscribersPage from '../admin/pages/SubscribersPage.jsx';
import ConsultationQueuePage from '../admin/pages/ConsultationQueuePage.jsx';
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
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="team" element={<TeamAdminPage />} />
          <Route path="careers" element={<CareersAdminPage />} />
          <Route path="rules" element={<RulesAdminPage />} />
          {/* B2 — panels and prequalification schemes. */}
          <Route path="panels" element={<PanelsAdminPage />} />
          {/* B4 — the AI Prompt Library. */}
          <Route path="prompts" element={<PromptsAdminPage />} />
          {/* B6 — the Templates library. */}
          <Route path="templates" element={<TemplatesAdminPage />} />
          {/* B7 — not flag-gated: placements are prepared before go-live. */}
          <Route path="bid-writers" element={<BidWritersAdminPage />} />
          <Route path="home-hero" element={<HomeHeroPage />} />
          <Route path="service-offering" element={<ServiceOfferingAdminPage />} />
          <Route path="advisory-rules" element={<AdvisorRulesPage />} />
          {/* A5: the CMS entry is "Service Offering" now. The old path is kept
              so an editor's bookmark still lands somewhere. */}
          <Route path="capabilities" element={<Navigate to="/admin/service-offering" replace />} />
          <Route path="tenders" element={<TendersAdminPage />} />

          {/* Community */}
          <Route path="moderation" element={<ModerationQueuePage />} />

          {/* Submissions */}
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="consultations" element={<ConsultationQueuePage />} />

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
