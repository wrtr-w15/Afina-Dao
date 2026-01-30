#!/bin/bash
# Удаляет секреты из коммита e2d70550 в истории (для успешного push на GitHub)
# Запускать из корня репозитория: bash scripts/fix-secrets-in-history.sh

set -e
BAD="e2d7055066d81cf910a31c9c31f5fe2bf5ad1e21"

echo "Сохраняем текущий frontend/.env.example (без секретов) в /tmp/env_example_clean.txt"
cp frontend/.env.example /tmp/env_example_clean.txt

echo ""
echo "Запускаем интерактивный rebase. В открывшемся редакторе:"
echo "  - Найдите строку с коммитом $BAD (или его короткий хеш)"
echo "  - Замените слово 'pick' в начале этой строки на 'edit'"
echo "  - Сохраните файл и закройте редактор"
echo ""
read -p "Нажмите Enter, чтобы открыть редактор rebase..."

git rebase -i "${BAD}^"

echo ""
echo "Rebase остановился на коммите с секретами. Подменяем файл..."
cp /tmp/env_example_clean.txt frontend/.env.example
git add frontend/.env.example
git commit --amend --no-edit
git rebase --continue

echo ""
echo "Готово. Теперь выполните: git push --force-with-lease"
