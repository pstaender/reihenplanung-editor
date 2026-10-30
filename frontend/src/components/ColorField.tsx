interface Props {
  label: string
  value?: string
  presets: string[]
  fallback: string
  onChange: (value?: string) => void
}

/** Farbauswahl mit dezenten Vorgaben, freier Farbe und „keine“. */
export function ColorField({ label, value, presets, fallback, onChange }: Props) {
  return (
    <fieldset className="color-field">
      <legend>{label}</legend>
      <div className="swatches">
        <button type="button" className={`swatch none ${value ? '' : 'selected'}`} title="Keine" onClick={() => onChange(undefined)} />
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch ${value === color ? 'selected' : ''}`}
            style={{ background: color }}
            title={color}
            onClick={() => onChange(color)}
          />
        ))}
        <label className="swatch custom" title="Eigene Farbe">
          <input type="color" value={value ?? fallback} onChange={(e) => onChange(e.target.value)} />
        </label>
      </div>
    </fieldset>
  )
}

export const BACKGROUND_PRESETS = ['#f4f4f5', '#fdf6e3', '#eef6ee', '#eaf2fb', '#fbeeee', '#f3eefb']
export const TEXT_PRESETS = ['#111111', '#6b7280', '#1d4ed8', '#047857', '#b91c1c', '#7c3aed']
