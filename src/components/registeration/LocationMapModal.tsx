import { useEffect } from "react";
import { ExternalLink, MapPin, X } from "lucide-react";

import styles from "./LocationMapModal.module.css";

type LocationMapModalProps = {
  isOpen: boolean;
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  onClose: () => void;
  title?: string;
};

function toCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export default function LocationMapModal({
  isOpen,
  latitude,
  longitude,
  onClose,
  title = "Location",
}: LocationMapModalProps) {
  const lat = toCoordinate(latitude);
  const lng = toCoordinate(longitude);
  const hasCoordinates = lat !== null && lng !== null;
  const mapUrl = hasCoordinates
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=18&output=embed`
    : "";
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : "#";

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-map-title"
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.titleIcon} aria-hidden="true">
              <MapPin size={20} />
            </span>
            <div>
              <h2 id="location-map-title" className={styles.title}>
                {title}
              </h2>
              <p>ตำแหน่งล่าสุดจากอุปกรณ์</p>
            </div>
          </div>
          <button
            className={styles.closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close map"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.content}>
          {hasCoordinates ? (
            <>
              <div className={styles.mapFrame}>
                <iframe
                  className={styles.map}
                  src={mapUrl}
                  title={`${title} map`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className={styles.locationBar}>
                <div className={styles.coordinates}>
                  <span><small>Latitude</small><strong>{lat.toFixed(6)}</strong></span>
                  <span><small>Longitude</small><strong>{lng.toFixed(6)}</strong></span>
                </div>

                <a
                  className={styles.googleMapsButton}
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  เปิดใน Google Maps
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              </div>
            </>
          ) : (
            <div className={styles.empty}>ไม่พบข้อมูลพิกัดของอุปกรณ์นี้</div>
          )}
        </div>
      </section>
    </div>
  );
}
