// Role-based access control.
//
// Staff roles run the website and CMS: Super Admin has everything; Editor
// manages content; Moderator handles the forum Q&A workflow.
//
// LMS roles were added alongside: Instructor authors and teaches courses;
// Student learns. They are deliberately NOT staff — neither can reach the CMS,
// and the guards below are what keeps that true.
export const ROLES = {
  SUPERADMIN: 'superadmin',
  EDITOR: 'editor',
  MODERATOR: 'moderator',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
};

export const ALL_ROLES = Object.values(ROLES);

// Convenience groups used by route guards.
export const CONTENT_ROLES = [ROLES.SUPERADMIN, ROLES.EDITOR];
export const MODERATION_ROLES = [ROLES.SUPERADMIN, ROLES.EDITOR, ROLES.MODERATOR];
export const ADMIN_ONLY = [ROLES.SUPERADMIN];

// Everyone who belongs in the CMS. Guard admin surfaces with this rather than
// "is authenticated" — with students in the same user collection, a bare
// authentication check is no longer a staff check.
export const STAFF_ROLES = [ROLES.SUPERADMIN, ROLES.EDITOR, ROLES.MODERATOR];

// The only roles a visitor may give themselves at signup. Anything else is a
// privilege escalation attempt and is rejected outright.
export const SELF_SIGNUP_ROLES = [ROLES.STUDENT, ROLES.INSTRUCTOR];

// May author course content. Super Admin is included so staff can fix an
// instructor's course without a second account.
export const TEACHING_ROLES = [ROLES.SUPERADMIN, ROLES.INSTRUCTOR];

// May consume course content.
export const LEARNING_ROLES = [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.SUPERADMIN];
