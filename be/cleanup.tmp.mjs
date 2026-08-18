// Temporary: report (and optionally remove) the test data I created while
// verifying the LMS flow. Run with `node cleanup.tmp.mjs` to report,
// `node cleanup.tmp.mjs --apply` to delete.
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: new URL('.env', import.meta.url) });

const APPLY = process.argv.includes('--apply');

await mongoose.connect(process.env.MONGODB_URI ?? process.env.MONGO_URI);
const db = mongoose.connection.db;
console.log('db:', db.databaseName);

// Test accounts I made all used these synthetic domains.
const TEST_EMAIL = /@(x\.gov\.au|example\.test|test\.local)$/i;

const users = await db.collection('users').find({ email: TEST_EMAIL }).toArray();
console.log('\n--- test users (%d) ---', users.length);
for (const u of users) console.log(' ', u.email, '|', u.role, '|', u.name);

const ids = users.map((u) => u._id);
const courses = await db.collection('courses').find({ author: { $in: ids } }).toArray();
console.log('\n--- courses authored by them (%d) ---', courses.length);
for (const c of courses) {
  console.log(' ', c.title, '| status:', c.status, '| review:', c.reviewStatus, '| featured:', !!c.featured);
}

const cids = courses.map((c) => c._id);
const counts = {};
for (const [name, q] of [
  ['modules', { course: { $in: cids } }],
  ['lessons', { course: { $in: cids } }],
  ['enrollments', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
  ['progresses', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
  ['quizattempts', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
  ['certificates', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
  ['instructorprofiles', { user: { $in: ids } }],
]) {
  counts[name] = await db.collection(name).countDocuments(q).catch(() => 0);
}
console.log('\n--- related records ---');
console.log(counts);

// The live public site only ever shows published courses, so that is the one
// thing worth fixing whether or not the rest gets deleted.
const live = courses.filter((c) => c.status === 'published' || c.featured);
if (live.length) {
  console.log('\n!! %d test course(s) are visible on the public site', live.length);
  if (APPLY) {
    const r = await db.collection('courses').updateMany(
      { _id: { $in: live.map((c) => c._id) } },
      { $set: { status: 'draft', featured: false, reviewStatus: 'none' } },
    );
    console.log('   taken offline:', r.modifiedCount);
  }
}

if (APPLY && process.argv.includes('--purge')) {
  for (const [name, q] of [
    ['certificates', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
    ['quizattempts', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
    ['progresses', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
    ['enrollments', { $or: [{ user: { $in: ids } }, { course: { $in: cids } }] }],
    ['lessons', { course: { $in: cids } }],
    ['modules', { course: { $in: cids } }],
    ['courses', { _id: { $in: cids } }],
    ['instructorprofiles', { user: { $in: ids } }],
    ['users', { _id: { $in: ids } }],
  ]) {
    const r = await db.collection(name).deleteMany(q).catch(() => ({ deletedCount: 'n/a' }));
    console.log('deleted', name, r.deletedCount);
  }
}

await mongoose.disconnect();
