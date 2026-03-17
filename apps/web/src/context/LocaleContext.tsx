import { createContext, useContext } from 'react'
import type { useLocale } from '../i18n/useLocale'

type LocaleContextType = ReturnType<typeof useLocale>

export const LocaleContext = createContext<LocaleContextType | null>(null)

export function useT(): LocaleContextType {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useT must be used within LocaleProvider')
  return ctx
}
