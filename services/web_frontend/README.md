# 🎨 Web Frontend (React 19 & TypeScript)

Современный веб-интерфейс корпоративного справочника сотрудников с адаптивным дизайном, поддержкой Glassmorphism и реактивным обновлением в реальном времени.

---

## 🛠️ Стек технологий

* **Фреймворк и сборка:** React 19, TypeScript, Vite 7
* **Стилизация:** Tailwind CSS 4, Radix UI primitives, Lucide Icons
* **Анимации:** `motion/react` (Framer Motion)
* **Управление состоянием:** Zustand + `persist` middleware
* **Сетевой слой:** Axios (управление сессиями через HttpOnly Cookies, CSRF, автоматический refresh токенов)
* **Шлюз / Сервер статики:** Nginx (HTTP/2, SSL termination, HSTS, Security Headers)

---

## 📂 Структура проекта

```text
services/web_frontend/
├── src/
│   ├── components/          # Компоненты UI (EmployeeCard, SearchBar, GatekeeperModal, AdminPanel)
│   ├── hooks/               # Кастомные React-хуки (useWebSocket, useDebounce, usePresence)
│   ├── store/               # Zustand сторы состояния (authStore, appStore, filtersStore)
│   ├── services/            # Axios API клиенты и интерцепторы
│   ├── types/               # TypeScript интерфейсы и типы
│   ├── App.tsx              # Корневой компонент приложения
│   └── main.tsx             # Точка монтирования React DOM
├── mock-plugin.ts           # Встроенный мок-бэкенд для автономной разработки
├── vite.config.ts           # Конфигурация сборщика Vite
└── package.json             # Зависимости и npm-скрипты
```

---

## ⚙️ Ключевые возможности

1. **Адаптивная пагинация без скролла**:
   * Сетка динамически рассчитывает оптимальное количество карточек сотрудников на основе высоты экрана без появления вертикального скролла страницы (Full HD, 2K, Ultrawide).
2. **Glassmorphism & Дизайн**:
   * Чистый стиль в духе Apple (мягкие тени, скругления 24px для карточек, полупрозрачные акцентные кнопки, аватары с инициалами на основе детерминированных цветов).
3. **Умный поиск (Type-to-Search)**:
   * Полнотекстовый и нечеткий поиск в шапке с поддержкой глобального фокуса по нажатию любой клавиши.
4. **Реактивность (WebSockets)**:
   * Мгновенная доставка статусов присутствия сотрудников и обновлений профилей без HTTP-поллинга.

---

## 🧠 Архитектура состояния и производительность (Zustand)

Для предотвращения лишних ререндеров компонентов при обновлении общего стора `useAppStore`:
1. Всегда используйте селекторы для выбора конкретных свойств.
2. При выборке нескольких полей используйте хук `useShallow`:

```typescript
import { useShallow } from 'zustand/react/shallow';

const { currentUser, isAuthenticated } = useAppStore(
  useShallow((state) => ({
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
  }))
);
```

---

## ⚡ Локальный запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск сервера разработки
```bash
npm run dev
```

### 3. Автономный режим с Mock-бэкендом
В Vite встроен плагин моков `mock-plugin.ts`. При локальном запуске `npm run dev` запросы `/api/v1/` перехватываются мок-сервером, что позволяет вести разработку интерфейса без поднятого backend-сервера и Active Directory. Для переключения на реальный бэкенд настройте проксирование в `vite.config.ts`.