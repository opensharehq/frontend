#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OSSUTIL_BIN="${OSSUTIL_BIN:-ossutilmac64}"
API_BASE_URL="${API_BASE_URL:-https://be.open-share.com/api/v1}"
BUILD_ONLY="${BUILD_ONLY:-0}"

CN_DIST_DIR="${PROJECT_DIR}/dist-cn"
GLOBAL_DIST_DIR="${PROJECT_DIR}/dist-global"

CN_OSS_CONFIG="${CN_OSS_CONFIG:-}"
CN_OSS_BUCKET="${CN_OSS_BUCKET:-}"
GLOBAL_OSS_CONFIG="${GLOBAL_OSS_CONFIG:-${HOME}/.ossutilconfig-openshare-hk}"
GLOBAL_OSS_BUCKET="${GLOBAL_OSS_BUCKET:-oss://openshare-com-front/}"

build_site() {
  local site="$1"
  local output_dir="$2"

  echo "Building ${site} site into ${output_dir} ..."
  VITE_FRONTEND_SITE="${site}" \
    VITE_API_BASE_URL="${API_BASE_URL}" \
    VITE_ATOMGIT_API_BASE_URL="${API_BASE_URL}" \
    npm run build -- --outDir "${output_dir}"
}

validate_deployment() {
  local label="$1"
  local config_file="$2"
  local bucket="$3"

  if [[ ! -f "${config_file}" ]]; then
    echo "${label} OSS config file does not exist: ${config_file}" >&2
    exit 1
  fi

  if [[ "${bucket}" != oss://*/ ]]; then
    echo "${label} OSS bucket must use oss:// and end with '/': ${bucket}" >&2
    exit 1
  fi
}

publish_site() {
  local label="$1"
  local output_dir="$2"
  local config_file="$3"
  local bucket="$4"

  echo "Publishing ${label} site to ${bucket} ..."

  # Upload non-asset files and the asset tree separately so assets are synced
  # only once while stale hashed files can still be removed before index.html.
  "${OSSUTIL_BIN}" sync "${output_dir}/" "${bucket}" \
    --exclude "index.html" --exclude "assets/*" \
    --force --job=100 --config-file="${config_file}"
  "${OSSUTIL_BIN}" sync "${output_dir}/assets/" "${bucket}assets/" \
    --delete --force --job=100 --config-file="${config_file}"
  "${OSSUTIL_BIN}" cp "${output_dir}/index.html" "${bucket}index.html" \
    --force --config-file="${config_file}"
}

if [[ "${BUILD_ONLY}" != "1" ]]; then
  : "${CN_OSS_CONFIG:?Set CN_OSS_CONFIG to the mainland OSS config file}"
  : "${CN_OSS_BUCKET:?Set CN_OSS_BUCKET to the mainland OSS bucket, ending in /}"

  if ! command -v "${OSSUTIL_BIN}" >/dev/null 2>&1; then
    echo "OSS utility not found: ${OSSUTIL_BIN}" >&2
    exit 1
  fi

  validate_deployment "Mainland" "${CN_OSS_CONFIG}" "${CN_OSS_BUCKET}"
  validate_deployment "Global" "${GLOBAL_OSS_CONFIG}" "${GLOBAL_OSS_BUCKET}"
fi

build_site "cn" "${CN_DIST_DIR}"
build_site "global" "${GLOBAL_DIST_DIR}"

if [[ "${BUILD_ONLY}" == "1" ]]; then
  echo "Build complete. Publishing skipped because BUILD_ONLY=1."
  exit 0
fi

publish_site "mainland" "${CN_DIST_DIR}" "${CN_OSS_CONFIG}" "${CN_OSS_BUCKET}"
publish_site "global" "${GLOBAL_DIST_DIR}" "${GLOBAL_OSS_CONFIG}" "${GLOBAL_OSS_BUCKET}"

echo "Both frontend sites have been deployed."
