import type { ButtonHTMLAttributes } from 'react';

export default function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 py-2.5 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-civic-blue focus:ring-offset-2';
  const variants = {
    primary:   'bg-civic-blue text-white shadow-sm hover:bg-civic-blue-dark hover:shadow-md',
    secondary: 'border-2 border-civic-blue text-civic-blue bg-transparent hover:bg-civic-blue-light',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
