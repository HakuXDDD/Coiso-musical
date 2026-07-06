# FretFlow

Treinador de guitarra estilo Yousician/Guitar Hero, rodando 100% no navegador (sem backend).

## Stack

- React + TypeScript + Vite
- TailwindCSS 4
- Canvas 2D (renderização da pista de notas)
- `@tonejs/midi` (upload e parsing de arquivos MIDI)

## Instalar

```bash
npm install
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Abra o endereço mostrado no terminal (por padrão `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura de arquivos criados

```
src/
  App.tsx                    # layout principal e integração dos componentes
  types.ts                   # tipos (NoteEvent, GameStats, etc)
  index.css                  # Tailwind + tema neon
  components/
    NoteHighway.tsx           # pista Canvas 2D (6 cordas, notas caindo, linha de acerto)
    ScorePanel.tsx             # score, combo, accuracy, perfect/good/miss, play/pause/reset, velocidade
    MidiUpload.tsx             # botão de upload de arquivo .mid/.midi
  hooks/
    useGameEngine.ts           # loop do jogo (rAF), tempo, teclado, julgamento de notas
    useMidiParser.ts           # parsing de MIDI com @tonejs/midi
  utils/
    music.ts                   # conversão midi<->nota, mapeamento de corda, cores, janelas de acerto
    demoRiff.ts                 # riff demo em Am pentatonic
```

## Como testar o riff demo

1. Rode `npm run dev` e abra o app no navegador.
2. Clique em **Play**. As notas do riff demo (Am pentatonic) começam a cair pelas 6 pistas em direção à linha de acerto ciano.
3. Use **Pause** para pausar exatamente onde está e **Play** de novo para continuar do mesmo ponto.
4. **Reset** volta o tempo para 0 e zera score/combo/accuracy.
5. Os botões **50% / 75% / 100%** mudam a velocidade com que o tempo do jogo avança.

## Como testar com teclado

- As teclas **A S D F G H** correspondem às 6 cordas (da esquerda para a direita na pista).
- Aperte a tecla correspondente quando uma nota estiver perto da linha de acerto:
  - Erro de até **80ms** → **Perfect** (+100 pontos)
  - Erro de até **180ms** → **Good** (+50 pontos)
  - Se a nota passar da janela de 180ms sem ser tocada → **Miss** (combo zera)
- Cada nota só pode ser contabilizada uma vez (hit ou miss).
- Score, combo e accuracy atualizam em tempo real no painel lateral.

## Como testar upload de MIDI

1. Clique em **Upload MIDI** no painel lateral.
2. Selecione um arquivo `.mid` ou `.midi` do seu computador.
3. O app lê as notas do arquivo com `@tonejs/midi`, mapeia cada nota para uma das 6 cordas (por proximidade ao braço/afinação padrão) e substitui o riff demo.
4. O jogo é resetado automaticamente (tempo volta a 0, score zera) e o nome da música no painel passa a ser o nome do arquivo enviado.
5. Aperte **Play** para treinar a música carregada.

## Fora de escopo nesta versão (v1)

- Sem reconhecimento por microfone (entrada é só teclado).
- Sem suporte a MP3, YouTube ou IA.
- Sem backend/servidor — tudo roda no navegador.
