import { AiFillTikTok } from 'react-icons/ai';
import {
  FaCommentDots,
  FaFacebookF,
  FaFacebookMessenger,
  FaLinkedin,
  FaTelegram,
  FaThreads,
  FaWeixin,
  FaWhatsapp,
  FaYoutube,
} from 'react-icons/fa6';
import { TbBrandInstagramFilled } from 'react-icons/tb';
import { CONTACT_PHONE_DIGITS } from './contact.js';

// The Facebook profile ID — m.me deep-links by account ID, not by phone number,
// and it is the same account as the Facebook profile below.
const FACEBOOK_ID = '61585039209265';

// Every link in the footer, in the order each row shows them.
//
// This is a fixed catalogue rather than an open list, because each entry is
// bound to a brand icon in code — a platform an editor invented would have
// nothing to draw. The CMS therefore edits the URL of these entries and can
// hide them, but cannot add or remove one.
//
// `row` picks which footer row it belongs to: 'social' is the Follow Us grid,
// 'channel' is the messaging row under Contact.
//
// `href` is the address shipped with the site. A matching link saved in the CMS
// (Links, matched on `platform`) overrides it; with none saved, this is used.
//
// WeChat is the one exception, marked `qr`. Personal WeChat accounts have no
// public https profile URL, so it opens a dialog showing the account's own code
// to scan (Discover → Scan) instead of navigating. There is no URL to edit, so
// it is not offered in the CMS. To replace the image, export a fresh code from
// the account (Me → name → My QR Code → Save) over
// src/assets/images/WeChatQr.png.
export const FOOTER_LINKS = [
  {
    platform: 'instagram',
    row: 'social',
    label: 'Instagram',
    href: 'https://www.instagram.com/govprocurement/?hl=en',
    Icon: TbBrandInstagramFilled,
  },
  {
    platform: 'facebook',
    row: 'social',
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61585039209265',
    Icon: FaFacebookF,
  },
  {
    platform: 'linkedin',
    row: 'social',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/governmentprocurement/',
    Icon: FaLinkedin,
  },
  {
    platform: 'youtube',
    row: 'social',
    label: 'YouTube',
    href: 'https://www.youtube.com/@GovernmentProcurement',
    Icon: FaYoutube,
  },
  {
    platform: 'tiktok',
    row: 'social',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@govprocurement',
    Icon: AiFillTikTok,
  },
  {
    platform: 'threads',
    row: 'social',
    label: 'Threads',
    href: 'https://www.threads.com/@govprocurement',
    Icon: FaThreads,
  },
  {
    platform: 'whatsapp',
    row: 'channel',
    label: 'WhatsApp',
    href: `https://wa.me/${CONTACT_PHONE_DIGITS}`,
    Icon: FaWhatsapp,
  },
  {
    platform: 'telegram',
    row: 'channel',
    label: 'Telegram',
    href: `https://t.me/+${CONTACT_PHONE_DIGITS}`,
    Icon: FaTelegram,
  },
  {
    platform: 'wechat',
    row: 'channel',
    label: 'WeChat',
    qr: true,
    Icon: FaWeixin,
    iconModifier: 'wechat',
  },
  {
    platform: 'messenger',
    row: 'channel',
    label: 'FB Messenger',
    href: `https://m.me/${FACEBOOK_ID}`,
    Icon: FaFacebookMessenger,
  },
  {
    platform: 'botim',
    row: 'channel',
    label: 'Botim',
    href: 'https://www.botim.me/',
    Icon: FaCommentDots,
  },
];

// The entries the CMS can edit — everything with a URL behind it.
export const EDITABLE_FOOTER_LINKS = FOOTER_LINKS.filter((l) => !l.qr);

// Merge the catalogue with whatever the CMS holds: a saved link replaces the
// built-in URL, and one marked inactive drops out of the footer entirely.
// Anything the CMS doesn't know about keeps its shipped address, so the footer
// is never empty — including before a single link has been saved.
export function resolveFooterLinks(row, saved = []) {
  const byPlatform = new Map(
    saved.filter((l) => l.platform).map((l) => [l.platform, l]),
  );

  return FOOTER_LINKS.filter((link) => link.row === row)
    .map((link) => {
      const override = byPlatform.get(link.platform);
      if (!override) return link;
      if (override.active === false) return null;
      return { ...link, href: override.url || link.href };
    })
    .filter(Boolean);
}
