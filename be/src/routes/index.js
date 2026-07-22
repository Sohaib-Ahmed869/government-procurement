import { Router } from 'express';

// Public + admin API modules. Each module default-exports an express.Router.
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/users.routes.js';
import articleRoutes from '../modules/articles/articles.routes.js';
import categoryRoutes from '../modules/categories/categories.routes.js';
import videoRoutes from '../modules/videos/videos.routes.js';
import courseRoutes from '../modules/courses/courses.routes.js';
import questionRoutes from '../modules/questions/questions.routes.js';
import faqRoutes from '../modules/faqs/faqs.routes.js';
import pageRoutes from '../modules/pages/pages.routes.js';
import testimonialRoutes from '../modules/testimonials/testimonials.routes.js';
import announcementRoutes from '../modules/announcements/announcements.routes.js';
import homepageRailRoutes from '../modules/homepageRails/homepageRails.routes.js';
import subscriberRoutes from '../modules/subscribers/subscribers.routes.js';
import contactRoutes from '../modules/contact/contact.routes.js';
import consultationRoutes from '../modules/consultations/consultations.routes.js';
import registerInterestRoutes from '../modules/registerInterest/registerInterest.routes.js';
import linkRoutes from '../modules/links/links.routes.js';
import mediaRoutes from '../modules/media/media.routes.js';
import settingRoutes from '../modules/settings/settings.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import searchRoutes from '../modules/search/search.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/articles', articleRoutes);
router.use('/categories', categoryRoutes);
router.use('/videos', videoRoutes);
router.use('/courses', courseRoutes);
router.use('/questions', questionRoutes);
router.use('/faqs', faqRoutes);
router.use('/pages', pageRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/announcements', announcementRoutes);
router.use('/homepage-rails', homepageRailRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/contact', contactRoutes);
router.use('/consultations', consultationRoutes);
router.use('/register-interest', registerInterestRoutes);
router.use('/links', linkRoutes);
router.use('/media', mediaRoutes);
router.use('/settings', settingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/audit-log', auditRoutes);

export default router;
