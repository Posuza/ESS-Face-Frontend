import React from "react";
import styles from "./SharePdfModal.module.css";

const SHARE_LINK = typeof window !== "undefined" ? window.location.href : "";

const shareOptions = [
  {
    label: "Facebook",
    url: (link: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png" alt="Facebook" style={{width:48,height:48, borderRadius: '50%'}} />,
  },
  {
    label: "X",
    url: (link: string) => `https://x.com/intent/tweet?url=${encodeURIComponent(link)}`,
    icon: <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" alt="X" style={{width:40,height:40, borderRadius: '50%'}} />,
  },
  {
    label: "LinkedIn",
    url: (link: string) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" style={{width:45,height:45, borderRadius: '50%'}} />,
  },
  {
    label: "WhatsApp",
    url: (link: string) => `https://wa.me/?text=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" style={{width:50,height:50, borderRadius: '50%'}} />,
  },
  {
    label: "Email",
    url: (link: string) => `mailto:?subject=แชร์ไฟล์ PDF&body=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Mail_%28iOS%29.svg" alt="Email" style={{width:48,height:48, borderRadius: '50%'}} />,
  },
  {
    label: "Telegram",
    url: (link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" style={{width:48,height:48, borderRadius: '50%'}} />,
  },
  {
    label: "Line",
    url: (link: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="Line" style={{width:48,height:48, borderRadius: '50%'}} />,
  },
  {
    label: "Reddit",
    url: (link: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(link)}`,
    icon: <img src="https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-180x180.png" alt="Reddit" style={{width:45,height:45, borderRadius: '50%', background: '#fff', objectFit: 'contain'}} />,
  },
  {
    label: "Pinterest",
    url: (link: string) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(link)}`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png" alt="Pinterest" style={{width:48,height:48, borderRadius: '50%'}} />,
  },
  {
    label: "Messenger",
    url: (link: string) => `https://www.messenger.com/share?link=${encodeURIComponent(link)}`,
    icon: <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAV1BMVEVHcEwIZv8IZv8IZv8IZv8IZv8IZv8IZv8IZv8IZv8IZv8IZv8IZv8IZv8HZv////8AY/8AXv8AWP+Lrf+80f8cbv9Xjf/1+f85e//X5P/p8P+rxP9wnP8xgifcAAAADnRSTlMAplOSPzBiFfjMetq27f7664IAAADsSURBVCiRlZLbcsMgDESxwQGcVEL4Gjf//50VFzsmJJ12Hxhmz2gBISH+KK3aVul3pGsMRH3JV64tnNQU7AKlTPeZsQ6qagawH2zeMGMT6yviHC+qKCRyCfnHwLtbfGBmflxmzya5Ee+ejVOqmxFxJPLzgji5fOEmMWIPcXl88zpQsC4Mbyk0mFkxFKDfK2PorjVdLFTKWLhxwTTd8QgFaHPviEMH75wfEDd/6pEOELeV4rWmMYeCiU3g33JrbgDjvAF59H136s7bmqSHfPoW+xySil5/GZNiiNqyTIlX2MirCRMgO1FK2178Vz+v2xyw23ol9QAAAABJRU5ErkJggg==" alt="Messenger" style={{width:40,height:40, borderRadius: '50%', background: '#fff', objectFit: 'contain'}} />,
  },
  {
    label: "TikTok",
    url: (link: string) => `https://www.tiktok.com/`,
    icon: <img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" style={{width:45,height:45, borderRadius: '50%', background: '#fff', objectFit: 'contain'}} />,
  },
  {
    label: "Google Drive",
    url: (link: string) => `https://drive.google.com/drive/u/0/my-drive`,
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Google Drive" style={{width:45,height:45, borderRadius: '50%', background: '#fff', objectFit: 'contain'}} />,
  },
  {
    label: "YouTube",
    url: (link: string) => `https://www.youtube.com/`,
    icon: <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube" style={{width:40,height:40, borderRadius: '50%', background: '#fff', objectFit: 'contain'}} />,
  },
];

export default function SharePdfModal({ open, onClose, shareUrl, pdfBlob, closeOnOverlayClick }: {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  pdfBlob?: Blob | null;
  closeOnOverlayClick?: boolean;
}) {
  // PDF native share handler
  const handleNativeShare = async () => {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], 'MO_Report.pdf', { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'MO Report',
          text: 'MO รายงานประจำวัน',
          files: [file],
        });
      } catch (err) {
        alert('Sharing failed or was cancelled.');
      }
    } else {
      alert('This device/browser does not support file sharing.');
    }
  };

  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <div className={styles.header}>
          <span>Share</span>
        </div>
        <div className={styles.options}>
          {/* Removed native file share button, only show web share links */}
          {shareOptions.map((opt) => (
            <a
              key={opt.label}
              href={opt.url(shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.iconBtn}
              title={opt.label}
            >
              <span className={styles.socialIcon}>{opt.icon}</span>
              <span>{opt.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
