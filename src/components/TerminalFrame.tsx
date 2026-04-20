import type { Phase } from '../phase'
import type { ReactNode } from 'react'
import {
  DecorativeHeader,
  DecorativeTicker,
  ModuleCryptoCycle,
  ModuleDiagramSpectral,
  ModuleDiagramTerrainMap,
  ModuleDiagramYield3Axis,
  ModuleNetwork,
  ModuleOrbitalTelemetry,
  ModuleSecurity,
  ModuleSystemStatus,
} from './DecorativeModules'

type Props = {
  phase: Phase
  children: ReactNode
  onClockRapidClick: () => void
}

export function TerminalFrame({ phase, children, onClockRapidClick }: Props) {
  return (
    <div className={`terminal-frame terminal-frame--${phase}`}>
      <DecorativeHeader phase={phase} onClockRapidClick={onClockRapidClick} />

      <div className="terminal-frame__grid">
        <aside className="terminal-frame__aside terminal-frame__aside--left">
          <ModuleSystemStatus phase={phase} />
          <ModuleCryptoCycle />
          <ModuleDiagramYield3Axis phase={phase} />
          <ModuleSecurity phase={phase} />
        </aside>

        <div className="terminal-frame__center">{children}</div>

        <aside className="terminal-frame__aside terminal-frame__aside--right">
          <ModuleNetwork phase={phase} />
          <ModuleDiagramSpectral phase={phase} />
          <ModuleDiagramTerrainMap phase={phase} />
          <ModuleOrbitalTelemetry phase={phase} />
        </aside>
      </div>

      <DecorativeTicker phase={phase} />
    </div>
  )
}
