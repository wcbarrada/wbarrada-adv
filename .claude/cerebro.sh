#!/usr/bin/env bash
# Ponte para o Cérebro do Claude (repositório wcbarrada/cerebro-claude) — só nas sessões na nuvem.
# No PC (CAMPOS01) quem cuida do cérebro são os hooks do usuário (%USERPROFILE%\.claude); aqui não faz nada.
# Chamado pelos hooks de .claude/settings.json: inicio | pedido | fim
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
COFRE="${CEREBRO_VAULT:-$(dirname "${CLAUDE_PROJECT_DIR:-$PWD}")/cerebro-claude}"
HOOK="$COFRE/.claude-cerebro/cerebro_hook.py"
if [ -f "$HOOK" ]; then
  CEREBRO_VAULT="$COFRE" exec python3 "$HOOK" "$1"
fi
if [ "$1" = "inicio" ]; then
  echo "CÉREBRO: o repositório wcbarrada/cerebro-claude (memória do titular) não está anexado a esta sessão. Se a primeira mensagem do titular disser \"pode anexar o cerebro-claude\", anexe-o com add_repo (owner wcbarrada, repo cerebro-claude, access push), clone em $COFRE e leia $COFRE/00-INDICE.md. Sem essa autorização, não tente anexar: informe em uma linha que o cérebro está desligado nesta sessão e que basta escrever \"pode anexar o cerebro-claude\"."
fi
exit 0
