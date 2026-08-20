import Header from './Header.jsx';
import Footer from './Footer.jsx';
import AnnouncementBanner from '../shared/AnnouncementBanner.jsx';

// Shared shell for every public page: CMS announcement banner, header on top,
// page content in <main>, footer at the bottom. `showToggle`/`audience` let a
// page hide the win/award toggle and pin the chrome to a fixed theme.
// `showContactBand` drops the footer's paper band — the head office card and
// the "Remain Connected" form — for a page that should not end on them.
export default function PageLayout({
  children,
  showToggle = true,
  audience,
  showContactBand = true,
}) {
  return (
    <div className="page-layout">
      {/* Banner and header pin to the top together, as one block — sticking them
          separately would let the header slide up over the banner. */}
      <div className="page-layout__chrome">
        <AnnouncementBanner />
        <Header showToggle={showToggle} audience={audience} />
      </div>
      <main className="page-layout__main">{children}</main>
      <Footer audience={audience} showContactBand={showContactBand} />
    </div>
  );
}
