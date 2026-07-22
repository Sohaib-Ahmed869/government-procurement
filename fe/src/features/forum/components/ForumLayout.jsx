import wave from '../../../assets/images/WaveAdvisoryPage.png';
import phoneWave from '../../../assets/images/ForumPhoneWave.png';
import './ForumLayout.css';

// Green page shell shared by every forum page: it owns the background and the
// top-right corner wave so the wave sits in the page corner exactly like the
// Contact page (rather than being clipped inside the short hero).
export default function ForumLayout({ children }) {
  return (
    <div className="forum-page">
      {/* Phones get a wave drawn for the narrow corner; wider screens keep the
          shared advisory/contact wave. CSS swaps which one is visible. */}
      <img className="forum-page__wave" src={wave} alt="" aria-hidden="true" />
      <img
        className="forum-page__wave forum-page__wave--phone"
        src={phoneWave}
        alt=""
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
