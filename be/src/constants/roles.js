// Role-based access control. Super Admin has everything; Editor manages
// content; Moderator handles the forum Q&A workflow. (T2 roles reserved.)
export const ROLES = {
  SUPERADMIN: 'superadmin',
  EDITOR: 'editor',
  MODERATOR: 'moderator',
};

export const ALL_ROLES = Object.values(ROLES);

// Convenience groups used by route guards.
export const CONTENT_ROLES = [ROLES.SUPERADMIN, ROLES.EDITOR];
export const MODERATION_ROLES = [ROLES.SUPERADMIN, ROLES.EDITOR, ROLES.MODERATOR];
export const ADMIN_ONLY = [ROLES.SUPERADMIN];
