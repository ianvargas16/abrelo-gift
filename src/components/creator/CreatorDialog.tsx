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
        <div className="creator-dialog-heading">
          <div>{heading}</div>
          <button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}>×</button>
        </div>
        <div className="creator-dialog-body">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
