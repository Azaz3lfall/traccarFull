#!/bin/bash
# Generate dev certificates with IP (104.251.211.91) and localhost in Subject Alternative Name.
# Use this when accessing the Vite dev server via https://104.251.211.91:3000
# to avoid ERR_CERT_AUTHORITY_INVALID after accepting the cert in browser.
#
# Usage: ./scripts/generate-dev-cert-with-ip.sh [IP]
# Default IP: 104.251.211.91

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$(cd "$SCRIPT_DIR/../src/resources/certs" && pwd)"
IP="${1:-104.251.211.91}"

echo "Generating dev certificates with SAN: IP:$IP, DNS:localhost"
echo "Output: $CERTS_DIR/"

# Create temp config for SAN (works with older OpenSSL)
CONFIG=$(mktemp)
cat > "$CONFIG" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = ext

[dn]
CN = localhost

[ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = $IP
EOF

openssl req -x509 -newkey rsa:2048 \
  -keyout "$CERTS_DIR/dev-key.pem" \
  -out "$CERTS_DIR/dev-cert.pem" \
  -days 365 -nodes \
  -config "$CONFIG" \
  -extensions ext

rm -f "$CONFIG"

echo "Done. Restart the Vite dev server to use the new certificates."
