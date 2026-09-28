#!/usr/bin/env bash
set -euo pipefail

readonly DEFAULT_URL="https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz"
readonly SOURCE_PAGE="https://kaikki.org/dictionary/rawdata.html"

usage() {
  cat <<'EOF'
Download the complete Kaikki extraction of English Wiktionary.

Usage:
  scripts/download-wiktionary-dump.sh --output-dir /srv/gef/dictionary-staging [options]

Options:
  --output-dir DIR  Required. Server staging directory outside this Git checkout.
  --decompress      Also create raw-wiktextract-data.jsonl (roughly 23 GB).
  --skip-gzip-test  Skip the post-download gzip integrity check.
  --url URL         Override the upstream URL (primarily for mirrors/tests).
  --help            Show this help.

The compressed download is roughly 2.6 GB and is resumed after interruption.
The script never runs as part of npm install, validation, compilation, or deploy.
EOF
}

output_dir=""
download_url="$DEFAULT_URL"
decompress=0
verify_gzip=1

while (($# > 0)); do
  case "$1" in
    --output-dir)
      [[ $# -ge 2 ]] || { echo "--output-dir requires a value" >&2; exit 2; }
      output_dir="$2"
      shift 2
      ;;
    --decompress)
      decompress=1
      shift
      ;;
    --skip-gzip-test)
      verify_gzip=0
      shift
      ;;
    --url)
      [[ $# -ge 2 ]] || { echo "--url requires a value" >&2; exit 2; }
      download_url="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -n "$output_dir" ]] || { echo "--output-dir is required" >&2; usage >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v gzip >/dev/null || { echo "gzip is required" >&2; exit 1; }

mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd -P)"

git_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$git_root" && ("$output_dir" == "$git_root" || "$output_dir" == "$git_root"/*) ]]; then
  echo "Refusing to store the Wiktionary dump inside the Git checkout: $output_dir" >&2
  exit 2
fi

archive_path="$output_dir/raw-wiktextract-data.jsonl.gz"
partial_path="$archive_path.part"
etag_path="$output_dir/raw-wiktextract-data.etag"
manifest_path="$output_dir/raw-wiktextract-data.source.json"
checksum_path="$archive_path.sha256"

if [[ -f "$archive_path" ]]; then
  echo "Download already exists: $archive_path"
else
  curl_retry_all_errors=()
  curl_etag_args=()
  if curl --help all 2>/dev/null | grep -q -- '--retry-all-errors'; then
    curl_retry_all_errors=(--retry-all-errors)
  fi
  if curl --help all 2>/dev/null | grep -q -- '--etag-save'; then
    curl_etag_args=(--etag-save "$etag_path")
  fi
  echo "Downloading the complete compressed Wiktionary extraction."
  echo "Source: $download_url"
  echo "Destination: $archive_path"
  curl \
    --fail \
    --location \
    --continue-at - \
    --retry 12 \
    "${curl_retry_all_errors[@]}" \
    --retry-delay 5 \
    --connect-timeout 30 \
    --speed-time 120 \
    --speed-limit 1024 \
    "${curl_etag_args[@]}" \
    --output "$partial_path" \
    "$download_url"

  if ((verify_gzip)); then
    echo "Checking gzip integrity (this can take several minutes)..."
    gzip -t "$partial_path"
  fi
  mv "$partial_path" "$archive_path"
fi

if command -v sha256sum >/dev/null; then
  sha256_value="$(sha256sum "$archive_path" | awk '{print $1}')"
elif command -v shasum >/dev/null; then
  sha256_value="$(shasum -a 256 "$archive_path" | awk '{print $1}')"
else
  echo "sha256sum or shasum is required" >&2
  exit 1
fi

byte_size="$(wc -c < "$archive_path" | tr -d ' ')"
downloaded_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf '%s  %s\n' "$sha256_value" "$(basename "$archive_path")" > "$checksum_path"

escaped_url="${download_url//\\/\\\\}"
escaped_url="${escaped_url//\"/\\\"}"
cat > "$manifest_path" <<EOF
{
  "schema_version": 1,
  "source": "Kaikki/Wiktextract extraction of English Wiktionary",
  "source_page": "$SOURCE_PAGE",
  "download_url": "$escaped_url",
  "downloaded_at": "$downloaded_at",
  "artifact": "$(basename "$archive_path")",
  "byte_size": $byte_size,
  "sha256": "$sha256_value",
  "compressed": true
}
EOF

if ((decompress)); then
  jsonl_path="$output_dir/raw-wiktextract-data.jsonl"
  if [[ -f "$jsonl_path" ]]; then
    echo "Decompressed JSONL already exists: $jsonl_path"
  else
    echo "Decompressing to $jsonl_path (roughly 23 GB)..."
    gzip -dc "$archive_path" > "$jsonl_path.part"
    mv "$jsonl_path.part" "$jsonl_path"
  fi
fi

echo "Wiktionary dump is ready: $archive_path"
echo "Manifest: $manifest_path"
