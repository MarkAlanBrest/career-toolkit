const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function parse(raw) {
  if (raw == null) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

async function main() {
  const idsRaw = await redis.get('dc:schools');
  const ids = parse(idsRaw) || [];
  console.log('School IDs:', ids);

  for (const id of ids) {
    const school = parse(await redis.get(`dc:school:${id}`));
    const teachers = parse(await redis.get(`dc:school:${id}:teachers`)) || [];
    const docs = parse(await redis.get(`dc:school:${id}:documents`)) || [];
    const types = parse(await redis.get(`dc:school:${id}:types`));
    const settings = parse(await redis.get(`dc:school:${id}:settings`));

    console.log('\n=== School', id, '===');
    console.log('Name:', school && school.name, '| Admin:', school && school.adminEmail);
    console.log('Teachers:', teachers.map(t => t));
    console.log('Reference Docs:', docs.map(d => ({ id: d.id, name: d.name, filename: d.filename, chars: d.chars })));
    console.log('Doc Types set?:', !!types, types ? types.map(t => t.id) : 'using defaults');
    console.log('Settings keys:', settings ? Object.keys(settings) : null);
    if (settings && settings.syllabus) {
      console.log('Existing syllabus settings:', JSON.stringify(settings.syllabus, null, 2));
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
