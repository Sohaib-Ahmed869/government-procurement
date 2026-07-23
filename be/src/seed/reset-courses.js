// Danger: wipes the Course collection and inserts a single, fully-populated
// course that matches the marketing course-detail layout. Other collections are
// left untouched.
//   npm run reset:courses
import { connectDB, disconnectDB } from '../config/db.js';
import { Course } from '../models/Course.js';
import { FEATURED_COURSE } from './course-data.js';

async function run() {
  await connectDB();
  const removed = await Course.deleteMany({});
  console.log(`[reset-courses] removed ${removed.deletedCount} existing course(s)`);
  const course = await Course.create({ ...FEATURED_COURSE, publishedAt: new Date() });
  console.log(`[reset-courses] created course "${course.title}" (slug: ${course.slug})`);
  await disconnectDB();
}

run().catch((err) => {
  console.error('[reset-courses] failed:', err);
  process.exit(1);
});
