import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';

// Promotion code entry (C2).
export default function CouponField({ coupon, error, onApply, onRemove }) {
  const [code, setCode] = useState('');

  if (coupon) {
    return (
      <div className="lms-coupon lms-coupon--applied">
        <LmsIcon name="check" />
        <span className="lms-coupon__body">
          <strong>{coupon.code}</strong>
          <span>{coupon.label}</span>
        </span>
        <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={onRemove}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="lms-coupon">
      <form
        className="lms-coupon__form"
        onSubmit={(e) => {
          e.preventDefault();
          onApply(code);
        }}
      >
        <input
          className="lms-input"
          value={code}
          placeholder="Promotion code"
          aria-label="Promotion code"
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="lms-btn lms-btn--sm" disabled={!code.trim()}>
          Apply
        </button>
      </form>
      {error ? <p className="lms-coupon__error">{error}</p> : null}
    </div>
  );
}
