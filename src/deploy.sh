#!/bin/sh
# Gera o app e copia para a raiz do repositório (o que o GitHub Pages publica).
set -e
cd "$(dirname "$0")"
python3 build.py
cp -r pwa/. ..
