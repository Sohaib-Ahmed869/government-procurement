import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/public/HomePage.jsx';
import AdvisoryServicesPage from './pages/public/AdvisoryServicesPage.jsx';
import TenderPortalsPage from './pages/public/TenderPortalsPage.jsx';
import ExpertisePage from './pages/public/ExpertisePage.jsx';
import ContactPage from './pages/public/ContactPage.jsx';
import ForumHomePage from './pages/public/ForumHomePage.jsx';
import ForumArticlePage from './pages/public/ForumArticlePage.jsx';
import ForumCategoriesPage from './pages/public/ForumCategoriesPage.jsx';
import ForumSubmitPage from './pages/public/ForumSubmitPage.jsx';
import CoursesPage from './pages/public/CoursesPage.jsx';
import CourseDetailPage from './pages/public/CourseDetailPage.jsx';
import InsightsPage from './pages/public/InsightsPage.jsx';
import { AudienceProvider } from './context/AudienceContext.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AudienceProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/advisory" element={<AdvisoryServicesPage />} />
          <Route path="/tender-portals" element={<TenderPortalsPage />} />
          <Route path="/our-expertise" element={<ExpertisePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/forum" element={<ForumHomePage />} />
          <Route path="/forum/articles" element={<ForumArticlePage />} />
          <Route path="/forum/categories" element={<ForumCategoriesPage />} />
          <Route path="/forum/submit" element={<ForumSubmitPage />} />
        </Routes>
      </AudienceProvider>
    </BrowserRouter>
  );
}
