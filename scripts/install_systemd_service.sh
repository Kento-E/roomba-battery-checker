#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="roomba-battery-checker.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVICE_FILE="${REPO_ROOT}/deploy/systemd/${SERVICE_NAME}"

if [[ ! -f "${SERVICE_FILE}" ]]; then
  echo "サービス定義ファイルが見つかりません: ${SERVICE_FILE}" >&2
  exit 1
fi

echo "${SERVICE_NAME} を /etc/systemd/system に配置します"
sudo cp "${SERVICE_FILE}" "/etc/systemd/system/${SERVICE_NAME}"

echo "systemd を再読み込みします"
sudo systemctl daemon-reload

echo "${SERVICE_NAME} を有効化して起動します"
sudo systemctl enable --now "${SERVICE_NAME}"

echo "現在の状態"
sudo systemctl status "${SERVICE_NAME}" --no-pager
