import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/public/HomePage.jsx';
import ServiceOfferingPage from './pages/public/ServiceOfferingPage.jsx';
import ProcurementAdvisorPage from './pages/public/ProcurementAdvisorPage.jsx';
import TenderPortalsPage from './pages/public/TenderPortalsPage.jsx';
import ExpertisePage from './pages/public/ExpertisePage.jsx';
import TeamPage from './pages/public/TeamPage.jsx';
import TeamMemberPage from './pages/public/TeamMemberPage.jsx';
import CareersPage from './pages/public/CareersPage.jsx';
import JurisdictionalLinksPage from './pages/public/JurisdictionalLinksPage.jsx';
import GovernmentPanelsPage from './pages/public/GovernmentPanelsPage.jsx';
import PromptLibraryPage from './pages/public/PromptLibraryPage.jsx';
import TemplatesPage from './pages/public/TemplatesPage.jsx';
import FindBidWriterPage from './pages/public/FindBidWriterPage.jsx';
import BookConsultationPage from './pages/public/BookConsultationPage.jsx';
import ForumHomePage from './pages/public/ForumHomePage.jsx';
import ForumArticlePage from './pages/public/ForumArticlePage.jsx';
import ForumCategoriesPage from './pages/public/ForumCategoriesPage.jsx';
import ForumSubmitPage from './pages/public/ForumSubmitPage.jsx';
import ForumAnswerPage from './pages/public/ForumAnswerPage.jsx';
import CoursesPage from './pages/public/CoursesPage.jsx';
import BundleDetailPage from './pages/public/BundleDetailPage.jsx';
import VerifyCertificatePage from './pages/public/VerifyCertificatePage.jsx';
import PromptDetailPage from './pages/public/PromptDetailPage.jsx';
import CourseDetailPage from './pages/public/CourseDetailPage.jsx';
import InsightsPage from './pages/public/InsightsPage.jsx';
import ArticleDetailPage from './pages/public/ArticleDetailPage.jsx';
import PolicyDetailPage from './pages/public/PolicyDetailPage.jsx';
// System / utility pages
import ContactSentPage from './pages/system/ContactSentPage.jsx';
import InterestRegisteredPage from './pages/system/InterestRegisteredPage.jsx';
import QuestionSubmittedPage from './pages/system/QuestionSubmittedPage.jsx';
import SubscribeConfirmationPage from './pages/system/SubscribeConfirmationPage.jsx';
import UnsubscribePage from './pages/system/UnsubscribePage.jsx';
import ServerErrorPage from './pages/system/ServerErrorPage.jsx';
import NotFoundPage from './pages/system/NotFoundPage.jsx';
import AdminRoutes from './routes/AdminRoutes.jsx';
import LmsRoutes from './routes/LmsRoutes.jsx';
import ScrollToTop from './components/shared/ScrollToTop.jsx';
import SiteLoader from './components/shared/SiteLoader.jsx';
import { AudienceProvider } from './context/AudienceContext.jsx';
import { bidWritersEnabled } from './config/features.js';

