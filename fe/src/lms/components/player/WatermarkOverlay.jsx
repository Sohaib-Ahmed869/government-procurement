import { useEffect, useState } from 'react';

// A forensic watermark carrying who is watching (L2). It does not stop a screen
// recording. Nothing in the browser can, but it makes a recording traceable
// back to the account that made it, which is what actually deters sharing.
//
// It moves so it cannot be cropped out of a whole session, and it is
// pointer-events: none so it never intercepts a click on the controls.
const POSITIONS = [
  { top: '8%', left: '6%' },
  { top: '8%', right: '6%' },
  { bottom: '18%', right: '6%' },
  { bottom: '18%', left: '6%' },
];

export default function WatermarkOverlay({ label }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % POSITIONS.length), 21_000);
    return () => clearInterval(id);
  }, []);

  if (!label) return null;

  return (
    <span className="lms-watermark" style={POSITIONS[i]} aria-hidden="true">
      {label}
    </span>
  );
}
