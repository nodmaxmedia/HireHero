import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0 – 5
}

const LEVELS = [
  { label: '',       bars: 0, bar: 'bg-gray-200',    text: ''                  },
  { label: 'Weak',   bars: 1, bar: 'bg-red-400',     text: 'text-red-500'      },
  { label: 'Fair',   bars: 2, bar: 'bg-orange-400',  text: 'text-orange-500'   },
  { label: 'Good',   bars: 3, bar: 'bg-yellow-400',  text: 'text-yellow-600'   },
  { label: 'Strong', bars: 4, bar: 'bg-green-500',   text: 'text-green-600'    },
];

function strengthLevel(score) {
  if (score === 0) return 0;
  if (score === 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  return 4;
}

function StrengthBar({ password }) {
  if (!password) return null;
  const level = strengthLevel(getStrength(password));
  const { label, bars, bar, text } = LEVELS[level];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= bars ? bar : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {label && <p className={`text-xs font-medium ${text}`}>{label}</p>}
    </div>
  );
}

/**
 * Props:
 *   label        – field label text (optional)
 *   name         – input name attribute
 *   value        – controlled value
 *   onChange     – change handler
 *   placeholder  – placeholder text
 *   showStrength – show strength bar (default false)
 *   inputClassName – extra classes for the <input> element
 *   autoFocus    – forward autoFocus
 *   required     – forward required
 */
export default function PasswordInput({
  label,
  name,
  value,
  onChange,
  placeholder = 'Enter password',
  showStrength = false,
  inputClassName = '',
  autoFocus,
  required,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      {label && (
        <label className="text-sm text-gray-700 font-medium">{label}</label>
      )}
      <div className="relative mt-1">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          className={`w-full border border-gray-300 rounded-lg px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#005193] ${inputClassName}`}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && <StrengthBar password={value} />}
    </div>
  );
}
