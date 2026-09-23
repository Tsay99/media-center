# Рабочий процесс vibe coding

Полные правила находятся в WORKFLOW.md, приоритеты — в ROADMAP.md.

Проект развивается через маленькие проверяемые изменения. Главный агент координирует архитектуру и review, а параллельные агенты работают в отдельных worktree и ветках.

```text
задача → codex/* worktree → изменения → typecheck/lint/build
      → pull request → Vercel Preview → review → merge в main
      → Vercel Production
```

## Ветка и worktree

```powershell
git fetch origin
git merge --ff-only origin/main
git worktree add ..\media-center-calendar -b codex/calendar-filters origin/main
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

## Текущее состояние интеграции

- GitHub remote: `https://github.com/Tsay99/media-center.git`.
- Основная ветка: `main`; локальная ветка отслеживает `origin/main`.
- Vercel-проект: `content-plan-fact` в команде `tsays-projects`.
- GitHub-репозиторий подключён к Vercel Git Integration.
- Production обновляется после merge/push в `main`; pull request получает отдельный Preview Deployment.

Проверяйте подключение перед релизом в Vercel: в проекте должна отображаться отметка `Connected Git Repository`. Если Vercel запрашивает обновление разрешений GitHub App, подтвердите доступ к репозиторию `Tsay99/media-center`.
