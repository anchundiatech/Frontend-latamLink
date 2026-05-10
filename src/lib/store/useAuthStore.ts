import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthState {
  email: string
  isAuthenticated: boolean
  sessionToken: string | null
  login: (email: string, token: string) => void
  logout: () => void
  setEmail: (email: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: "",
      isAuthenticated: false,
      sessionToken: null,
      login: (email, token) => set({ email, sessionToken: token, isAuthenticated: true }),
      logout: () => set({ email: "", sessionToken: null, isAuthenticated: false }),
      setEmail: (email) => set({ email }),
    }),
    { name: "latamlink-auth" }
  )
)
