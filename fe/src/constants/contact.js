// Head office contact details. The messaging apps the number is reachable on
// live in footerLinks.js, alongside the rest of the footer's links.
export const CONTACT_PHONE = '+61 478 669 922';
export const CONTACT_EMAIL = 'mkheir@govprocurement.com.au';

// Head office, one array entry per line as it should be set.
export const CONTACT_ADDRESS_LINES = [
  'Room 830 of the Regus Flinders Centre',
  '25 Restwell Street',
  'BANKSTOWN, NSW, AUSTRALIA',
];

// CONTACT_PHONE in the two forms links want: digits only for the messaging deep
// links, and no spaces for tel:.
export const CONTACT_PHONE_DIGITS = CONTACT_PHONE.replace(/\D/g, '');
export const CONTACT_PHONE_HREF = `tel:${CONTACT_PHONE.replace(/\s/g, '')}`;
