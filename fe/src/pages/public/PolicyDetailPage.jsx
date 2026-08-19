import PageLayout from '../../components/layout/PageLayout.jsx';
import PolicyDocument from '../../features/policies/components/PolicyDocument.jsx';

// B5.3 one policy at /policies/:slug. The document carries its own heading, so
// there is no hero band here: a policy should open on its title and its
// contents, not on a screenful of chrome above them.
export default function PolicyDetailPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <PolicyDocument />
      </PageLayout>
    </div>
  );
}
