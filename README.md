# Memory Worlds

## Playable prototype (client-only vertical slice)

Stack: Vite + React + TypeScript + three.js. No backend, no API keys.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm test         # deterministic mood/Spotify-parser tests
```

Flow: write the day → optional photo/video + Spotify link → "Imagine this day" → review mood → walk the house (WASD/arrows, E to interact; touch joystick on phones), collect fragments, place them in the memory box, close it → the house transforms → explore and read memory objects → world auto-saves; reopen from *Saved worlds*.

| Feature | Status |
|---|---|
| Mood interpretation | **Local fallback**: keyword rules + 6 hand-made presets (`src/lib/presets.ts`). No AI model runs; the UI says so. |
| Spotify | Official embed player for a pasted link/URI only; loads only on click. No search/auth, no scraping. |
| Photo / video | Local only; downscaled still (video → one frame) stored in `localStorage`. |
| Persistence | `localStorage` (`src/lib/storage.ts`); quota/corruption errors are shown. |
| Visual tokens | `:root` in `src/styles.css` (UI) and `src/lib/presets.ts` (worlds). |

Limitations: video isn't played in-world (still frame only); single house layout; English UI; mood rules are keyword-based (English + some Russian); the genesis-exe.com reference could not be fetched from the build sandbox, so the look is an original design assumption. Release/deploy and the Next.js/FastAPI/Supabase plan below remain future work.

---
# Пакет планирования

Этот каталог — **план разработки проекта Memory Worlds**, а не реализация игры. Он собран по материалам MEMORY_WORLDS_MASTER_PLAN.md. Игровой прототип и состояние будущего репозитория не проверялись; все пути, API, роли и архитектурные решения здесь помечены как планируемые.

## С чего начать

1. Прочитай PROJECT_PLAN.md — цель, MVP, сроки и разделение ролей.
2. Открой TASKS_BY_FILE.md — что создавать по этапам и в каких файлах.
3. Используй PROGRESS.md как рабочий список задач и журнал сессий.
4. Перед началом кодирования адаптируй ARCHITECTURE.md к реальному репозиторию.
5. AGENTS.md задаёт правила работы над проектом.
6. IDEAS.md хранит идеи, которые нельзя незаметно добавлять в MVP.

## Файлы пакета

- PROJECT_PLAN.md — продукт, обязательные результаты, этапы 19–22 ноября 2026 года, роли и риски.
- TASKS_BY_FILE.md — целевое дерево репозитория, задачи по файлам и критерии готовности.
- PROGRESS.md — начальный статус и дорожная карта MW-001—MW-012.
- ARCHITECTURE.md — предложенная система, данные, API и границы доверия.
- AGENTS.md — рабочий контракт для участников и AI-кодировщиков.
- IDEAS.md — идеи с приоритетами, оценкой сложности и причиной отложения.

## Ключевая идея

Memory Worlds превращает текст, фотографии и музыку реального дня в короткую интерактивную 3D-диораму. LLM трактует смысл и возвращает ограниченные данные; детерминированный движок строит сцену из заранее утверждённых окружений и объектов. Сохранённая сцена открывается из архива без повторной генерации.

## Принятые в исходном плане решения

- Веб-приложение: Next.js, TypeScript, React Three Fiber и Drei.
- Сервер: FastAPI и Pydantic; мультимодальный анализ — Gemini.
- Данные и медиа: Supabase Postgres и Storage.
- MVP-окружения: парк, комната, город.
- MVP-взаимодействие: исследовать сцену, открыть два артефакта памяти, увидеть завершение.
- Приоритет: законченный вертикальный путь и надёжный архив, а не бесконечный генератор миров.

## Статус и границы

На момент создания пакета подготовлены только плановые документы. Это **не подтверждает**, что проектный код, база, API, тесты или развёртывание уже существуют. Перед отметкой любого пункта как готового проверь соответствующий код и критерий приёмки.

Источник: MEMORY_WORLDS_MASTER_PLAN.md, приложенный пользователем. Официальные требования конкурса и рекомендованные технические решения в исходном документе разделены; это различие сохранено в планах ниже.

