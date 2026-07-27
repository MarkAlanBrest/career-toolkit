import type { Metadata } from 'next';
import EmployerInfoPage from '../components/employer-info-page';

export const metadata: Metadata = {
  title: 'Hire NCST Talent | NCST Employer Portal',
  description: 'Explore ways to connect with NCST students and graduates for skilled career opportunities.',
};

export default function HireNcstPage() {
  return (
    <EmployerInfoPage
      pageLabel="Employer Recruiting"
      title={<>Build a stronger <em>talent pipeline.</em></>}
      summary="Connect your organization with NCST students and graduates preparing for skilled careers. Career Services can help you share opportunities, meet candidates, and build a lasting campus recruiting presence."
      subject="NCST Employer Portal — Recruiting and Hiring Interest"
      primaryLabel="Connect with Career Services"
      heroNote="More ways to meet the skilled talent your team needs."
      highlights={['Share open positions', 'Meet students and graduates', 'Plan campus recruiting']}
      sectionLabel="Recruit with NCST"
      sectionTitle="Meet talent in the way that works for you."
      sectionIntro="Whether you have one immediate opening or want to build long-term awareness, Career Services can help create the right connection."
      features={[
        {
          eyebrow: 'Post',
          title: 'Share job opportunities',
          body: 'Send current openings to Career Services so relevant opportunities can be shared with students and graduates.',
          icon: 'briefcase',
        },
        {
          eyebrow: 'Meet',
          title: 'Recruit on campus',
          body: 'Plan a visit to speak with students, introduce your organization, discuss careers, or coordinate interviews.',
          icon: 'visit',
        },
        {
          eyebrow: 'Connect',
          title: 'Request applicants',
          body: 'Tell us what your team needs and ask Career Services about connecting with qualified students or graduates.',
          icon: 'path',
        },
      ]}
      detailLabel="A flexible partnership"
      detailTitle="Start with today’s opening. Build for tomorrow."
      detailBody="NCST employer relationships can grow with your workforce needs. Begin by sharing a position, attending an event, or visiting campus—and continue the conversation as your hiring plans evolve."
      detailPoints={[
        'A direct point of contact through Career Services',
        'Opportunities to introduce your company and career paths',
        'Connections with students and graduates across skilled programs',
        'Ways to share feedback about changing workforce needs',
      ]}
      stepsTitle="Tell us what your team needs."
      steps={[
        { title: 'Share your goals', body: 'Describe the positions, skills, experience level, and timeline you are recruiting for.' },
        { title: 'Choose a connection', body: 'Career Services can help identify the most useful posting, visit, event, or outreach option.' },
        { title: 'Keep in touch', body: 'Let us know about interviews and hires so we can support a stronger long-term partnership.' },
      ]}
      closingTitle="Your next great hire may be at NCST."
      closingBody="Contact Career Services to share an opening, request applicants, schedule a recruiting visit, or start planning ahead."
    />
  );
}
