import { Router } from 'express';

// Public + admin API modules. Each module default-exports an express.Router.
import authRoutes from '../modules/auth/auth.routes.js';
import accountRoutes from '../modules/accounts/accounts.routes.js';
import lmsRoutes from '../modules/lms/lms.routes.js';
import userRoutes from '../modules/users/users.routes.js';
import articleRoutes from '../modules/articles/articles.routes.js';
import categoryRoutes from '../modules/categories/categories.routes.js';
import courseRoutes from '../modules/courses/courses.routes.js';
import bundleRoutes from '../modules/bundles/bundles.routes.js';
import questionRoutes from '../modules/questions/questions.routes.js';
import pageRoutes from '../modules/pages/pages.routes.js';
import teamRoutes from '../modules/team/team.routes.js';
import careerRoutes from '../modules/careers/careers.routes.js';
import ruleRoutes from '../modules/rules/rules.routes.js';
import panelRoutes from '../modules/panels/panels.routes.js';
import engageServiceRoutes from '../modules/engageServices/engageServices.routes.js';
import promptRoutes from '../modules/prompts/prompts.routes.js';
import templateRoutes from '../modules/templates/templates.routes.js';
import bidWriterRoutes from '../modules/bidWriters/bidWriters.routes.js';
import homeHeroRoutes from '../modules/homeHero/homeHero.routes.js';
import capabilitiesHeroRoutes from '../modules/capabilitiesHero/capabilitiesHero.routes.js';
import capabilityRoutes from '../modules/capabilities/capabilities.routes.js';
import rulePackRoutes from '../modules/rulePacks/rulePacks.routes.js';
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
// LMS self-service accounts (student + instructor signup). Kept apart from
// /auth/register, which is admin-only staff provisioning.
router.use('/accounts', accountRoutes);
// LMS: authoring, learning, assessment, certificates and the review queue.
router.use('/lms', lmsRoutes);
router.use('/users', userRoutes);
router.use('/articles', articleRoutes);
router.use('/categories', categoryRoutes);
router.use('/courses', courseRoutes);
// Course bundles: several published courses sold together for less.
router.use('/bundles', bundleRoutes);
router.use('/questions', questionRoutes);
router.use('/pages', pageRoutes);
router.use('/team', teamRoutes);
router.use('/careers', careerRoutes);
router.use('/rules', ruleRoutes);
// B2 — government panels and prequalification schemes, by jurisdiction. This
// is the AWARD side of How to Engage Us; the WIN side is its own list below,
// rather than the Service Offering cards it used to borrow.
router.use('/panels', panelRoutes);
router.use('/engage-services', engageServiceRoutes);
// B4 — the AI Prompt Library: master prompts by topic, use case and tool.
router.use('/prompts', promptRoutes);
// B6 — the Templates library: sourced, licence-checked, downloadable documents.
router.use('/templates', templateRoutes);
// B7 — Find a Bid Writer. Public reads are held behind FEATURE_BID_WRITERS.
router.use('/bid-writers', bidWriterRoutes);
router.use('/home-hero', homeHeroRoutes);
router.use('/capabilities-hero', capabilitiesHeroRoutes);
router.use('/capabilities', capabilityRoutes);
// A6 — versioned rule overlays for the Procurement Advisor.
router.use('/rule-packs', rulePackRoutes);
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
