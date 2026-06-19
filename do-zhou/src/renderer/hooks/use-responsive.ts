import { useState, useEffect } from 'react'

export type Breakpoint = 'xl' | 'lg' | 'md' | 'sm'

export function useResponsive() {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    let id: number
    const handle = () => { cancelAnimationFrame(id); id = requestAnimationFrame(() => setWidth(window.innerWidth)) }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const bp: Breakpoint = width >= 1200 ? 'xl' : width >= 1024 ? 'lg' : width >= 800 ? 'md' : 'sm'

  return {
    breakpoint: bp,
    showLeftPanel: bp !== 'sm',
    showRightPanel: bp === 'xl' || bp === 'lg',
    leftPanelAsOverlay: bp === 'sm',
    rightPanelAsOverlay: bp === 'md' || bp === 'sm'
  }
}
