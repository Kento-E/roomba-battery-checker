#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-v20.19.0}"
ARCH="$(uname -m)"

case "${ARCH}" in
  aarch64)
    NODE_DIST="linux-arm64"
    ;;
  armv7l)
    NODE_DIST="linux-armv7l"
    ;;
  x86_64)
    NODE_DIST="linux-x64"
    ;;
  *)
    echo "未対応のアーキテクチャです: ${ARCH}" >&2
    exit 1
    ;;
esac

INSTALL_ROOT="${HOME}/.local"
INSTALL_DIR="${INSTALL_ROOT}/node-${NODE_VERSION}-${NODE_DIST}"
TARBALL="node-${NODE_VERSION}-${NODE_DIST}.tar.xz"
DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VERSION}/${TARBALL}"

mkdir -p "${INSTALL_ROOT}" "${INSTALL_ROOT}/bin"

if [[ ! -x "${INSTALL_DIR}/bin/node" ]]; then
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "${TMP_DIR}"' EXIT

  echo "Node.js をダウンロードします: ${DOWNLOAD_URL}"
  curl -fsSL "${DOWNLOAD_URL}" -o "${TMP_DIR}/${TARBALL}"

  echo "Node.js を展開します"
  tar -xJf "${TMP_DIR}/${TARBALL}" -C "${TMP_DIR}"

  rm -rf "${INSTALL_DIR}"
  mv "${TMP_DIR}/node-${NODE_VERSION}-${NODE_DIST}" "${INSTALL_DIR}"
fi

ln -sfn "${INSTALL_DIR}/bin/node" "${INSTALL_ROOT}/bin/node"
ln -sfn "${INSTALL_DIR}/bin/npm" "${INSTALL_ROOT}/bin/npm"
ln -sfn "${INSTALL_DIR}/bin/npx" "${INSTALL_ROOT}/bin/npx"

export PATH="${INSTALL_ROOT}/bin:${PATH}"

echo "Node.js セットアップ完了"
node -v
npm -v
