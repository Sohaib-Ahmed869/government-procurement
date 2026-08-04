// Seeds the tender portals listed on the Tender Websites page.
//
// Upserts by name, so running it twice won't create duplicates and won't touch
// a portal added through the CMS:
//   npm run seed:tenders
import { connectDB, disconnectDB } from '../config/db.js';
import { TenderSite } from '../models/TenderSite.js';

// `logo` is deliberately absent from these entries. The logos have to be
// uploaded through the CMS (Tenders → edit → Logo), and leaving the key out
// means the Object.assign below can't wipe one that has since been added.
//
// `upcomingTendersUrl` is likewise omitted where the portal publishes no
// forecast list — the page simply doesn't render that button.
const TENDER_SITES = [
  {
    name: 'QBuild (Construction Only)',
    subtitle: 'Queensland State Government',
    openTendersUrl: 'https://etender.hpw.qld.gov.au/public/TendersListingCurrent.aspx',
    createAccountUrl: 'https://etender.hpw.qld.gov.au/public/CompanyRegistration.aspx',
    order: 10,
  },
  {
    name: 'QTenders (Non-Construction)',
    subtitle: 'Queensland State Government',
    openTendersUrl: 'https://qtenders.hpw.qld.gov.au/search?keywords=',
    upcomingTendersUrl: 'https://qtenders.hpw.qld.gov.au/fpp/',
    createAccountUrl: 'https://www.supply.qld.gov.au/',
    order: 20,
  },
  {
    name: 'Tasmanian Government Tenders',
    subtitle: 'Tasmanian State Government',
    openTendersUrl: 'https://www.tenders.tas.gov.au/OpenForBids/List/Public/ClosingDate',
    upcomingTendersUrl: 'https://www.tenders.tas.gov.au/FutureOpportunity/List/Public/Agency',
    createAccountUrl: 'https://www.tenders.tas.gov.au/Account/register',
    order: 30,
  },
];

async function run() {
  await connectDB();

  for (const site of TENDER_SITES) {
    const existing = await TenderSite.findOne({ name: site.name });
    if (existing) {
      Object.assign(existing, site);
      await existing.save();
      console.log(`[seed-tenders] updated "${existing.name}"`);
    } else {
      await TenderSite.create({ ...site, active: true });
      console.log(`[seed-tenders] created "${site.name}"`);
    }
  }

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-tenders] failed:', err);
  process.exit(1);
});
