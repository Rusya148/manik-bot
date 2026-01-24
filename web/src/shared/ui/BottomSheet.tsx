import { ReactNode, useEffect } from "react";
import clsx from "clsx";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export const BottomSheet = ({ open, onClose, title, children }: Props) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 sheet-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={clsx(
          "absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-[color:var(--app-card)]",
          "safe-area-bottom shadow-card",
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-base font-semibold">{title}</div>
          <button
            className="rounded-full px-3 py-2 text-sm text-hint"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <div className="px-4 pb-4 pt-2">{children}</div>
      </div>
    </div>
  );
};
