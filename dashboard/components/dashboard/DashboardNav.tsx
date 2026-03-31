'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { ACCESS_LEVELS } from '@/lib/auth';
import {
  BarChart2,
  ClipboardList,
  Users,
  Hammer,
  Car,
  CreditCard,
  FileText,
  Ticket,
  Theater,
  HelpCircle,
  FolderOpen,
  Settings,
  LogOut,
  Shield,
  StickyNote,
  Lock,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  minLevel: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',                label: 'Statystyki',   icon: BarChart2,     minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/podania',        label: 'Podania',      icon: ClipboardList, minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/gracze',         label: 'Gracze',       icon: Users,         minLevel: ACCESS_LEVELS.MOD    },
  { href: '/dashboard/moderacja',      label: 'Moderacja',    icon: Hammer,        minLevel: ACCESS_LEVELS.MOD    },
  { href: '/dashboard/notatki',        label: 'Notatki',      icon: StickyNote,    minLevel: ACCESS_LEVELS.MOD    },
  { href: '/dashboard/zatrzymani',     label: 'Zatrzymani',   icon: Lock,          minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/sluzby',         label: 'Służby',       icon: Shield,        minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/pojazdy',        label: 'Pojazdy',      icon: Car,           minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/prawa-jazdy',    label: 'Prawa jazdy',  icon: CreditCard,    minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/mandaty',        label: 'Mandaty',      icon: FileText,      minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/tickety',        label: 'Tickety',      icon: Ticket,        minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/sesje',          label: 'Sesje',        icon: Theater,       minLevel: ACCESS_LEVELS.HELPER },
  { href: '/dashboard/quiz',           label: 'Quiz',         icon: HelpCircle,    minLevel: ACCESS_LEVELS.ADMIN  },
  { href: '/dashboard/logi',           label: 'Logi',         icon: FolderOpen,    minLevel: ACCESS_LEVELS.ADMIN  },
  { href: '/dashboard/ustawienia',     label: 'Ustawienia',   icon: Settings,      minLevel: ACCESS_LEVELS.OWNER  },
];

export function DashboardNav({ session }: { session: Session }) {
  const pathname = usePathname();
  const userLevel = session.user.accessLevel ?? 0;

  const visibleItems = NAV_ITEMS.filter((item) => userLevel >= item.minLevel);

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-card border-r border-border h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm shrink-0">
            G
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Greenville RP</p>
            <p className="text-xs text-muted-foreground">Panel Staffu</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt="avatar"
              className="w-8 h-8 rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
              {session.user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              <LevelBadge level={userLevel} />
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}

function LevelBadge({ level }: { level: number }) {
  const labels: Record<number, string> = {
    0: 'Brak dostępu',
    1: 'Helper',
    2: 'Moderator',
    3: 'Administrator',
    4: 'Owner',
  };
  return <span>{labels[level] ?? 'Helper'}</span>;
}
