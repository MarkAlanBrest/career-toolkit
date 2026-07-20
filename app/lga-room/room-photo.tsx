'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './landing.module.css';

export default function RoomPhoto() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  return (
    <>
      <button
        type="button"
        className={styles.roomThumbnail}
        onClick={() => setExpanded(true)}
        aria-label="See a larger photo of the LGA Room"
      >
        <Image
          src="/lga-room-interior.png"
          alt="The LGA Room with presentation screens, tables, and seating"
          fill
          sizes="(max-width: 760px) calc(100vw - 80px), 520px"
        />
        <span className={styles.roomThumbnailLabel}>
          <span aria-hidden="true">⌕</span>
          See the room
        </span>
      </button>

      {expanded && (
        <div
          className={styles.roomLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="LGA Room photo"
          onClick={() => setExpanded(false)}
        >
          <button type="button" className={styles.lightboxClose} onClick={() => setExpanded(false)} aria-label="Close room photo">
            ×
          </button>
          <div className={styles.lightboxImage} onClick={event => event.stopPropagation()}>
            <Image
              src="/lga-room-interior.png"
              alt="The LGA Room with presentation screens, tables, and seating"
              fill
              priority
              sizes="96vw"
            />
          </div>
        </div>
      )}
    </>
  );
}
