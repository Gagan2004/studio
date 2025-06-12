'use client';

import Link from 'next/link';
import { Bot, DatabaseZap, ClipboardEdit, Github } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Data Vault', icon: DatabaseZap },
  { href: '/autofill-tester', label: 'Autofill Tester', icon: ClipboardEdit },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Bot className="h-7 w-7 text-primary" />
          <span className="font-bold text-lg font-headline">Form AutoPilot</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm lg:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-foreground/80 flex items-center gap-2 px-3 py-2 rounded-md',
                pathname === item.href
                  ? 'text-foreground font-medium bg-muted'
                  : 'text-foreground/60'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com/your-repo/form-autopilot" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
