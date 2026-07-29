import { useEffect } from 'react';
import wechatQr from '../../assets/images/WeChatQr.png';

// Shown when the footer's WeChat channel is clicked. WeChat personal accounts
// have no public profile page, and its scanner only accepts codes WeChat itself
// signed — so this is the account's own exported QR image rather than one
// generated from the WeChat ID (an unsigned code scans as "no usable data").
export default function WeChatQrDialog({ open, onClose }) {
  // Escape dismisses, matching ConfirmDialog in the admin area.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="wechat-qr__backdrop" role="presentation" onClick={onClose}>
      <div
        className="wechat-qr"
        role="dialog"
        aria-modal="true"
        aria-label="Add us on WeChat"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="wechat-qr__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="wechat-qr__title">Add us on WeChat</h2>
        <p className="wechat-qr__text">
          Open WeChat, tap <strong>Discover → Scan</strong>, and point your camera
          at the code below.
        </p>
        <img
          className="wechat-qr__code"
          src={wechatQr}
          alt="WeChat QR code for Government Procurement"
          width="376"
          height="388"
        />
      </div>
    </div>
  );
}
