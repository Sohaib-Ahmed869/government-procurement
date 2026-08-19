import PageLayout from '../../components/layout/PageLayout.jsx';
import PolicyHero from '../../features/policies/components/PolicyHero.jsx';
import PolicyIndex from '../../features/policies/components/PolicyIndex.jsx';

// B5.2 the policy index at /policies.
export default function PoliciesPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <PolicyHero
          title="Policies"
          intro="How we handle your information, the terms of using this site, and the standards we hold ourselves to."
        />
        <PolicyIndex />
      </PageLayout>
    </div>
  );
}
