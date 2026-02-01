# Настройка Google Drive API

## Описание

Интеграция с Google Drive API позволяет автоматически выдавать доступ к указанной папке на Google Drive пользователям с активной подпиской. Доступ предоставляется с правами только на просмотр (без возможности редактирования).

## Шаги настройки

### 1. Создание Service Account в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **IAM & Admin** → **Service Accounts**
4. Нажмите **Create Service Account**
5. Заполните:
   - **Service account name**: `afina-dao-drive-access`
   - **Service account ID**: автоматически сгенерируется
   - **Description**: `Service account for granting Google Drive folder access`
6. Нажмите **Create and Continue**
7. Пропустите шаг "Grant this service account access to project" (нажмите **Continue**)
8. Нажмите **Done**

### 2. Создание ключа Service Account

1. Найдите созданный Service Account в списке
2. Нажмите на него
3. Перейдите на вкладку **Keys**
4. Нажмите **Add Key** → **Create new key**
5. Выберите формат **JSON**
6. Нажмите **Create**
7. JSON файл автоматически скачается

### 3. Настройка доступа к папке на Google Drive

1. Откройте скачанный JSON файл
2. Найдите поле `client_email` (например, `afina-dao-drive-access@project-id.iam.gserviceaccount.com`)
3. Откройте Google Drive и найдите папку, к которой нужно предоставлять доступ
4. Правой кнопкой мыши на папке → **Поделиться** (Share)
5. В поле "Добавить людей и группы" введите email из `client_email`
6. Выберите роль **Просмотр** (Viewer) - только просмотр, без редактирования
7. **Снимите галочку** "Уведомить людей" (Notify people)
8. Нажмите **Поделиться** (Share)

### 4. Получение ID папки

1. Откройте папку на Google Drive
2. Скопируйте ID из URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
   Где `FOLDER_ID_HERE` - это ID папки

### 5. Настройка переменных окружения

Откройте файл `.env.local` и добавьте:

```env
# Google Drive API Configuration
# ID папки на Google Drive, к которой будет предоставляться доступ
GOOGLE_DRIVE_FOLDER_ID=ваш_folder_id_здесь

# JSON содержимое Service Account ключа (весь JSON в одну строку)
# Откройте скачанный JSON файл и скопируйте всё содержимое
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Важно:**
- `GOOGLE_SERVICE_ACCOUNT_JSON` должен содержать весь JSON в одну строку
- Не добавляйте переносы строк
- Если JSON содержит кавычки, они должны быть экранированы или использоваться одинарные кавычки снаружи

### Альтернативный способ (Base64)

Если возникают проблемы с экранированием JSON, можно использовать Base64:

```bash
# Конвертируйте JSON в Base64
cat service-account-key.json | base64
```

И затем в `.env.local`:
```env
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64_encoded_json>
```

(Потребуется обновить код для декодирования Base64)

## Как это работает

1. **При активации подписки:**
   - Система проверяет наличие `google_drive_email` у пользователя
   - Если email указан, вызывается Google Drive API для выдачи доступа к папке
   - Доступ предоставляется с ролью `reader` (только просмотр)

2. **При сохранении Google Drive email:**
   - Если у пользователя уже есть активная подписка, доступ выдается автоматически

3. **При отключении Google Drive email:**
   - Доступ к папке автоматически отзывается

4. **При отмене/истечении подписки:**
   - Доступ к Google Drive автоматически отзывается

## Проверка работы

1. Убедитесь, что переменные окружения установлены
2. Создайте тестовую подписку с указанным Google Drive email
3. Проверьте, что пользователь получил доступ к папке на Google Drive
4. Проверьте логи сервера на наличие ошибок

## Troubleshooting

### Ошибка: "GOOGLE_DRIVE_FOLDER_ID is not set"
- Проверьте, что переменная `GOOGLE_DRIVE_FOLDER_ID` установлена в `.env.local`
- Перезапустите сервер после изменения `.env.local`

### Ошибка: "Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON"
- Убедитесь, что JSON валидный
- Проверьте, что весь JSON в одной строке
- Убедитесь, что кавычки правильно экранированы

### Ошибка: "Permission denied" или "Access denied"
- Убедитесь, что Service Account email добавлен в папку с правами просмотра
- Проверьте, что папка существует и доступна

### Доступ не выдается автоматически
- Проверьте логи сервера
- Убедитесь, что у пользователя есть активная подписка
- Проверьте, что `google_drive_email` указан в профиле пользователя
