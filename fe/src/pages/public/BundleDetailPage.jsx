import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import BundleDetail from '../../features/courses/components/BundleDetail.jsx';
import { bundlesApi } from '../../api';

export default function BundleDetailPage() {
  const { slug } = useParams();
  const [bundle, setBundle] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const data = await bundlesApi.getBySlug(slug);
        if (!alive) return;
        if (data && (data._id || data.slug)) {
          setBundle(data);
          setStatus('ready');
        } else {
          setStatus('notfound');
        }
      } catch (err) {
        if (!alive) return;
        // A 404 means the slug doesn't resolve to a published bundle, which is
        // a different thing to say than "something went wrong".
        setStatus(err && (err.status === 404 || err.statusCode === 404) ? 'notfound' : 'error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // Pinned to the green theme, matching the Courses listing page.
  return (
    <div className="page-scale">
      <PageLayout>
        <BundleDetail bundle={bundle} status={status} />
      </PageLayout>
    </div>
  );
}
