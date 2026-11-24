import React, { useRef } from 'react';

const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

interface RoomCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
}

export const RoomCodeInput: React.FC<RoomCodeInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into 6 slots
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    if (!raw) {
      // Clear this slot
      const next = chars.map((c, i) => (i === index ? '' : c)).join('');
      onChange(next);
      return;
    }

    const lastChar = raw[raw.length - 1];
    if (ALLOWED_CHARS.includes(lastChar)) {
      const nextChars = [...chars];
      nextChars[index] = lastChar;
      const next = nextChars.join('');
      onChange(next);

      // Auto-advance to next input
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!chars[index] && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
        const nextChars = [...chars];
        nextChars[index - 1] = '';
        onChange(nextChars.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit) onSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    // Filter only valid allowed characters
    const validPasted = Array.from(pasted)
      .filter((ch) => ALLOWED_CHARS.includes(ch))
      .slice(0, 6)
      .join('');

    if (validPasted) {
      onChange(validPasted);
      const nextFocus = Math.min(5, validPasted.length);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPaste={handlePaste}
    >
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={2}
          value={char}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          style={{
            width: '38px',
            height: '46px',
            fontFamily: 'Quietpage, monospace',
            fontSize: '30px',
            textAlign: 'center',
            backgroundColor: '#f6edc8',
            color: '#1b1423',
            border: '3px solid #1b1423',
            boxShadow: char ? 'inset 0 -4px #d4a24c' : 'none',
            outline: 'none',
            imageRendering: 'pixelated',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
};
