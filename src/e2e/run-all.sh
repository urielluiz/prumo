#!/bin/sh
# Roda todos os testes e2e. Sai com erro se algum script falhar ou tiver FAIL.
# Uso: cd src && sh e2e/run-all.sh   (precisa de: python3 build.py antes, npm i puppeteer-core)
cd "$(dirname "$0")/.." || exit 1
mkdir -p e2e/out
pass=0; fail=0; bad=0
for t in e2e/*.js; do
  name=$(basename "$t")
  out="e2e/out/$name.txt"
  timeout 300 node "$t" > "$out" 2>&1; code=$?
  p=$(grep -c '^PASS' "$out"); f=$(grep -c '^FAIL' "$out")
  pass=$((pass + p)); fail=$((fail + f))
  status=ok
  if [ "$code" -ne 0 ] || [ "$f" -gt 0 ] || grep -q '^ERRORS' "$out"; then bad=$((bad + 1)); status=FALHOU; fi
  printf '%-16s %-7s PASS=%s FAIL=%s\n' "$name" "$status" "$p" "$f"
  if [ "$status" = FALHOU ]; then grep -E '^FAIL|^ERRORS|Error' "$out" | head -8 | sed 's/^/    /'; fi
done
echo "TOTAL PASS=$pass FAIL=$fail scripts com problema=$bad"
[ "$bad" -eq 0 ]
