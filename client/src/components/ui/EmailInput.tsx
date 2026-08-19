import React, { useState, useEffect } from 'react';
import { Input } from './Input';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  id?: string;
  name?: string;
}

const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com'
];

export const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  inputClassName = '',
  placeholder = 'your email',
  id,
  name
}) => {
  const [localPart, setLocalPart] = useState('');
  const [domainPart, setDomainPart] = useState(COMMON_DOMAINS[0]);
  const [isOther, setIsOther] = useState(false);
  const [customDomain, setCustomDomain] = useState('');

  // Sync internal state when external value changes (e.g. from autofill or parent reset)
  useEffect(() => {
    if (!value) {
      setLocalPart('');
      setDomainPart(COMMON_DOMAINS[0]);
      setIsOther(false);
      setCustomDomain('');
      return;
    }

    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      setLocalPart(value);
      setDomainPart(COMMON_DOMAINS[0]);
      setIsOther(false);
      setCustomDomain('');
    } else {
      const local = value.substring(0, atIndex);
      const domain = value.substring(atIndex + 1);
      setLocalPart(local);
      
      if (COMMON_DOMAINS.includes(domain)) {
        setDomainPart(domain);
        setIsOther(false);
        setCustomDomain('');
      } else {
        setDomainPart('other');
        setIsOther(true);
        setCustomDomain(domain);
      }
    }
  }, [value]);

  const updateEmail = (local: string, otherSelected: boolean, selectedDomain: string, customDom: string) => {
    const domain = otherSelected ? customDom.trim() : selectedDomain;
    if (local.trim()) {
      onChange(`${local.trim()}@${domain}`);
    } else {
      onChange('');
    }
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/@/g, ''); // prevent @ symbol in local part
    setLocalPart(val);
    updateEmail(val, isOther, domainPart, customDomain);
  };

  const handleDomainSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDomainPart(val);
    const otherSelected = val === 'other';
    setIsOther(otherSelected);
    updateEmail(localPart, otherSelected, val, customDomain);
  };

  const handleCustomDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/@/g, ''); // prevent @ symbol in custom domain
    setCustomDomain(val);
    updateEmail(localPart, isOther, domainPart, val);
  };

  return (
    <div className={`flex flex-col space-y-2 w-full ${className}`}>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full">
        {/* Local part input field */}
        <Input
          type="text"
          id={id}
          name={name}
          required={required}
          value={localPart}
          onChange={handleLocalChange}
          placeholder={placeholder}
          className={`flex-1 min-w-0 py-3 ${inputClassName}`}
        />
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-ink font-bold font-mono text-lg select-none">@</span>
          
          {/* Pre-populated common domains list */}
          <select
            value={domainPart}
            onChange={handleDomainSelectChange}
            className="px-2 py-3 bg-cream border-2 border-ink rounded-lg text-ink text-sm outline-none transition-colors focus:bg-accent-amber/10 focus:border-accent-amber font-mono font-bold select-none cursor-pointer w-[125px] sm:w-[140px] flex-shrink-0"
          >
            {COMMON_DOMAINS.map(dom => (
              <option key={dom} value={dom}>{dom}</option>
            ))}
            <option value="other">Other...</option>
          </select>
        </div>
      </div>

      {/* Editable input field for custom domains when "Other" is chosen */}
      {isOther && (
        <div className="w-full relative animate-fade-in">
          <Input
            type="text"
            required={required}
            value={customDomain}
            onChange={handleCustomDomainChange}
            placeholder="your-domain.com"
            className="pl-3"
          />
          <p className="text-[9px] text-ink/60 mt-1 font-mono uppercase tracking-wider pl-1 select-none">
            Type your custom domain (e.g. company.com)
          </p>
        </div>
      )}
    </div>
  );
};
