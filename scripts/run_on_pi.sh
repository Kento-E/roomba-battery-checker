#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

# sudo なしで導入した Node.js を優先的に参照
export PATH="${HOME}/.local/bin:${PATH}"

if [[ -f "${HOME}/.nvm/nvm.sh" ]]; then
  # nvm利用時は非対話シェルでもnpmを使えるよう読み込む
  # shellcheck disable=SC1090
  source "${HOME}/.nvm/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm が見つかりません。scripts/setup_pi_runtime.sh を先に実行してください。" >&2
  exit 1
fi

export RUN_CONTINUOUS=true

npm run check-battery -- --daemon
