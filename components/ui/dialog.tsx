'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/format';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
}

export function ModalDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'lg',
}: ModalDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const sizeClass =
    size === 'md' ? 'max-w-lg' : size === 'xl' ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-[26px] border border-[#E6E3DC] bg-[#FAFAF8] p-0 text-[#11151B] shadow-elevated',
        sizeClass,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#E6E3DC] bg-white px-6 py-5">
        <div>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[#11151B]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-[#5C636E]">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E6E3DC] text-[#5C636E] transition hover:border-[#11151B] hover:text-[#11151B] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
