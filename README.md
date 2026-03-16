# QTIM — REST API

NestJS REST API с JWT-аутентификацией, CRUD статей, PostgreSQL и Redis-кэшированием.

## Стек

- **NestJS** — фреймворк
- **PostgreSQL** — база данных (TypeORM)
- **Redis** — кэширование
- **JWT** — аутентификация
- **Docker** — контейнеризация

## Запуск

### Docker (рекомендуется)

```bash
docker-compose up --build
```

Поднимает postgres, redis и приложение. API доступен на `http://localhost:3000`.

### Локально

```bash
# 1. Поднять postgres и redis
docker-compose up postgres redis -d

# 2. Установить зависимости
npm install --legacy-peer-deps

# 3. Применить миграции
npm run migration:run

# 4. (Опционально) Заполнить тестовыми данными
npm run seed

# 5. Запустить
npm run start:dev
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run start:dev` | Запуск в dev-режиме (watch) |
| `npm run build` | Сборка проекта |
| `npm run start:prod` | Запуск production |
| `npm run migration:run` | Применить миграции |
| `npm run migration:revert` | Откатить последнюю миграцию |
| `npm run seed` | Заполнить БД тестовыми данными (faker) |
| `npm test` | Запуск unit-тестов |
| `npm run test:cov` | Тесты с покрытием |

## API

### Аутентификация

#### POST /auth/register

Регистрация нового пользователя.

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","name":"John"}'
```

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIs..." }
```

| Поле | Тип | Обязательно | Валидация |
|------|-----|-------------|-----------|
| email | string | да | email формат |
| password | string | да | min 6 символов |
| name | string | да | min 2 символа |

#### POST /auth/login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'
```

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIs..." }
```

---

### Статьи

> Токен передаётся в заголовке: `Authorization: Bearer <token>`

#### GET /articles

Список статей с пагинацией и фильтрацией. **Публичный.**

```bash
curl "http://localhost:3000/articles?page=1&limit=5&authorName=John&search=NestJS"
```

Query-параметры:

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| page | number | 1 | Номер страницы |
| limit | number | 10 | Кол-во на странице |
| authorId | number | — | Фильтр по ID автора |
| authorName | string | — | Поиск по имени автора (ILIKE) |
| publishedFrom | ISO date | — | Дата публикации от |
| publishedTo | ISO date | — | Дата публикации до |
| search | string | — | Поиск по title и description |

Ответ:

```json
{
  "data": [
    {
      "id": 1,
      "title": "...",
      "description": "...",
      "publishedAt": "2025-01-10T00:00:00.000Z",
      "authorId": 1,
      "author": { "id": 1, "email": "...", "name": "..." },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "total": 30,
    "page": 1,
    "limit": 5,
    "totalPages": 6
  }
}
```

#### GET /articles/:id

Получение статьи по ID. **Публичный.**

```bash
curl http://localhost:3000/articles/1
```

#### POST /articles

Создание статьи. **Требуется JWT.**

```bash
curl -X POST http://localhost:3000/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Моя статья","description":"Подробное описание статьи"}'
```

| Поле | Тип | Обязательно | Валидация |
|------|-----|-------------|-----------|
| title | string | да | min 3 символа |
| description | string | да | min 10 символов |
| publishedAt | ISO date | нет | по умолчанию now() |

#### PUT /articles/:id

Обновление статьи. **Требуется JWT.**

```bash
curl -X PUT http://localhost:3000/articles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Обновлённый заголовок"}'
```

Все поля опциональны — передаются только изменяемые.

#### DELETE /articles/:id

Удаление статьи. **Требуется JWT.**

```bash
curl -X DELETE http://localhost:3000/articles/1 \
  -H "Authorization: Bearer <token>"
```

---

### Коды ответов

| Код | Описание |
|-----|----------|
| 200 | Успех |
| 201 | Создано |
| 400 | Ошибка валидации |
| 401 | Не авторизован / неверные credentials |
| 404 | Не найдено |
| 409 | Конфликт (email уже зарегистрирован) |

## Кэширование

Результаты GET-запросов к статьям кэшируются в Redis (TTL 60 сек). Кэш автоматически сбрасывается при создании, обновлении или удалении статьи.