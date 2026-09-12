import * as React from "react"

export function useLoadingTimeout(loading: boolean, timeout = 8000) {
  const [timedOut, setTimedOut] = React.useState(false)
  React.useEffect(() => {
    if (!loading) {
      setTimedOut(false)
      return
    }
    const t = setTimeout(() => setTimedOut(true), timeout)
    return () => clearTimeout(t)
  }, [loading, timeout])
  return timedOut
}
