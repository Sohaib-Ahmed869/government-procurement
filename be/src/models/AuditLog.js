import mongoose from 'mongoose';

// Immutable-ish record of admin actions (Settings + audit log requirement).
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, default: '' }, // denormalised in case the user is later deleted
    action: { type: String, required: true }, // e.g. 'article.publish'
    entity: { type: String, default: '' }, // e.g. 'Article'
    entityId: { type: String, default: '' },
    summary: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Fire-and-forget helper so controllers can record actions without awaiting.
export function recordAudit({ req, action, entity, entityId, summary, meta }) {
  try {
    AuditLog.create({
      actor: req?.user?._id,
      actorEmail: req?.user?.email || '',
      action,
      entity,
      entityId: entityId ? String(entityId) : '',
      summary,
      meta,
      ip: req?.ip || '',
    }).catch(() => {});
  } catch {
    /* never let auditing break a request */
  }
}
