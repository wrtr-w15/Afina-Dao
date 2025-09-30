# Sidebar Component

Удобный компонент сайдбара с билдером для создания навигации.

## Особенности

- 🎨 **Использует цвета из системы тем** - все цвета берутся из `styles/themes`
- 🏗️ **Удобный билдер** - создание сайдбара через цепочку методов
- 📱 **Адаптивность** - автоматическое сворачивание на мобильных
- 🎯 **Вложенные элементы** - поддержка многоуровневой навигации
- 💾 **Персистентность** - сохранение состояния в localStorage
- ⚡ **Производительность** - оптимизированные рендеры

## Быстрый старт

### 1. Простое использование

```tsx
import { Sidebar, SidebarBuilder } from '@/components/ui/Sidebar';

function MyPage() {
  const sidebarConfig = new SidebarBuilder()
    .width(280)
    .collapsedWidth(64)
    .addNavigationSection([
      {
        id: 'home',
        label: 'Home',
        icon: <Home className="h-5 w-5" />,
        href: '/',
      },
      {
        id: 'articles',
        label: 'Articles',
        icon: <BookOpen className="h-5 w-5" />,
        href: '/articles',
        badge: '12',
      },
    ])
    .build();

  return (
    <div className="flex h-screen">
      <Sidebar {...sidebarConfig.config} sections={sidebarConfig.sections} />
      <main className="flex-1 ml-72">Content</main>
    </div>
  );
}
```

### 2. С хуком useSidebar

```tsx
import { useSidebar } from '@/hooks/useSidebar';
import { Sidebar } from '@/components/ui/Sidebar';

function MyPage() {
  const sidebar = useSidebar({
    defaultCollapsed: false,
    width: 280,
    persistState: true,
  });

  return (
    <div className="flex h-screen">
      <Sidebar
        {...sidebar.config}
        collapsed={sidebar.collapsed}
        onCollapseChange={sidebar.toggle}
        sections={mySections}
      />
      <main className="flex-1">Content</main>
    </div>
  );
}
```

## API

### SidebarBuilder

#### Конфигурация
```tsx
const builder = new SidebarBuilder()
  .width(280)                    // Ширина развернутого сайдбара
  .collapsedWidth(64)           // Ширина свернутого сайдбара
  .position('fixed')             // 'fixed' | 'static'
  .variant('default')            // 'default' | 'compact' | 'minimal'
  .showToggle(true);             // Показывать кнопку сворачивания
```

#### Добавление секций
```tsx
// Простая секция
.addNavigationSection([
  { id: 'home', label: 'Home', icon: <Home />, href: '/' },
  { id: 'about', label: 'About', icon: <Info />, href: '/about' },
])

// Секция с категориями
.addCategoriesSection([
  {
    id: 'web-dev',
    label: 'Web Development',
    icon: <Code />,
    children: [
      { id: 'react', label: 'React', href: '/react' },
      { id: 'vue', label: 'Vue', href: '/vue' },
    ],
  },
])

// Секция настроек
.addSettingsSection([
  { id: 'profile', label: 'Profile', icon: <User />, href: '/profile' },
  { id: 'settings', label: 'Settings', icon: <Settings />, href: '/settings' },
])
```

#### Ручное добавление секций
```tsx
.addSection({
  id: 'custom',
  title: 'Custom Section',
  collapsible: true,
  defaultCollapsed: false,
  items: [
    { id: 'item1', label: 'Item 1', icon: <Icon />, href: '/item1' },
  ],
})
```

### Sidebar Props

```tsx
interface SidebarProps {
  children?: ReactNode;
  className?: string;
  width?: number;                    // Ширина развернутого
  collapsedWidth?: number;          // Ширина свернутого
  collapsed?: boolean;              // Свернут ли сайдбар
  onCollapseChange?: (collapsed: boolean) => void;
  sections?: SidebarSection[];      // Секции сайдбара
  onItemClick?: (item: SidebarItem) => void;
  activeItemId?: string;            // ID активного элемента
  showToggle?: boolean;             // Показывать кнопку сворачивания
  position?: 'fixed' | 'static';    // Позиционирование
  variant?: 'default' | 'compact' | 'minimal';
}
```

### SidebarItem

```tsx
interface SidebarItem {
  id: string;                       // Уникальный ID
  label: string;                    // Текст элемента
  icon?: ReactNode;                // Иконка
  href?: string;                    // Ссылка для навигации
  onClick?: () => void;            // Обработчик клика
  badge?: string | number;          // Значок/счетчик
  children?: SidebarItem[];        // Вложенные элементы
  disabled?: boolean;              // Заблокирован ли элемент
  active?: boolean;                // Активен ли элемент
}
```

### SidebarSection

```tsx
interface SidebarSection {
  id: string;                       // Уникальный ID секции
  title?: string;                   // Заголовок секции
  items: SidebarItem[];            // Элементы секции
  collapsible?: boolean;           // Можно ли сворачивать секцию
  defaultCollapsed?: boolean;      // Свернута по умолчанию
}
```

