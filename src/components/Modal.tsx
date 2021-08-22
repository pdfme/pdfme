import React, { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  actionLabel?: string;
  cancelLabel?: string;
  onAction?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCancel?: ((e: React.MouseEvent<HTMLButtonElement>) => void) | null;
  disabled?: boolean;
  red?: boolean;
  fullSize?: boolean;
};

const Modal = ({
  open,
  title,
  onClose,
  actionLabel,
  cancelLabel,
  onAction,
  onCancel,
  disabled = false,
  red = false,
  children,
  fullSize = false,
}: Props) => {
  useEffect(() => {
    if (open) {
      document.getElementsByTagName("html")[0].classList.add("is-clipped");
    } else {
      document.getElementsByTagName("html")[0].classList.remove("is-clipped");
    }
  }, [open]);
  return (
    <div className={`modal-container`} style={{ zIndex: 9999 }}>
      <div className={`modal is-clipped ${open ? "is-active" : ""}`}>
        <div className="modal-background" />
        <div
          className="modal-card"
          style={fullSize ? { width: "100%", height: "100%" } : {}}
        >
          <header className="modal-card-head">
            <span className="modal-card-title" style={{ textAlign: "left" }}>
              {title}
            </span>
            <button className="delete" aria-label="close" onClick={onClose} />
          </header>
          <section className="modal-card-body">{children}</section>
          <footer
            className="modal-card-foot"
            style={{ flexDirection: "row-reverse" }}
          >
            {onAction && actionLabel && (
              <button
                disabled={disabled}
                className={`button ${red ? "is-danger" : "is-success"}`}
                onClick={onAction}
                style={{ position: "relative" }}
              >
                {actionLabel}
              </button>
            )}
            <div style={{ width: "1rem" }} />
            {onCancel && cancelLabel && (
              <button disabled={disabled} className="button" onClick={onCancel}>
                {cancelLabel}
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Modal;
