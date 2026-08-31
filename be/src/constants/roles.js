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

// The only role a visitor may give themselves at signup. Anything else is a
// privilege escalation attempt and is rejected outright.
//
// INSTRUCTOR was in this list, and the LMS sign-up page offered it as a choice.
// It is not offered any more: instructor accounts are provisioned by a super
// admin in the CMS (Users & roles), and an instructor signs in with the
// credentials they are given rather than creating their own.
//
// Removing it from THIS array is what makes that true. Taking the two cards off
// the sign-up form only changes what the form asks for — /accounts/signup is
// unauthenticated and takes `role` from the request body, so anyone who could
// read the old page could still POST role:"instructor" and mint themselves the
// ability to author courses. The UI is the convenience; this line is the rule.
export const SELF_SIGNUP_ROLES = [ROLES.STUDENT];

// May author course content. Super Admin is included so staff can fix an
// instructor's course without a second account.
export const TEACHING_ROLES = [ROLES.SUPERADMIN, ROLES.INSTRUCTOR];

// May consume course content.
export const LEARNING_ROLES = [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.SUPERADMIN];
