#!/usr/bin/env bash
# Compiles java-examples with --release <N> and runs every deterministic example on the JVM at
# $1 (a JAVA_HOME), comparing output with java-examples/src/test/resources/expected-output.
#   scripts/run-examples-on-jdk.sh /path/to/jdk-21 21
set -euo pipefail
JDK_HOME=${1:?usage: run-examples-on-jdk.sh <JAVA_HOME> <release>}
RELEASE=${2:?usage: run-examples-on-jdk.sh <JAVA_HOME> <release>}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT/java-examples"
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
"$JDK_HOME/bin/javac" --release "$RELEASE" -d "$OUT" $(find src/main/java -name '*.java')
fail=0
for f in src/test/resources/expected-output/*.txt; do
  name=$(basename "$f" .txt)
  cls=$(grep -rlE "(class|record) $name\b" src/main/java | head -1 | sed 's#src/main/java/##; s#\.java$##; s#/#.#g')
  actual=$("$JDK_HOME/bin/java" --add-opens java.base/java.util=ALL-UNNAMED -cp "$OUT" "$cls" 2>&1)
  if [ "$actual" == "$(cat "$f")" ]; then echo "same  $name"; else echo "DIFF  $name"; diff <(echo "$actual") "$f" || true; fail=1; fi
done
"$JDK_HOME/bin/java" -version 2>&1 | head -1
exit $fail
