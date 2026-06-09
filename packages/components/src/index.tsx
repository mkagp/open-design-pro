import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={['od-button', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </button>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="od-visually-hidden">{children}</span>;
}
