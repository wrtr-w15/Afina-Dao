import { BookOpen, DollarSign, LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  translationKey: string;
  href: string;
  icon: LucideIcon;
}

export interface MenuCategory {
  id: string;
  translationKey: string;
  items: MenuItem[];
}

export const menuConfig: MenuCategory[] = [
  {
    id: 'about',
    translationKey: 'aboutAfina',
    items: [
      {
        id: 'about-afina-dao',
        translationKey: 'aboutAfinaDAO',
        href: '/about',
        icon: BookOpen
      },
      {
        id: 'pricing',
        translationKey: 'pricing',
        href: '/pricing',
        icon: DollarSign
      }
    ]
  }
];

