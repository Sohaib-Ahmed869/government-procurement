import Header from './Header.jsx';
import Footer from './Footer.jsx';

// Shared shell for every public page: header on top, page content in <main>,
// footer at the bottom. `showToggle`/`audience` let a page hide the win/award
// toggle and pin the chrome to a fixed theme (e.g. the Expertise page).
export default function PageLayout({ children, showToggle = true, audience }) {
  return (
    <div className="page-layout">
      <Header showToggle={showToggle} audience={audience} />
      <main className="page-layout__main">{children}</main>
      <Footer audience={audience} />
    </div>
  );
}
