# Рабочий процесс vibe coding

Проект развивается через маленькие проверяемые изменения. Главный агент координирует архитектуру и review, а параллельные агенты работают в отдельных worktree и ветках.

```text
задача → codex/* worktree → изменения → typecheck/lint/build
      → pull request → Vercel Preview → review → merge в main
      → Vercel Production
```

## Ветка и worktree

```powershell
git fetch origin
git worktree add ..\media-center-calendar -b codex/calendar-filters main
```

После завершения:

```powershell
git add .
git commit -m "feat(calendar): add multi-product filters"
git push -u origin codex/calendar-filters
```

## Проверки

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
git diff --check
```

## Публикация

GitHub — источник истины. Vercel Git Integration создаёт preview для pull request и production после merge в `main`. Прямой `vercel --prod` используйте только для аварийного восстановления или rollback.

## Текущие ограничения

Для завершения автоматической цепочки нужен GitHub remote и подключение репозитория к Vercel. До этого момента локальный Git-процесс и GitHub Actions уже подготовлены, но push и merge нельзя выполнить без адреса репозитория и доступа к нему.
