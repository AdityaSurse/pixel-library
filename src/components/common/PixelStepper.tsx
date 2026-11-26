import React from 'react';

interface PixelStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (newValue: number) => void;
  unit?: string;
  disabled?: boolean;
}

export const PixelStepper: React.FC<PixelStepperProps> = ({
  value,
  min,
  max,
  onChange,
  unit = 'min',
  disabled = false,
}) => {
  const clamp = (val: number): number => {
    if (isNaN(val)) return min;
    return Math.max(min, Math.min(max, Math.round(val)));
  };

  const handleDecrement = () => {
    if (disabled) return;
    onChange(clamp(value - 1));
  };

  const handleIncrement = () => {
    if (disabled) return;
    onChange(clamp(value + 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      // Allow clearing while typing
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      onChange(clamp(num));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    onChange(clamp(isNaN(num) ? min : num));
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {/* Minus Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="pixel-btn pixel-btn-secondary"
        style={{
          width: '36px',
          height: '36px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Quietpage, monospace',
          fontSize: '20px',
          lineHeight: '1',
          cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
          opacity: disabled || value <= min ? 0.5 : 1,
        }}
      >
        −
      </button>

      {/* Direct Input Field */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#241a2e',
          border: '2px solid #1b1423',
          padding: '2px 8px',
          height: '36px',
          boxSizing: 'border-box',
        }}
      >
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          style={{
            width: '42px',
            fontFamily: 'Quietpage, monospace',
            fontSize: '20px',
            color: '#ffe2a0',
            backgroundColor: 'transparent',
            border: 'none',
            textAlign: 'center',
            outline: 'none',
            appearance: 'textfield',
            MozAppearance: 'textfield',
            margin: 0,
            padding: 0,
          }}
        />
        {unit && (
          <span
            className="px-10"
            style={{
              color: '#b9a98a',
              marginLeft: '2px',
              userSelect: 'none',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Plus Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="pixel-btn pixel-btn-secondary"
        style={{
          width: '36px',
          height: '36px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Quietpage, monospace',
          fontSize: '20px',
          lineHeight: '1',
          cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
          opacity: disabled || value >= max ? 0.5 : 1,
        }}
      >
        +
      </button>
    </div>
  );
};
