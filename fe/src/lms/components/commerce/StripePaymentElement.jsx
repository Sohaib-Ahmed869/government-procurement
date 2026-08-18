import LmsIcon from '../LmsIcon.jsx';

/* Where Stripe's Payment Element mounts (C1).

   This renders a PLACEHOLDER, not a card form, and that is deliberate rather
   than lazy. Card numbers must never touch your DOM: Stripe Elements renders
   its fields inside an iframe served by Stripe, so the PAN never enters your
   page, your JS bundle or your error logs. Building a real-looking card input
   here would invite someone to type a live card into an element this app
   controls, and would drag the whole frontend into PCI scope.

   To make it real:
     npm i @stripe/stripe-js @stripe/react-stripe-js
     wrap the checkout in <Elements stripe={loadStripe(PUBLISHABLE_KEY)}
       options={{ clientSecret }}> and replace the body below with
       <PaymentElement />
   The clientSecret comes from the server's PaymentIntent. See useCheckout. */
export default function StripePaymentElement({ total, currency = 'AUD' }) {
  return (
    <div className="lms-pay">
      <div className="lms-pay__slot">
        <LmsIcon name="lock" className="lms-pay__icon" />
        <div>
          <p className="lms-pay__title">Card details</p>
          <p className="lms-pay__note">
            Stripe’s secure payment field appears here. Card details are entered directly
            with Stripe and never reach this site.
          </p>
        </div>
      </div>

      <div className="lms-pay__methods" aria-label="Accepted payment methods">
        <span>Visa</span>
        <span>Mastercard</span>
        <span>Amex</span>
        <span>Apple&nbsp;Pay</span>
        <span>Google&nbsp;Pay</span>
      </div>

      <p className="lms-pay__amount">
        You’ll be charged{' '}
        <strong>
          {new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(total)}
        </strong>{' '}
        including GST.
      </p>
    </div>
  );
}
