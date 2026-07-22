import PageLayout from '../../components/layout/PageLayout.jsx';
import VideosHero from '../../features/videos/components/VideosHero.jsx';
import VideosBrowser from '../../features/videos/components/VideosBrowser.jsx';

export default function VideosPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <VideosHero />
      <VideosBrowser />
    </PageLayout>
  );
}
