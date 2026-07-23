import PageLayout from '../../components/layout/PageLayout.jsx';
import ConsultationForm from '../../features/consultation/components/ConsultationForm.jsx';

export default function BookConsultationPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <ConsultationForm />
      </PageLayout>
    </div>
  );
}
