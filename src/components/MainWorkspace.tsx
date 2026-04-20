import { GateMiniGame } from './GateMiniGame'

type Props = {
  secureChannels: readonly [number, number, number]
  onPuzzleSolved: () => void
}

export function MainWorkspace({ secureChannels, onPuzzleSolved }: Props) {
  return (
    <div className="workspace workspace--embedded">
      <GateMiniGame target={secureChannels} onSolved={onPuzzleSolved} />
    </div>
  )
}
