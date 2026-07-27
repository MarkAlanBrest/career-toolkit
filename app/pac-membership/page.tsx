import type { Metadata } from 'next';
import EmployerInfoPage from '../components/employer-info-page';

export const metadata: Metadata = {
  title: 'Program Advisory Committees | NCST Employer Portal',
  description: 'Learn how industry professionals can help guide NCST programs as Program Advisory Committee members.',
};

export default function PacMembershipPage() {
  return (
    <EmployerInfoPage
      pageLabel="Program Advisory Committees"
      title={<>Your experience can <em>shape what comes next.</em></>}
      summary="Bring an employer’s point of view into the classroom. PAC members help NCST keep technical programs connected to current tools, practices, expectations, and workforce needs."
      subject="NCST Employer Portal — PAC Membership Interest"
      primaryLabel="Ask about PAC membership"
      heroNote="Industry insight. Stronger programs. Career-ready graduates."
      highlights={['Share real-world perspective', 'Advise program leaders', 'Strengthen the local workforce']}
      sectionLabel="Make an impact"
      sectionTitle="A practical voice in technical education."
      sectionIntro="Program Advisory Committees create a direct connection between the people teaching skilled trades and the employers putting those skills to work."
      features={[
        {
          eyebrow: 'Advise',
          title: 'Share industry insight',
          body: 'Discuss changing tools, technology, safety practices, credentials, and the skills employers expect from new hires.',
          icon: 'insight',
        },
        {
          eyebrow: 'Review',
          title: 'Strengthen programs',
          body: 'Offer thoughtful feedback on program direction, facilities, equipment, and opportunities for continued improvement.',
          icon: 'message',
        },
        {
          eyebrow: 'Connect',
          title: 'Support student success',
          body: 'Help connect education to employment by sharing the realities, expectations, and opportunities of today’s workplace.',
          icon: 'people',
        },
      ]}
      detailLabel="Who should participate"
      detailTitle="Built for people who know the work."
      detailBody="PAC membership is a good fit for professionals who understand their field and want to help prepare the next generation. Career Services can help identify the NCST program that best matches your background."
      detailPoints={[
        'Employers, owners, managers, and hiring leaders',
        'Experienced tradespeople and technical specialists',
        'Industry association and community partners',
        'Graduates who can connect training with career experience',
      ]}
      stepsTitle="A simple way to get involved."
      steps={[
        { title: 'Introduce yourself', body: 'Tell Career Services about your organization, field, and areas of experience.' },
        { title: 'Find your committee', body: 'We’ll connect your background with the program where your insight can be most useful.' },
        { title: 'Join the conversation', body: 'Participate in an upcoming meeting and share practical, constructive feedback.' },
      ]}
      closingTitle="Bring your perspective to the table."
      closingBody="Contact Career Services to ask questions, discuss the right program, or express interest in an upcoming PAC meeting."
    />
  );
}
