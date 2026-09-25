import { useCallback, useEffect, useRef, useState } from "react";
import { CirclePlay, X } from "lucide-react";

import styles from "./TutorialModal.module.css";

type Props = {
  open: boolean;
  onClose?: () => void;
};

const tutorialVideoUrl = new URL(
  "../../../assets/common/tutorial.mp4",
  import.meta.url,
).href;

export default function TutorialModal({ open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const playVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setFinished(false);
      await video.play();
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  }, []);

  const replayVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setFinished(false);
    await playVideo();
  }, [playVideo]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      setFinished(false);
      void playVideo();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      videoRef.current?.pause();
      setAutoplayBlocked(false);
      setFinished(false);
    };
  }, [onClose, open, playVideo]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="บทเรียนการลงทะเบียนใบหน้า"
      onClick={() => onClose?.()}
    >
      <section
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <CirclePlay
              className={styles.titleIcon}
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <div>
              <div className={styles.title}>บทเรียนการลงทะเบียนใบหน้า</div>
              <div className={styles.subtitle}>ดูขั้นตอนก่อนเริ่มลงทะเบียน</div>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={() => onClose?.()}
            aria-label="ปิดบทเรียน"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        <div className={styles.playerArea}>
          <div className={styles.playerStage}>
            <video
              ref={videoRef}
              className={styles.video}
              src={tutorialVideoUrl}
              autoPlay
              controls
              playsInline
              preload="auto"
              onCanPlay={() => {
                if (open && !finished) void playVideo();
              }}
              onPlay={() => {
                setAutoplayBlocked(false);
                setFinished(false);
              }}
              onEnded={() => setFinished(true)}
            >
              เบราว์เซอร์นี้ไม่รองรับวิดีโอบทเรียน
            </video>

            {autoplayBlocked && !finished ? (
              <div className={styles.centerOverlay}>
                <button
                  type="button"
                  className={styles.overlayAction}
                  onClick={() => void playVideo()}
                >
                  <CirclePlay
                    className={styles.overlayIcon}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>เริ่มบทเรียน</strong>
                    <small>กดเพื่อเล่นวิดีโอ</small>
                  </span>
                </button>
              </div>
            ) : null}

            {finished ? (
              <div className={styles.finishedOverlay}>
                <div className={styles.finishedCard}>
                  <div className={styles.finishedTitle}>จบบทเรียนแล้ว</div>
                  <div className={styles.finishedText}>
                    พร้อมเริ่มลงทะเบียนใบหน้า
                  </div>

                  <button
                    type="button"
                    className={styles.watchAgainButton}
                    onClick={() => void replayVideo()}
                  >
                    <CirclePlay size={18} strokeWidth={1.9} aria-hidden="true" />
                    ดูอีกครั้ง
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
