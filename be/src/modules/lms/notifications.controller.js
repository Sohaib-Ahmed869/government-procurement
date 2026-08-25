import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import { Notification } from '../../models/Notification.js';

/* ---------------------------------------------------------------------------
   The bell, read and dismissed (R2).

   Read state lives HERE rather than in the browser. It used to be a list of ids
   in localStorage, which meant a notification cleared on a laptop was still
   waiting on a phone, and clearing it there did not settle it either. The same
   reasoning that moved profile settings onto the User record: a preference or a
   dismissal that does not follow the account is a per-browser accident.
   ------------------------------------------------------------------------ */

/* How far back the bell reads. A notification nobody has opened in three months
   is not going to be opened, and the alternative is a list that grows without
   limit for an account that never presses anything.

   This caps the READ, not the record. Nothing is deleted here — retention is a
   Phase 11 question (APP 11) and belongs with the rest of it, not smuggled in
   as a side effect of rendering a dropdown. */
const PAGE_SIZE = 50;

// GET /lms/notifications
export const myNotifications = asyncHandler(async (req, res) => {
  const rows = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE);

  /* Counted with a query rather than from `rows`, because the two answer
     different questions: the list is capped at PAGE_SIZE and the badge is not.
     Deriving the count from a truncated list is how a bell says "50" forever. */
  const unread = await Notification.countDocuments({ user: req.user._id, readAt: null });

  return ok(res, { items: rows.map((n) => n.toItem()), unread });
});

/* POST /lms/notifications/read

   `{ ids: [...] }` marks those, `{ all: true }` marks everything. Both are the
   same endpoint because they are the same intent, and because "mark all read"
   as a client-side loop over ids is a burst of writes that can half-fail.

   Scoped to req.user on the way in, so an id belonging to somebody else matches
   nothing rather than being an error worth reporting — which would confirm the
   notification exists. */
export const markNotificationsRead = asyncHandler(async (req, res) => {
  const { ids, all } = req.body ?? {};

  const filter = { user: req.user._id, readAt: null };
  if (!all) {
    // Filtered to well-formed ids rather than passed straight to the query: an
    // id the client made up casts badly and would come back a 500 instead of
    // the "that matched nothing" this should be.
    const list = (Array.isArray(ids) ? ids : []).filter((id) =>
      mongoose.isValidObjectId(id));
    // No ids and not `all` is a no-op, not "mark everything". Getting that
    // backwards would silently clear the bell on a malformed request.
    if (!list.length) return ok(res, { updated: 0 });
    filter._id = { $in: list };
  }

  // Already-read rows are excluded by the filter, so readAt keeps the moment it
  // was FIRST read rather than being pushed forward every time the panel opens.
  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });

  return ok(res, { updated: result.modifiedCount ?? 0 });
});
