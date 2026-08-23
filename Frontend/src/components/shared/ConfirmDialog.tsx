"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle } from "lucide-react"
import type { ReactNode } from "react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  confirming?: boolean
  onConfirm: () => void
}

// Diálogo de confirmación reutilizable para cualquier acción que no se
// pueda deshacer (borrar una cuenta, una destino, etc.) — antes de este
// componente esas acciones se disparaban con un solo click.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  confirming = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[calc(100%-2rem)] max-w-sm glass-strong rounded-xl p-6 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-start gap-3 mb-5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                destructive ? "bg-error/10" : "bg-electric-purple/10"
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${destructive ? "text-error" : "text-electric-purple"}`} />
            </div>
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-heading font-semibold text-on-surface">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-on-surface-variant mt-1">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-lg text-xs font-heading text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors cursor-pointer">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={confirming}
              className={`px-4 py-2 rounded-lg text-xs font-heading font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                destructive
                  ? "bg-error text-white hover:bg-error/90"
                  : "bg-electric-purple text-white hover:bg-electric-purple/90"
              }`}
            >
              {confirming ? "…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
