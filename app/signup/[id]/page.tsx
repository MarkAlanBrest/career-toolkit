import { Redis } from '@upstash/redis';
import SignupForm from './SignupForm';

const redis = Redis.fromEnv();

type ClassConfig = {
  id: string;
  teacherName: string;
  className: string;
  term: string;
};

export default async function SignupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await redis.get<string>(`class-config:${id}`);
  const config: ClassConfig | null = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', background: '#0770B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "Lato, sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#fff', padding: 32 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ margin: '12px 0 8px', fontSize: 20 }}>Signup link not found.</h2>
          <p style={{ opacity: 0.8, fontSize: 14 }}>Ask your teacher for the correct link.</p>
        </div>
      </div>
    );
  }

  return <SignupForm config={config} configId={id} />;
}
