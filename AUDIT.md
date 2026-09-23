# Media Center — frontend audit

Дата аудита: 22 сентября 2026

## Контекст и критерии

Приложение — внутренний SaaS-инструмент для планирования, распределения и контроля контента по продуктам и социальным сетям. Главная задача интерфейса — быстро сканировать план, менять объёмы, видеть факт и переносить публикации по календарю.

Аудит выполнен без изменения API, схемы базы данных, авторизации и расчётной логики. За основу взяты:

- [PracticalSwan Frontend Design](https://github.com/PracticalSwan/agent-skills/blob/main/frontend-design/SKILL.md) — task fit, состояния, accessibility, responsive и rendered verification;
- [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) — осмысленная визуальная система вместо случайного SaaS-набора;
- [PyModel React Frontend Skills](https://github.com/PyModel/react-frontend-skills) — UI, React/Next.js и Vercel-oriented review;
- [Frontend Layout Implementer](https://github.com/ytvee-dev/webdev-agent-kit/blob/main/skills/frontend-layout-implementer/SKILL.md) — сохранение текущего стека и постепенная миграция общих компонентов;
- [SaaS Pipeline](https://github.com/ThomasPraun/saas-pipeline/blob/main/SKILL.md) — последовательность audit → design → implementation → verification;
- [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) — ориентир по SaaS-структуре, без копирования архитектуры в текущий продукт.

## Исходное состояние

### Архитектура

- Next.js 16 App Router с одной entry-page: `src/app/page.tsx`.
- Основной интерфейс собран в `src/components/content-plan-fact-app.tsx` как client-side SPA с переключением `view`.
- Рабочие режимы: Главная, Сегодня, Календарь, Нагрузка, Контент-план, Справочники.
- Состояние хранится в React state, localStorage и, если настроен Supabase, синхронизируется через `src/lib/supabase.ts`.
- Расчёт распределения вынесен в `src/lib/distribution-engine.ts`; типы — в `src/lib/types.ts`.

### Найденные проблемы визуального слоя

1. В одном приложении одновременно использовались raw Tailwind-значения, старые тёплые цвета, compatibility overrides и новая синяя тема.
2. Повторяющиеся кнопки, бейджи, поля, прогресс, модальные окна и селекты имели разные размеры, радиусы, границы и focus-состояния.
3. Motion был распределён между `motion/react`, CSS keyframes и локальными transition-классами без единого duration/easing-контракта.
4. Некоторые интерактивные элементы не имели полноценного keyboard/focus поведения; modal закрывался только кликом по крестику или backdrop.
5. `content-plan-fact-app.tsx` слишком большой: UI, state orchestration и несколько legacy-заготовок находятся в одном файле.
6. В проекте нет test script и автоматизированного визуального/e2e набора; есть typecheck, lint и build.

## Каноническая дизайн-система

Добавлен единый слой токенов в `src/app/globals.css`.

### Визуальный тезис

Спокойный операционный workspace: белые поверхности на холодном серо-голубом фоне, тёмная навигационная rail-панель, синий action-accent и семантические зелёный/жёлтый/красный состояния. Визуальная выразительность подчинена сканированию плана и статуса.

### Токены

- Цвета: `--app-bg`, `--app-surface`, `--app-surface-subtle`, `--app-border`, `--app-text`, `--app-text-muted`, `--app-accent`, `--app-success`, `--app-warning`, `--app-danger`.
- Радиусы: `--app-radius-sm`, `--app-radius-md`, `--app-radius-lg`, `--app-radius-xl`.
- Тени: `--app-shadow-sm`, `--app-shadow-md`.
- Motion: `--app-duration-fast`, `--app-duration-base`, `--app-duration-slow`, `--app-ease`.
- Focus: `--app-focus-ring`.

### Общие примитивы

- `.ui-button` и варианты `primary`, `secondary`, `ghost`, `danger`;
- `.ui-icon-button` для иконок с единым target-size;
- `.ui-badge` для статусов;
- `.ui-progress` для прогресса;
- `.ui-field` и `.ui-input` для форм;
- `.ui-section-title` для заголовков секций;
- `.ui-modal-overlay`, `.ui-modal`, `.ui-modal__header`, `.ui-modal__body`;
- `.ui-select__trigger`, `.ui-number-field-group`;
- `.ui-feature-bento` для блока нагрузки.

## Выполненные изменения

- Переведены shared Button, IconButton, Badge, Progress, Field, SectionTitle, Modal, PageHeader, MonthSwitcher и MetricCard на канонические классы.
- Все общие кнопки получили единый hover/active/disabled/focus контракт.
- Modal получил `role="dialog"`, `aria-modal`, `aria-labelledby`, закрытие по Escape и согласованное появление.
- Select получил единый визуальный контракт и открытие с клавиатуры через Enter/Space/ArrowDown/Escape; выбранный пункт сохраняет галочку в одной строке.
- Number field получил единый border/focus/hover стиль и согласованные размеры управляющих кнопок.
- Сформирована единая система коротких motion-переходов; добавлена поддержка `prefers-reduced-motion` для новых переходов.
- Нейтральные белые card/panel surfaces получили общие border/radius/shadow правила.
- Feature Bento на странице «Нагрузка» переведён с локального градиента на токенизированный стиль.
- Существующая бизнес-логика распределения, календаря, адаптаций, undo, ролей, Supabase/localStorage и радаров нагрузки не изменялась.

## Состояния и responsive

- Loading: существующий `AuthLoadingScreen` сохранён и использует единый loading indicator.
- Empty: существующие сообщения «нет плана», «нет публикаций», «добавьте продукты» сохранены; нейтральные поверхности теперь наследуют общие токены.
- Error/sync: существующий sync indicator и toast сохранены; toast получил единый surface/motion.
- Destructive actions: существующие подтверждения удаления и undo-поток сохранены.
- Responsive: сохранены desktop sidebar, mobile topbar, mobile menu, mobile calendar и responsive grids; shared controls не уменьшаются ниже доступного target-size.
- Reduced motion: новые dialog/popover/toast/button transitions отключаются или упрощаются через `prefers-reduced-motion`.

## Проверки

В проекте доступны:

```text
npm run typecheck
npm run lint
npm run build
npm run dev
```

Результат текущего прохода:

- `npm run typecheck` — passed;
- `npm run lint` — exit code 0, 12 предупреждений legacy-кода, 0 ошибок;
- `npm run build` — passed, Next.js 16.3.5 собрал статические маршруты `/` и `/_not-found`;
- `npm run dev -- --hostname 127.0.0.1` — сервер готов на `http://127.0.0.1:3000`;
- HTTP smoke-check `GET /` — `200`, title `Медиа Центр`, SSR-ответ содержит корневой shell приложения;
- test script в `package.json` отсутствует, поэтому тестовый runner не запускался.

## Оставшиеся архитектурные вопросы

1. Разделить `content-plan-fact-app.tsx` на feature-модули: shell/navigation, dashboard, today, calendar, plan, load, directory и shared dialogs.
2. Удалить подтверждённые legacy-функции `MonthDistributionDialog`, `WeekdayScheduleDialog`, `WeeklyDistributionDialog`, `ProductSchedulePanel` и `LegacyDirectoryModal` после отдельной проверки git-истории.
3. Вынести hardcoded owner/designer credentials из client bundle в безопасную auth-конфигурацию.
4. Добавить Vitest/unit tests для distribution engine и state reducers, а также e2e tests для критических путей план → календарь → факт → undo.
5. Перевести view state в URL/Next navigation, если потребуется deep-linking и восстановление состояния страницы.
6. Провести реальную visual QA на мобильной ширине, desktop, keyboard-only и screen reader. Браузерные инструменты в текущей задаче намеренно не использовались по запросу пользователя.

## Контрольный принцип

Дальше новые экраны должны использовать shared primitives и app tokens. Новые raw-цвета, отдельные radius/shadow системы и локальные modal/button реализации считаются design-system drift и должны отклоняться на code review.

## Follow-up: модуль «Задачи»

- Добавлен `TasksPage` внутри существующего shell с представлениями «Сегодня», «Все задачи» и Kanban.
- Ручные задачи хранятся отдельно от общего workspace state; календарные материалы показываются read-only-проекцией существующих `ContentItem`.
- Добавлены `database/003_personal_tasks.sql` с owner-scoped RLS и Supabase-адаптер в `src/lib/supabase.ts`.
- Полные правила дат, permissions, хранения и проверки зафиксированы в `TASKS_IMPLEMENTATION.md`.
