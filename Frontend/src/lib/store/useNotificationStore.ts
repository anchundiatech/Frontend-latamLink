import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Notification {
  id: string
  amount: number
  token: "USDC" | "SOL"
  date: Date
  payer: string
  signature: string
  terminal: string
  merchantName: string
  read: boolean
}

interface NotificationState {
  notifications: Notification[]
  viewReceipt: Notification | null
  addNotification: (n: Omit<Notification, "id" | "read" | "date">) => void
  markAsRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
  unreadCount: () => number
  setViewReceipt: (n: Notification | null) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      viewReceipt: null,

      addNotification: (n) => {
        const notification: Notification = {
          ...n,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: new Date(),
          read: false,
        }
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
        }))
      },

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () => set({ notifications: [] }),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      setViewReceipt: (n) => set({ viewReceipt: n }),
    }),
    {
      name: "latamlink-notifications",
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    }
  )
)
