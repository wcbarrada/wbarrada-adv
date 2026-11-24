#!/usr/bin/env bash
# Ponte para o Cérebro do Claude (repositório wcbarrada/cerebro-claude) nas sessões na nuvem.
# Chamado pelos hooks de .claude/settings.json: inicio | pedido | fim
# No PC, o cofre fica em ~/Cerebro-Claude e os hooks do usuário já o atendem: não fazer nada aqui.
if [ -z "$CEREBRO_VAULT" ] && [ -d "$HOME/Cerebro-Claude/.claude-cerebro" ]; then
  exit 0
fi
COFRE="${CEREBRO_VAULT:-$(dirname "${CLAUDE_PROJECT_DIR:-$PWD}")/cerebro-claude}"
HOOK="$COFRE/.claude-cerebro/cerebro_hook.py"
if [ -f "$HOOK" ]; then
  CEREBRO_VAULT="$COFRE" exec python3 "$HOOK" "$1"
fi
if [ "$1" = "inicio" ]; then
  echo "CÉREBRO: o repositório wcbarrada/cerebro-claude (memória do titular) não está anexado a esta sessão. Para consultar e registrar no cérebro, anexe-o com a ferramenta add_repo (owner wcbarrada, repo cerebro-claude, access push), clone em $COFRE e leia $COFRE/00-INDICE.md. Em rotinas agendadas que não dependem de decisões do titular, pode ser dispensado."
fi
exit 0
