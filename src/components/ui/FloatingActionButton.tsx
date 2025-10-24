import { Plus } from 'lucide-react';
import Link from 'next/link';

interface FloatingActionButtonProps {
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  title: string;
  className?: string;
}

export function FloatingActionButton({
  href,
  onClick,
  icon = <Plus className="h-6 w-6" />,
  title,
  className = '',
}: FloatingActionButtonProps) {
  const buttonClass = `fixed bottom-8 right-8 h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl hover:shadow-3xl transition-all flex items-center justify-center z-40 hover:scale-110 ${className}`;

  if (href) {
    return (
      <Link href={href} className={buttonClass} title={title}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={buttonClass}
      title={title}
    >
      {icon}
    </button>
  );
}
