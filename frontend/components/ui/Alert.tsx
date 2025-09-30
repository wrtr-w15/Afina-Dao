import { HTMLAttributes, forwardRef } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import Button from './Button';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, children, dismissible = false, onDismiss, ...props }, ref) => {
    const variantClasses = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
    };

    const iconClasses = {
      info: 'text-blue-400',
      success: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400',
    };

    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertCircle,
      error: AlertCircle,
    };

    const Icon = icons[variant];

    return (
      <div
        className={clsx(
          'rounded-lg border p-4',
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <Icon className={clsx('h-5 w-5', iconClasses[variant])} />
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className="text-sm font-medium">{title}</h3>
            )}
            <div className={clsx('text-sm', { 'mt-1': title })}>
              {children}
            </div>
          </div>
          {dismissible && (
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="p-1.5"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };
export default Alert;
