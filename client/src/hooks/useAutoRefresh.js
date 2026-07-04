import { useEffect, useRef } from 'react'

export default function useAutoRefresh(callback, intervalMs = 15000, enabled = true) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return undefined

    let running = false
    const refresh = async () => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      try {
        await callbackRef.current?.()
      } catch (error) {
        console.error('Automatic refresh failed:', error)
      } finally {
        running = false
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    const timer = window.setInterval(refresh, intervalMs)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enabled, intervalMs])
}
