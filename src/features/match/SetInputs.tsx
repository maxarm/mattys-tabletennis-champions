import type { DraftSet } from '../../domain/types'

interface SetInputsProps {
  sets: readonly DraftSet[]
  names: readonly [string, string]
  disabled: boolean
  errors: readonly { row: number; message: string }[]
  onChange: (row: number, side: 0 | 1, value: string) => void
  onBlur: () => void
}

export function SetInputs({ sets, names, disabled, errors, onChange, onBlur }: SetInputsProps) {
  return <div className="set-inputs">
    {sets.map((set, row) => {
      const error = errors.find(error => error.row === row)
      const errorId = `set-${row}-error`
      return <fieldset key={row} disabled={disabled}>
        <legend>Satz {row + 1}</legend>
        <div className="score-fields">
          {([0, 1] as const).map(side => <label key={side}>
            <span>{names[side]}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Satz ${row + 1}: ${names[side]}`}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              value={set[side]}
              onFocus={event => event.currentTarget.select()}
              onChange={event => onChange(row, side, event.target.value)}
              onBlur={onBlur}
            />
          </label>)}
        </div>
        {error && <p className="set-error" id={errorId}>{error.message} Bis 11, danach immer zwei Punkte Vorsprung.</p>}
      </fieldset>
    })}
  </div>
}
