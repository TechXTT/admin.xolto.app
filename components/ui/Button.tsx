import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'muted';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const variantClass = variant === 'muted' ? 'btn muted' : 'btn';
  const mergedClass = className ? `${variantClass} ${className}` : variantClass;
  return <button {...props} className={mergedClass} />;
}
