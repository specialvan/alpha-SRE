import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { DataMode } from '../data/types'

export type ThemeMode = 'dark' | 'light'
export type OperatorRole = 'viewer' | 'operator' | 'oncall' | 'admin'

interface UiState {
  theme: ThemeMode
  dataMode: DataMode
  role: OperatorRole
  searchQuery: string
  toggleTheme: () => void
  setDataMode: (dataMode: DataMode) => void
  setRole: (role: OperatorRole) => void
  setSearchQuery: (searchQuery: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      dataMode: 'mock',
      role: 'viewer',
      searchQuery: '',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
      setDataMode: (dataMode) => set({ dataMode }),
      setRole: (role) => set({ role }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'alpha-sre-ui',
    },
  ),
)
