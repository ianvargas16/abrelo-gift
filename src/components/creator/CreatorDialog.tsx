import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface CreatorDialogProps {
  backdropClassName: string;
  dialogClassName: string;
  labelledBy: string;
  closeLabel: string;
  heading: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

export function CreatorDialog({
  backdropClassName,
  dialogClassName,
  labelledBy,
  closeLabel,
  heading,
  children,
  onClose,
}: CreatorDialogProps) {
  return createPortal(
    <div
      className={`creator-dialog-backdrop ${backdropClassName}`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`creator-dialog ${dialogClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose();
          }
        }}
      >
        <button
          type="button"
          className="icon-button creator-dialog-close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          ×
        </button>
        <div className="creator-dialog-heading">
          <div>{heading}</div>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
