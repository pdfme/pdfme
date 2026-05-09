import { forwardRef, type ButtonHTMLAttributes } from 'react';

type PlaygroundButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary';

type PlaygroundButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
  variant?: PlaygroundButtonVariant;
};

const buttonVariants: Record<PlaygroundButtonVariant, string> = {
  danger: 'border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-300',
  ghost:
    'border-transparent bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-gray-300',
  primary: 'border-green-600 bg-green-600 text-white hover:bg-green-500 focus:ring-green-500',
  secondary: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const PlaygroundButton = forwardRef<HTMLButtonElement, PlaygroundButtonProps>(
  function PlaygroundButton(
    { className, fullWidth = false, type = 'button', variant = 'secondary', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={joinClassNames(
          'inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded border px-2 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:px-3',
          buttonVariants[variant],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      />
    );
  },
);

export default PlaygroundButton;
