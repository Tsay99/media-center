---
name: media-center-vibe-coding
description: Проектный workflow для безопасной разработки Медиа Центра через ветки, worktree, проверки, PR и Vercel.
---

# Медиа Центр — project skill

Работай по цепочке:

```text
задача → отдельный worktree и codex/* → изменения → проверки → PR
      → Vercel Preview → review → merge в main → Vercel Production
```

Правила:

- `main` содержит production-состояние.
- Одна задача, один агент, один worktree и один PR.
- Не редактируй рабочую копию `main` напрямую для feature-задач.
- Не публикуй незакоммиченные изменения через `vercel --prod`.
- Используй npm и `package-lock.json`; не добавляй pnpm-lock или pnpm-workspace.
- Перед PR запускай `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` и `git diff --check`.
- UI, состояние и проверки разделяй между агентами, если задача достаточно большая.
- Несколько агентов не должны одновременно менять `src/components/content-plan-fact-app.tsx`; сначала выноси доменные разделы в отдельные компоненты.
- Секреты, пароли и service-role ключи не храни в клиентском коде и Git.

Коммиты — небольшие и смысловые, в формате Conventional Commits:

```text
feat(calendar): add multi-product filters
fix(sidebar): restore collapsed navigation
refactor(ui): extract shared page header
test(distribution): cover reels limits
```

Подробные команды и роли агентов находятся в `AGENTS.md` и `VIBE_CODING.md`.
