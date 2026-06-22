export function Modal({ children, onClose, title, showCloseButton = false }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
    >
      <div
        className="surface-panel modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {showCloseButton && onClose ? (
          <button
            className="modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            &#10005;
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
