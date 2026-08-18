import { Outlet } from 'react-router-dom';
import '../lms.css';

// The shell for sign-in, signup and password reset.
//
// These pages sit outside LmsLayout. They have no sidebar and no header, but
// they still need two things that layout was providing: the stylesheet itself,
// and the `.lms` class that every design token is declared on. Without the
// wrapper the pages render, but every var(--lms-*) resolves to nothing, so
// inputs lose their borders and the whole page comes out unstyled.
export default function AuthLayout() {
  return (
    <div className="lms">
      <Outlet />
    </div>
  );
}
