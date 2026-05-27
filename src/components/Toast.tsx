"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, Clock, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning";

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  body?: string;
};

type Props = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: Clock
};

export function Toast({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="toastContainer" aria-live="polite" aria-atomic="false">
      {toasts.slice(-3).map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon = ICONS[toast.type];

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast--${toast.type}`} role="alert">
      <div className="toastIcon">
        <Icon size={18} aria-hidden />
      </div>
      <div className="toastContent">
        <strong className="toastTitle">{toast.title}</strong>
        {toast.body ? <span className="toastBody">{toast.body}</span> : null}
      </div>
      <button
        className="toastClose"
        onClick={() => onDismiss(toast.id)}
        type="button"
        aria-label="Cerrar notificación"
      >
        <X size={15} aria-hidden />
      </button>
      <div className="toastProgress" />
    </div>
  );
}

let toastCounter = 0;

export function createToastId() {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}
