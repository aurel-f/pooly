#!/bin/sh
set -e

# Substitue uniquement ${BACKEND_URL} — les variables nginx ($host, $remote_addr…) sont préservées
: "${BACKEND_URL:?La variable BACKEND_URL est requise}"
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
