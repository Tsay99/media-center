# Медиа Центр

Локальное веб-приложение для простого учета публикаций SMM-менеджера: общий дашборд по продуктам, отметки за сегодня, календарь публикаций и месячный план-факт по соцсетям.

## Что реализовано

- Главная — общий дашборд по продуктам и соцсетям.
- Сегодня — быстрая отметка продукта, типа контента и одной или нескольких соцсетей.
- Календарь — только дни и названия публикаций.
- Календарь — рабочий планировщик: клик по пустому дню добавляет план, клик по записи открывает редактирование, drag-and-drop меняет дату, доступно удаление.
- План-факт — редактируемая матрица «продукт × соцсеть».
- Настройка справочников продуктов и соцсетей в компактном окне.
- Порядок продуктов и соцсетей меняется стрелками вверх/вниз.
- Архивирование без удаления старой статистики.
- XLSX-экспорт матрицы плана и списка публикаций.
- При заполненных переменных Supabase данные общей рабочей области синхронизируются между устройствами; localStorage остается локальным резервом.

## Стек

Next.js 16, App Router, TypeScript, Tailwind CSS, Lucide, date-fns, Zod, React Hook Form, dnd-kit и XLSX.

## Запуск

```powershell
cd D:\media-center
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

Проверки:

```powershell
npm run lint
npm run typecheck
npm run build
```

## Данные и Supabase

Для общей версии создайте проект Supabase и добавьте пользователей владельца и дизайнера в Authentication → Users. Пароли хранятся только в Supabase Auth и никогда не добавляются в репозиторий или клиентский код. Замените `OWNER_EMAIL` в `database/002_shared_workspace.sql` на email владельца и выполните миграции `database/001_initial_schema.sql` и `database/002_shared_workspace.sql` в SQL Editor. Затем создайте `.env.local` на основе `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_OWNER_EMAIL=
NEXT_PUBLIC_DESIGNER_EMAIL=
```

В браузер можно передавать только URL и publishable/anon key при включенном Row Level Security. `service_role`/secret key не добавляйте в клиентский код.

Демо-данные можно удалить кнопкой очистки данных в будущей версии или очистив ключ `content-plan-fact-local-v1` в DevTools → Application → Local Storage.

## Vercel

Проект `content-plan-fact` подключён к GitHub-репозиторию `Tsay99/media-center`. GitHub — источник истины: Preview создаётся для pull request, а production — после merge в `main`. Вручную `vercel --prod` используйте только для аварийного восстановления или rollback.

В Project Settings → Environment Variables должны быть добавлены переменные Supabase и email дизайнера для Production, Preview и Development. После этого каждый Git-деплой собирает Next.js с общей базой.

## Структура

```text
src/app/                         Next.js App Router и глобальные стили
src/components/                 основной интерактивный интерфейс
src/lib/types.ts                доменные типы и справочники
src/lib/demo-data.ts            демо-данные и планы
database/001_initial_schema.sql базовая нормализованная схема и RLS
database/002_shared_workspace.sql общая рабочая область, Supabase Auth и публичное чтение
```

## Вторая версия

Подключение Supabase Auth и облачной синхронизации, публичный read-only режим по ссылке, push/email-уведомления, загрузка медиа, расширенные отчеты и повторные публикации с историей.
