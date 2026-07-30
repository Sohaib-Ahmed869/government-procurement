import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/public/HomePage.jsx';
import AdvisoryServicesPage from './pages/public/AdvisoryServicesPage.jsx';
import TenderPortalsPage from './pages/public/TenderPortalsPage.jsx';
import ExpertisePage from './pages/public/ExpertisePage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
import TeamPage from './pages/public/TeamPage.jsx';
import TeamMemberPage from './pages/public/TeamMemberPage.jsx';
import CareersPage from './pages/public/CareersPage.jsx';
import JurisdictionalLinksPage from './pages/public/JurisdictionalLinksPage.jsx';
import ContactPage from './pages/public/ContactPage.jsx';
import BookConsultationPage from './pages/public/BookConsultationPage.jsx';
import ForumHomePage from './pages/public/ForumHomePage.jsx';
import ForumArticlePage from './pages/public/ForumArticlePage.jsx';
import ForumCategoriesPage from './pages/public/ForumCategoriesPage.jsx';
import ForumSubmitPage from './pages/public/ForumSubmitPage.jsx';
import ForumAnswerPage from './pages/public/ForumAnswerPage.jsx';
import CoursesPage from './pages/public/CoursesPage.jsx';
import CourseDetailPage from './pages/public/CourseDetailPage.jsx';
import InsightsPage from './pages/public/InsightsPage.jsx';
import ArticleDetailPage from './pages/public/ArticleDetailPage.jsx';
import FaqPage from './pages/public/FaqPage.jsx';
// System / utility pages
import PrivacyPolicyPage from './pages/system/PrivacyPolicyPage.jsx';
import TermsPage from './pages/system/TermsPage.jsx';
import ContactSentPage from './pages/system/ContactSentPage.jsx';
import InterestRegisteredPage from './pages/system/InterestRegisteredPage.jsx';
import QuestionSubmittedPage from './pages/system/QuestionSubmittedPage.jsx';
import SubscribeConfirmationPage from './pages/system/SubscribeConfirmationPage.jsx';
import UnsubscribePage from './pages/system/UnsubscribePage.jsx';
import ServerErrorPage from './pages/system/ServerErrorPage.jsx';
import NotFoundPage from './pages/system/NotFoundPage.jsx';
import AdminRoutes from './routes/AdminRoutes.jsx';
import ScrollToTop from './components/shared/ScrollToTop.jsx';
import { AudienceProvider } from './context/AudienceContext.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Admin CMS — its own auth + layout, outside the public chrome. */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        {/* Everything else is the public site. */}
        <Route path="/*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  );
}

// Keeps a renamed page's old URL working: swaps the first path segment for
// `base` and carries the rest across, along with the query string and hash. So
// /forum/answers/7 → /qna/answers/7, and the footer's ?audience= variants
// survive too. `replace` keeps the dead URL out of the back button.
function RenamedPath({ base }) {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/[^/]+/, '');
  return <Navigate to={`${base}${rest}${search}${hash}`} replace />;
}

function PublicSite() {
  return (
    <AudienceProvider>
      <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/capabilities" element={<AdvisoryServicesPage />} />
          {/* Tender portals: one page, two lists driven by the URL. */}
          <Route path="/tender-portals" element={<TenderPortalsPage />} />
          <Route path="/aus-list" element={<TenderPortalsPage />} />
          <Route path="/featured-list" element={<TenderPortalsPage />} />
          <Route path="/our-expertise" element={<ExpertisePage />} />
          {/* Our Team: listing plus a page per person. */}
          <Route path="/our-team" element={<TeamPage />} />
          <Route path="/our-team/:slug" element={<TeamMemberPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/jurisdictional-links" element={<JurisdictionalLinksPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/insights/:slug" element={<ArticleDetailPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/book-a-consultation" element={<BookConsultationPage />} />

          {/* QnA */}
          <Route path="/qna" element={<ForumHomePage />} />
          <Route path="/qna/articles" element={<ForumArticlePage />} />
          <Route path="/qna/categories" element={<ForumCategoriesPage />} />
          <Route path="/qna/submit" element={<ForumSubmitPage />} />
          <Route path="/qna/answers/:id" element={<ForumAnswerPage />} />

          {/* Renamed pages — the old URLs still resolve, so existing links,
              bookmarks and anything already indexed keep working. */}
          <Route path="/advisory" element={<RenamedPath base="/capabilities" />} />
          <Route path="/resources" element={<RenamedPath base="/insights" />} />
          <Route path="/forum" element={<RenamedPath base="/qna" />} />
          <Route path="/forum/*" element={<RenamedPath base="/qna" />} />

          {/* System / utility */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact-sent" element={<ContactSentPage />} />
          <Route path="/interest-registered" element={<InterestRegisteredPage />} />
          <Route path="/question-submitted" element={<QuestionSubmittedPage />} />
          <Route path="/subscribe/confirm" element={<SubscribeConfirmationPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/500" element={<ServerErrorPage />} />

          {/* 404 catch-all — must stay last */}
          <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AudienceProvider>
  );
}
