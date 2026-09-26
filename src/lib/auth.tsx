import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'
import { MSG_GENERIC, MSG_NETWORK, mapAuthError } from './authErrors'
import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabase'

interface AuthState {
  status: AuthStatus
  session: Session | null
}

const initialState: AuthState = isSupabaseConfigured
  ? { status: 'loading', session: null }
  : { status: 'guest', session: null }

const toState = (session: Session | null): AuthState => ({
  status: session ? 'authenticated' : 'guest',
  session,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true

    // Callback hanya mengubah state; jangan memanggil API Supabase lain di sini (risiko deadlock).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(toState(session))
    })

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) setState(toState(session))
      })
      .catch(() => {
        if (active) setState(toState(null))
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return supabaseConfigError
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? mapAuthError(error) : null
    } catch {
      return MSG_NETWORK
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) console.error(MSG_GENERIC, error)
    } catch (err) {
      console.error(MSG_GENERIC, err)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      session: state.session,
      user: state.session?.user ?? null,
      signIn,
      signOut,
    }),
    [state, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
