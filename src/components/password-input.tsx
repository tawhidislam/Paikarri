import { useId, useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '@/lib/i18n';

export function PasswordInput({ id, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const tr = useT();

  return (
    <div className="password-input relative">
      <input {...props} id={inputId} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-primary hover:bg-stone-50"
        aria-label={tr(visible ? 'Hide password' : 'Show password')}
        aria-controls={inputId}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
