import { BookOpen, DollarSign, Users, LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  translationKey: string;
  href: string;
  icon: LucideIcon;
  isNew?: boolean;
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
        id: 'private-community',
        translationKey: 'privateCommunity',
        href: '/private-community',
        icon: Users,
        isNew: true
      },
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