## Хуки

### useSidebar

```tsx
const sidebar = useSidebar({
  defaultCollapsed: false,
  width: 280,
  collapsedWidth: 64,
  position: 'fixed',
  variant: 'default',
  persistState: true,
  storageKey: 'sidebar-collapsed',
});

// Доступные свойства:
sidebar.collapsed          // Свернут ли сайдбар
sidebar.activeItemId       // ID активного элемента
sidebar.hoveredItemId      // ID наведенного элемента
sidebar.toggle()           // Переключить состояние
sidebar.collapse()         // Свернуть
sidebar.expand()           // Развернуть
sidebar.setActiveItem(id)  // Установить активный элемент
sidebar.setHoveredItem(id) // Установить наведенный элемент
sidebar.builder            // Экземпляр билдера
sidebar.config             // Конфигурация
```

### useResponsiveSidebar

```tsx
const sidebar = useResponsiveSidebar({
  defaultCollapsed: true,
});

// Дополнительные свойства:
sidebar.isMobile           // Мобильное устройство
sidebar.shouldShowOverlay  // Показывать оверлей
```

### useSidebarNavigation

```tsx
const sidebar = useSidebarNavigation(navigationItems, {
  defaultCollapsed: false,
});

// Дополнительные свойства:
sidebar.currentPath        // Текущий путь
sidebar.handleNavigation   // Обработчик навигации
```

## Стилизация

Все цвета автоматически берутся из системы тем:

```tsx
// Цвета доступны через currentTheme
const { currentTheme } = useTheme();

// Фон сайдбара
backgroundColor: currentTheme.background.primary

// Цвет текста
color: currentTheme.text.primary

// Цвет границы
borderColor: currentTheme.border.primary

// Цвет активного элемента
backgroundColor: currentTheme.components.sidebar.hover
```

## Примеры

### Полный пример с билдером

```tsx
import { Sidebar, SidebarBuilder } from '@/components/ui/Sidebar';
import { Home, BookOpen, Search, Settings, User } from 'lucide-react';

function App() {
  const sidebarConfig = new SidebarBuilder()
    .width(300)
    .collapsedWidth(80)
    .position('fixed')
    .variant('default')
    .showToggle(true)
    
    // Навигация
    .addNavigationSection([
      {
        id: 'home',
        label: 'Home',
        icon: <Home className="h-5 w-5" />,
        href: '/',
        active: true,
      },
      {
        id: 'articles',
        label: 'Articles',
        icon: <BookOpen className="h-5 w-5" />,
        href: '/articles',
        badge: '12',
      },
      {
        id: 'search',
        label: 'Search',
        icon: <Search className="h-5 w-5" />,
        href: '/search',
      },
    ])
    
    // Категории с вложенными элементами
    .addCategoriesSection([
      {
        id: 'getting-started',
        label: 'Getting Started',
        icon: <BookOpen className="h-5 w-5" />,
        href: '/category/getting-started',
        children: [
          {
            id: 'installation',
            label: 'Installation',
            href: '/category/getting-started/installation',
          },
          {
            id: 'configuration',
            label: 'Configuration',
            href: '/category/getting-started/configuration',
          },
        ],
      },
    ])
    
    // Настройки
    .addSettingsSection([
      {
        id: 'profile',
        label: 'Profile',
        icon: <User className="h-5 w-5" />,
        href: '/profile',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="h-5 w-5" />,
        href: '/settings',
      },
    ])
    
    .build();

  return (
    <div className="flex h-screen">
      <Sidebar
        {...sidebarConfig.config}
        sections={sidebarConfig.sections}
        onItemClick={(item) => console.log('Clicked:', item)}
        activeItemId="home"
      />
      
      <main className="flex-1 ml-80 p-6">
        <h1>Main Content</h1>
      </main>
    </div>
  );
}
```

### Адаптивный сайдбар

```tsx
import { useResponsiveSidebar } from '@/hooks/useSidebar';

function ResponsiveApp() {
  const sidebar = useResponsiveSidebar({
    defaultCollapsed: true,
  });

  return (
    <div className="flex h-screen">
      <Sidebar
        {...sidebar.config}
        collapsed={sidebar.collapsed}
        onCollapseChange={sidebar.toggle}
        sections={sections}
      />
      
      {sidebar.shouldShowOverlay && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={sidebar.collapse}
        />
      )}
      
      <main className="flex-1">Content</main>
    </div>
  );
}
```

## Лучшие практики

1. **Используйте билдер** для сложных сайдбаров
2. **Группируйте элементы** по логическим секциям
3. **Используйте хуки** для управления состоянием
4. **Добавляйте иконки** для лучшего UX
5. **Используйте бейджи** для уведомлений
6. **Делайте секции сворачиваемыми** для больших списков
7. **Тестируйте на мобильных** устройствах
