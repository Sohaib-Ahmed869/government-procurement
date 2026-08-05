import { Router } from 'express';

// Public + admin API modules. Each module default-exports an express.Router.
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/users.routes.js';
import articleRoutes from '../modules/articles/articles.routes.js';
import categoryRoutes from '../modules/categories/categories.routes.js';
import courseRoutes from '../modules/courses/courses.routes.js';
import questionRoutes from '../modules/questions/questions.routes.js';
import pageRoutes from '../modules/pages/pages.routes.js';
import teamRoutes from '../modules/team/team.routes.js';
import careerRoutes from '../modules/careers/careers.routes.js';
import ruleRoutes from '../modules/rules/rules.routes.js';
import homeHeroRoutes from '../modules/homeHero/homeHero.routes.js';
import pageHeroRoutes from '../modules/pageHeroes/pageHeroes.routes.js';
import announcementRoutes from '../modules/announcements/announcements.routes.js';
import homepageRailRoutes from '../modules/homepageRails/homepageRails.routes.js';
import subscriberRoutes from '../modules/subscribers/subscribers.routes.js';
import consultationRoutes from '../modules/consultations/consultations.routes.js';
import registerInterestRoutes from '../modules/registerInterest/registerInterest.routes.js';
import linkRoutes from '../modules/links/links.routes.js';
import tenderSiteRoutes from '../modules/tenderSites/tenderSites.routes.js';
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
router.use('/courses', courseRoutes);
router.use('/questions', questionRoutes);
router.use('/pages', pageRoutes);
router.use('/team', teamRoutes);
router.use('/careers', careerRoutes);
router.use('/rules', ruleRoutes);
router.use('/home-hero', homeHeroRoutes);
router.use('/page-heroes', pageHeroRoutes);
router.use('/announcements', announcementRoutes);
router.use('/homepage-rails', homepageRailRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/consultations', consultationRoutes);
router.use('/register-interest', registerInterestRoutes);
router.use('/links', linkRoutes);
router.use('/tender-sites', tenderSiteRoutes);
router.use('/media', mediaRoutes);
router.use('/settings', settingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/audit-log', auditRoutes);

export default router;
