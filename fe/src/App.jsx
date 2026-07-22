import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/public/HomePage.jsx';
import AdvisoryServicesPage from './pages/public/AdvisoryServicesPage.jsx';
import TenderPortalsPage from './pages/public/TenderPortalsPage.jsx';
import ExpertisePage from './pages/public/ExpertisePage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
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
import SearchResultsPage from './pages/public/SearchResultsPage.jsx';
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

function PublicSite() {
  return (
    <AudienceProvider>
      <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/advisory" element={<AdvisoryServicesPage />} />
          <Route path="/tender-portals" element={<TenderPortalsPage />} />
          <Route path="/our-expertise" element={<ExpertisePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          {/* Navbar "Resources" points here; it shows the Insights listing. */}
          <Route path="/resources" element={<InsightsPage />} />
          <Route path="/insights/:slug" element={<ArticleDetailPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/book-a-consultation" element={<BookConsultationPage />} />

          {/* Forum */}
          <Route path="/forum" element={<ForumHomePage />} />
          <Route path="/forum/articles" element={<ForumArticlePage />} />
          <Route path="/forum/categories" element={<ForumCategoriesPage />} />
          <Route path="/forum/submit" element={<ForumSubmitPage />} />
          <Route path="/forum/answers/:id" element={<ForumAnswerPage />} />

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
