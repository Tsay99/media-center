# Медиа Центр — правила разработки

## Источник истины

- `main` — единственная production-ветка.
- `codex/*` — короткоживущие ветки отдельных задач.
- Production не публикуется из незакоммиченного рабочего дерева.
- Vercel получает preview из веток и production после merge в `main` через Git Integration.
- CLI-деплой разрешён только для аварийного rollback или восстановления CI.

## Рабочий цикл задачи

1. Сначала описать задачу и критерии готовности.
2. Создать отдельную ветку и worktree:

   ```powershell
   git worktree add ..\media-center-<task> -b codex/<task> main
   ```

3. Один агент отвечает за одну задачу и один pull request.
4. Перед pull request выполнить:

   ```powershell
   npm ci
   npm run typecheck
   npm run lint
   npm run build
   git diff --check
   ```

5. Описать в PR пользовательский результат, проверки и возможные риски.
6. После review выполнить merge в `main`; Vercel сам создаст production deployment.

## Разделение ответственности

- UI-агент меняет компоненты, стили и responsive-поведение.
- Logic-агент меняет состояние, расчёты и бизнес-правила.
- QA-агент запускает проверки и проверяет сценарии.
- Review-агент анализирует diff и не изменяет файлы.

Не давайте нескольким агентам одновременно редактировать один большой компонент. При следующих задачах постепенно выносите календарь, задачи, нагрузку, настройки и общие компоненты в отдельные файлы.

## Коммиты

Используйте небольшие conventional commits:

```text
feat(calendar): add multi-product filters
fix(sidebar): restore collapsed navigation
refactor(ui): unify page headers
test(distribution): cover reels limits
```

## Ограничения

- Пакетный менеджер проекта — npm. Не добавляйте `pnpm-lock.yaml` или `pnpm-workspace.yaml`.
- Не меняйте API, схему базы и авторизацию без отдельной задачи и миграции.
- Секреты Supabase, Vercel и пароли не должны попадать в клиентский код или Git.
- Перед добавлением зависимости проверьте, нельзя ли использовать уже установленный UI kit.
