import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import StripePaymentElement from './StripePaymentElement.jsx';
import { formatMoney } from '../../utils/money.js';

// Billing details and payment (C1).
//
// Billing fields are collected here because the tax invoice needs them; card
// details are not. See StripePaymentElement.
export default function CheckoutForm({ total, currency, status, error, onSubmit, user }) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    organisation: '',
    abn: '',
    country: 'Australia',
  });
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const emailOk = /\S+@\S+\.\S+/.test(form.email);
  const valid = form.name.trim() && emailOk && terms;
  const processing = status === 'processing';
  const free = total === 0;

  return (
    <form
      className="lms-checkoutform"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!valid) return;
        onSubmit(form);
      }}
    >
      <section className="lms-card">
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="user" />
            Billing details
          </h2>
        </div>

        <div className="lms-formgrid">
          <label className="lms-field">
            <span className="lms-field__label">Full name</span>
            <input className="lms-input" value={form.name} onChange={set('name')} autoComplete="name" />
            {touched && !form.name.trim() ? (
              <span className="lms-field__error">Enter the name for the invoice.</span>
            ) : null}
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Email</span>
            <input className="lms-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            <span className="lms-field__hint">Your receipt and access details go here.</span>
            {touched && !emailOk ? (
              <span className="lms-field__error">Enter a valid email address.</span>
            ) : null}
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Organisation</span>
            <input className="lms-input" value={form.organisation} onChange={set('organisation')} autoComplete="organization" />
            <span className="lms-field__hint">Optional. Appears on the invoice</span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">ABN</span>
            <input className="lms-input" value={form.abn} onChange={set('abn')} inputMode="numeric" />
            <span className="lms-field__hint">Optional. Add it if your organisation claims the GST credit</span>
          </label>
        </div>
      </section>

      {!free ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="lock" />
              Payment
            </h2>
            <span className="lms-card__note">Secured by Stripe</span>
          </div>
          <StripePaymentElement total={total} currency={currency} />
        </section>
      ) : null}

      <section className="lms-card" style={{ marginTop: 18 }}>
        <label className="lms-terms">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I agree to the <a href="/terms">terms of service</a> and understand that course
            access begins immediately, which affects the statutory cooling-off period.
          </span>
        </label>
        {touched && !terms ? (
          <p className="lms-field__error" style={{ marginTop: 8 }}>
            You’ll need to accept the terms to continue.
          </p>
        ) : null}

        {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

        <button
          type="submit"
          className="lms-btn lms-btn--primary lms-btn--block lms-checkoutform__submit"
          disabled={processing}
        >
          {processing ? (
            'Processing…'
          ) : (
            <>
              <LmsIcon name="lock" />
              {free ? 'Complete enrolment' : `Pay ${formatMoney(total, currency)}`}
            </>
          )}
        </button>

        <p className="lms-checkoutform__note">
          {free
            ? 'No payment required for this enrolment.'
            : 'Your card is charged once. This is not a subscription.'}
        </p>
      </section>
    </form>
  );
}
