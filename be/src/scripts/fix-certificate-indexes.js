import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Certificate } from '../models/Certificate.js';

/* ---------------------------------------------------------------------------
   One-off: replace the certificates unique index.

   The old index was:
     { user: 1, course: 1 }  unique, SPARSE

   A compound sparse index still indexes a document when ANY of its keys is
   present, and `user` always is. A learning path certificate has no `course`,
   so two of them for the same learner both index as {user, course: null} and
   the second fails on a duplicate key — silently blocking the second program
   certificate anyone ever earns.

   The replacements are PARTIAL, filtered on the key actually being an
   ObjectId, so a document without one is not indexed at all.

   MongoDB refuses a new index whose key pattern matches an existing one under a
   different name, so the old index has to be dropped first. Dropping an index
   removes no data. Idempotent: safe to run more than once.

   Run with:  node src/scripts/fix-certificate-indexes.js
   ------------------------------------------------------------------------ */
const LEGACY = 'user_1_course_1';

async function main() {
  await mongoose.connect(env.mongoUri ?? process.env.MONGO_URI);
  const collection = mongoose.connection.collection('certificates');

  const before = await collection.indexes();
  console.log('before:', before.map((i) => i.name).join(', '));

  if (before.some((i) => i.name === LEGACY)) {
    await collection.dropIndex(LEGACY);
    console.log(`dropped ${LEGACY}`);
  } else {
    console.log(`${LEGACY} not present, nothing to drop`);
  }

  // Builds whatever the schema declares and is missing.
  await Certificate.syncIndexes();

  const after = await collection.indexes();
  console.log('after:', after.map((i) => i.name).join(', '));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exitCode = 1;
});
