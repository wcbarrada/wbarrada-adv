# Site WBarrada Advogado

Site institucional com agenda online, Área do cliente e Área do advogado (v3).

## Início rápido
```bash
python3 build.py                     # gera dist/
npx serve -l 4173 dist/barrada-site  # abre em http://localhost:4173 (modo demonstração)
```
- Contas de teste: `cliente@demo.com` e `admin@demo.com`, ambas com o código `123456`.
- O painel do advogado fica em `#admin` e a área do cliente em `#cliente`.

## Produção
Siga `src/LEIA-ME.md`:
1. Criar o projeto no Supabase e executar `supabase/schema.sql`.
2. Preencher `src/config.js`.
3. Configurar SMTP próprio.
4. Publicar `dist/barrada-site` no Cloudflare Pages.

**Antes de publicar**, resolva os itens obrigatórios (Must) de `docs/fase4-verificacao.md`.

## Contexto para o Claude Code
Veja `CLAUDE.md`, que reúne o protocolo, as restrições éticas, a arquitetura, as decisões pendentes e o backlog.