export default function App() {
  return (
    <BrowserRouter>
      {/* A2 — the first-load intro. Outside <Routes> so it covers whichever
          area the visitor lands in, and outside AudienceProvider because it
          reads the segment off <html> (stamped in main.jsx) rather than from
          context — the admin and the LMS have no provider of their own. */}
      <SiteLoader />
      <ScrollToTop />
      <Routes>
        {/* Admin CMS — its own auth + layout, outside the public chrome. */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        {/* Student LMS — likewise its own session + shell. */}
        <Route path="/learn/*" element={<LmsRoutes />} />
        {/* Everything else is the public site. */}
        <Route path="/*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  );
}

// Keeps a renamed page's old URL working: swaps the first path segment for
// `base` and carries the rest across, along with the query string and hash. So
// /forum/answers/7 → /q-and-a/answers/7, and the footer's ?audience= variants
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
          {/* A5: the page is "Service Offering" now, not "Capabilities". The
              old path is kept below as a redirect so nothing already linked to
              /capabilities breaks. */}
          <Route path="/service-offering" element={<ServiceOfferingPage />} />
          {/* A6: the Procurement Advisor. /advisory used to redirect to the
              Capabilities page; it is a page in its own right now. */}
          <Route path="/advisory" element={<ProcurementAdvisorPage />} />
          <Route path="/advisory/:jurisdiction" element={<ProcurementAdvisorPage />} />
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
          {/* B2 — panels and prequalification schemes by jurisdiction. */}
          <Route path="/government-panels" element={<GovernmentPanelsPage />} />
          {/* B4 — master prompts by topic, use case and tool. */}
          <Route path="/prompt-library" element={<PromptLibraryPage />} />
          {/* One prompt, full page. It was a dialog over the library; a prompt
              is a document somebody links, bookmarks and comes back to, and a
              modal has no address. */}
          <Route path="/prompt-library/:id" element={<PromptDetailPage />} />
          {/* B6 — sourced, licence-checked downloadable documents. */}
          <Route path="/templates" element={<TemplatesPage />} />
          {/* B7.8 — held from production. The route is not registered at all
              when the flag is off, so /find-a-bid-writer falls through to the
              404 catch-all: there is no page to find, not an empty one. */}
          {bidWritersEnabled && (
            <Route path="/find-a-bid-writer" element={<FindBidWriterPage />} />
          )}
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          {/* Bundles are their own resource, not a course with a flag, so they
              get their own path rather than sharing /courses/:id. */}
          <Route path="/bundles/:slug" element={<BundleDetailPage />} />
          {/* Certificate verification (LMS 12.0b). Public and outside /learn on
              purpose: whoever opens this is an employer with a credential ID,
              not a learner, and will not make an account to check one. The
              bare path takes an ID typed off the printed certificate. */}
          <Route path="/verify" element={<VerifyCertificatePage />} />
          <Route path="/verify/:credentialId" element={<VerifyCertificatePage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/insights/:slug" element={<ArticleDetailPage />} />
          <Route path="/book-a-consultation" element={<BookConsultationPage />} />

          {/* Q&A */}
          <Route path="/q-and-a" element={<ForumHomePage />} />
          <Route path="/q-and-a/articles" element={<ForumArticlePage />} />
          <Route path="/q-and-a/categories" element={<ForumCategoriesPage />} />
          <Route path="/q-and-a/submit" element={<ForumSubmitPage />} />
          <Route path="/q-and-a/answers/:id" element={<ForumAnswerPage />} />

          {/* Renamed pages — the old URLs still resolve, so existing links,
              bookmarks and anything already indexed keep working. */}
          <Route path="/capabilities" element={<RenamedPath base="/service-offering" />} />
          <Route path="/capabilities/*" element={<RenamedPath base="/service-offering" />} />
          <Route path="/resources" element={<RenamedPath base="/insights" />} />
          <Route path="/forum" element={<RenamedPath base="/q-and-a" />} />
          <Route path="/forum/*" element={<RenamedPath base="/q-and-a" />} />
          <Route path="/qna" element={<RenamedPath base="/q-and-a" />} />
          <Route path="/qna/*" element={<RenamedPath base="/q-and-a" />} />

          {/* B5 — the policy documents themselves. The index that listed them
              has gone; each policy is still its own page, reached from the
              footer, because Privacy and Terms are linked from contracts and
              app store listings and have to keep resolving. */}
          <Route path="/policies/:slug" element={<PolicyDetailPage />} />

          {/* The old one-off policy URLs, kept as redirects for the same
              reason. */}
          <Route path="/privacy" element={<Navigate to="/policies/privacy" replace />} />
          <Route path="/cookies" element={<Navigate to="/policies/cookies" replace />} />
          <Route path="/terms" element={<Navigate to="/policies/terms" replace />} />
          <Route
            path="/conflicts-of-interest"
            element={<Navigate to="/policies/conflicts-of-interest" replace />}
          />

          {/* System / utility */}
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
