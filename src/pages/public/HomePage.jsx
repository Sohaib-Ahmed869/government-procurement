import PageLayout from '../../components/layout/PageLayout.jsx';
import HomeHero from '../../features/home/components/HomeHero.jsx';
import UnlockPotential from '../../features/home/components/UnlockPotential.jsx';
import EnhanceExperience from '../../features/home/components/EnhanceExperience.jsx';
import { useAudience } from '../../context/AudienceContext.jsx';
import './HomePage.css';

export default function HomePage() {
  // Keying on the audience remounts each section when the toggle changes, so
  // the reveal animations replay.
  const { audience } = useAudience();

  return (
    <div className="home-scale">
      <PageLayout>
        <HomeHero key={`hero-${audience}`} />
        <UnlockPotential key={`unlock-${audience}`} />
        <EnhanceExperience key={`enhance-${audience}`} />
      </PageLayout>
    </div>
  );
}
