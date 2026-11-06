'use client';

import React, { useState, useEffect, useId } from 'react';

export interface CountryPhoneConfig {
  country: string;
  code: string;
  flag: string;
  digits: number; // expected length of national number (without dial code)
  minDigits?: number;
  maxDigits?: number;
  example: string;
}

export const COUNTRY_PHONE_CONFIGS: CountryPhoneConfig[] = [
  { country: 'United Arab Emirates', code: '+971', flag: '🇦🇪', digits: 9, minDigits: 9, maxDigits: 9, example: '50 123 4567' },
  { country: 'Saudi Arabia', code: '+966', flag: '🇸🇦', digits: 9, minDigits: 9, maxDigits: 9, example: '50 123 4567' },
  { country: 'India', code: '+91', flag: '🇮🇳', digits: 10, minDigits: 10, maxDigits: 10, example: '98765 43210' },
  { country: 'Qatar', code: '+974', flag: '🇶🇦', digits: 8, minDigits: 8, maxDigits: 8, example: '3312 3456' },
  { country: 'Oman', code: '+968', flag: '🇴🇲', digits: 8, minDigits: 8, maxDigits: 8, example: '9123 4567' },
  { country: 'Kuwait', code: '+965', flag: '🇰🇼', digits: 8, minDigits: 8, maxDigits: 8, example: '9123 4567' },
  { country: 'Bahrain', code: '+973', flag: '🇧🇭', digits: 8, minDigits: 8, maxDigits: 8, example: '3912 3456' },
  { country: 'United States', code: '+1', flag: '🇺🇸', digits: 10, minDigits: 10, maxDigits: 10, example: '202 555 0123' },
  { country: 'United Kingdom', code: '+44', flag: '🇬🇧', digits: 10, minDigits: 10, maxDigits: 10, example: '7911 123456' },
  { country: 'Canada', code: '+1', flag: '🇨🇦', digits: 10, minDigits: 10, maxDigits: 10, example: '416 555 0123' },
  { country: 'Singapore', code: '+65', flag: '🇸🇬', digits: 8, minDigits: 8, maxDigits: 8, example: '8123 4567' },
  { country: 'Australia', code: '+61', flag: '🇦🇺', digits: 9, minDigits: 9, maxDigits: 9, example: '412 345 678' },
  { country: 'Malaysia', code: '+60', flag: '🇲🇾', digits: 10, minDigits: 9, maxDigits: 10, example: '12 345 6789' },
  { country: 'Germany', code: '+49', flag: '🇩🇪', digits: 10, minDigits: 10, maxDigits: 11, example: '151 23456789' },
  { country: 'Other Country', code: '+', flag: '🌍', digits: 10, minDigits: 7, maxDigits: 15, example: '1234567890' }
];

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string, isValid: boolean) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultCountryCode?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  defaultCountryCode = '+971',
  className = ''
}) => {
  const selectId = useId();

  // Parse initial value if present
  const parseInitial = () => {
    if (!value) return { code: defaultCountryCode, national: '' };
    for (const c of COUNTRY_PHONE_CONFIGS) {
      if (c.code !== '+' && value.startsWith(c.code)) {
        const national = value.slice(c.code.length).replace(/\D/g, '');
        return { code: c.code, national };
      }
    }
    return { code: defaultCountryCode, national: value.replace(/\D/g, '') };
  };

  const initial = parseInitial();
  const [selectedCode, setSelectedCode] = useState<string>(initial.code);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.national);
  const [touched, setTouched] = useState<boolean>(false);

  // Sync when value prop changes externally
  useEffect(() => {
    if (!value) {
      setNationalNumber('');
      return;
    }
    for (const c of COUNTRY_PHONE_CONFIGS) {
      if (c.code !== '+' && value.startsWith(c.code)) {
        setSelectedCode(c.code);
        setNationalNumber(value.slice(c.code.length).replace(/\D/g, ''));
        return;
      }
    }
    setNationalNumber(value.replace(/\D/g, ''));
  }, [value]);

  const currentConfig = COUNTRY_PHONE_CONFIGS.find(c => c.code === selectedCode) || COUNTRY_PHONE_CONFIGS[0];
  const maxAllowed = currentConfig.maxDigits || currentConfig.digits;
  const minRequired = currentConfig.minDigits || currentConfig.digits;

  const isValidLength = nationalNumber.length >= minRequired && nationalNumber.length <= maxAllowed;
  const isTooShort = nationalNumber.length > 0 && nationalNumber.length < minRequired;

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // STRICT RULE: Only digits allowed, no characters, no symbols, no spaces
    const digitsOnly = e.target.value.replace(/\D/g, '');
    
    // Limit to maximum allowed for this country
    const truncated = digitsOnly.slice(0, maxAllowed);
    setNationalNumber(truncated);
    setTouched(true);

    const full = truncated ? `${selectedCode} ${truncated}` : '';
    const valid = truncated.length >= minRequired && truncated.length <= maxAllowed;
    onChange(full, valid);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setSelectedCode(newCode);

    const newConfig = COUNTRY_PHONE_CONFIGS.find(c => c.code === newCode) || COUNTRY_PHONE_CONFIGS[0];
    const newMax = newConfig.maxDigits || newConfig.digits;
    const truncated = nationalNumber.slice(0, newMax);
    setNationalNumber(truncated);

    const full = truncated ? `${newCode} ${truncated}` : '';
    const newMin = newConfig.minDigits || newConfig.digits;
    const valid = truncated.length >= newMin && truncated.length <= newMax;
    onChange(full, valid);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="flex rounded-xl shadow-xs border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 bg-white transition overflow-hidden">
        {/* Country Code Dropdown */}
        <div className="relative bg-slate-100 border-r border-slate-300 flex items-center shrink-0">
          <select
            id={selectId}
            value={selectedCode}
            onChange={handleCountryChange}
            disabled={disabled}
            className="appearance-none bg-transparent pl-3 pr-7 py-2.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
          >
            {COUNTRY_PHONE_CONFIGS.map(c => (
              <option key={`${c.country}-${c.code}`} value={c.code}>
                {c.flag} {c.code} ({c.country})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 text-slate-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* Digits Only Input */}
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={nationalNumber}
          onChange={handleNumberChange}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          placeholder={`e.g. ${currentConfig.example}`}
          maxLength={maxAllowed}
          className="w-full px-3 py-2.5 text-xs font-mono font-medium text-slate-900 bg-transparent placeholder:text-slate-400 focus:outline-none"
        />

        {/* Validation indicator */}
        <div className="flex items-center pr-3 shrink-0">
          {isValidLength ? (
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              ✓
            </span>
          ) : isTooShort && touched ? (
            <span className="text-[10px] text-amber-600 font-semibold">
              {nationalNumber.length}/{minRequired}
            </span>
          ) : null}
        </div>
      </div>

      {/* Helper & Validation Messages */}
      <div className="flex items-center justify-between text-[11px] px-1">
        <span className="text-slate-500">
          {currentConfig.country}: exactly {minRequired} digits (digits only)
        </span>
        {isTooShort && touched && (
          <span className="text-red-600 font-semibold">
            Requires {minRequired} digits ({minRequired - nationalNumber.length} more needed)
          </span>
        )}
        {isValidLength && (
          <span className="text-emerald-700 font-semibold">
            ✓ Valid number
          </span>
        )}
      </div>
    </div>
  );
};
