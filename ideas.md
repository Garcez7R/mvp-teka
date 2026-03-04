# Brainstorm de Design - TEKA

## Contexto
App MVP para sebos venderem livros usados. Cores fornecidas: #da4653 (coral/vermelho) e #262969 (navy/azul escuro). Foco em clareza, busca e contato direto via WhatsApp.

---

## Abordagem 1: Minimalismo Editorial
**Design Movement:** Swiss Design + Editorial Modernism
**Probability:** 0.08

### Core Principles
- Tipografia como protagonista (hierarquia clara)
- Espaço em branco generoso e funcional
- Grid estruturado mas não rígido
- Foco absoluto no conteúdo (livros)

### Color Philosophy
- Navy (#262969) como cor estrutural (headers, borders, text)
- Coral (#da4653) como accent sutil (hover, CTAs, destaque)
- Fundo branco/cream para leitura confortável
- Cinzas neutros para suporte visual

### Layout Paradigm
- Header clean com logo + search bar centralizada
- Grid de livros 2-3 colunas (mobile-first)
- Sidebar esquerda com filtros (desktop)
- Rodapé minimalista com links

### Signature Elements
- Tipografia sans-serif elegante (Poppins ou Outfit)
- Linhas horizontais sutis separando seções
- Cards de livro com borda navy sutil
- Ícones geométricos simples

### Interaction Philosophy
- Transições suaves ao hover (scale 1.02, shadow)
- Feedback visual claro em botões
- Busca com autocomplete instantâneo
- Animações discretas, nunca distrai

### Animation
- Fade-in ao carregar livros
- Slide suave ao filtrar
- Hover: elevação leve (shadow) + mudança de cor
- Transição de página: fade 200ms

### Typography System
- Display: Outfit Bold (títulos, headers)
- Body: Inter Regular (descrições, preços)
- Accent: Poppins SemiBold (CTAs, labels)

---

## Abordagem 2: Vintage Bookstore Vibes
**Design Movement:** Art Deco + Retro Typography
**Probability:** 0.07

### Core Principles
- Nostalgia controlada (referência a sebos físicos antigos)
- Tipografia expressiva e característica
- Texturas sutis (papel, madeira)
- Paleta quente e aconchegante

### Color Philosophy
- Navy (#262969) como cor de fundo escuro (seções)
- Coral (#da4653) como destaque quente (botões, badges)
- Creme/bege para contraste legível
- Ouro/bronze para acentos premium

### Layout Paradigm
- Hero com padrão geométrico (Art Deco)
- Cards de livro com borda decorativa
- Sidebar com textura de madeira (subtle)
- Rodapé com padrão vintage

### Signature Elements
- Tipografia serif elegante (Playfair Display)
- Bordas decorativas em cards
- Ícones estilizados (vintage)
- Badges com padrão geométrico

### Interaction Philosophy
- Hover com efeito de "virada de página"
- Botões com estilo de carimbo/selo
- Transições mais lentas (300ms) para sensação vintage
- Feedback tátil visual

### Animation
- Slide de página ao navegar
- Flip effect ao hover em livros
- Entrada com fade + scale
- Pulse sutil em CTAs

### Typography System
- Display: Playfair Display Bold (títulos)
- Body: Lora Regular (descrições)
- Accent: Cormorant Garamond SemiBold (labels)

---

## Abordagem 3: Modern Marketplace Clean
**Design Movement:** Contemporary E-commerce + Glassmorphism
**Probability:** 0.09

### Core Principles
- Interface clara e intuitiva (foco em conversão)
- Uso moderado de glassmorphism
- Componentes bem definidos e reconhecíveis
- Acessibilidade em primeiro plano

### Color Philosophy
- Navy (#262969) como cor primária (navegação, estrutura)
- Coral (#da4653) como CTA principal (botões de ação)
- Fundo branco com cards em branco/cinza claro
- Gradientes sutis para profundidade

### Layout Paradigm
- Top nav sticky com search
- Grid responsivo de livros (3-4 colunas desktop)
- Filtros em modal/drawer mobile
- Sidebar filtros desktop
- Hero com gradiente subtle

### Signature Elements
- Ícones modernos (Lucide)
- Cards com sombra suave
- Badges com background glassmorphic
- Botões com gradiente coral

### Interaction Philosophy
- Feedback imediato em todas as ações
- Transições rápidas (150ms)
- Hover com mudança de cor + elevação
- Loading states claros

### Animation
- Skeleton loading em cards
- Fade + slide ao filtrar
- Bounce suave em CTAs
- Transição de página: slide 200ms

### Typography System
- Display: Poppins Bold (títulos)
- Body: Inter Regular (descrições)
- Accent: Poppins SemiBold (CTAs, labels)

---

## Decisão: Abordagem Escolhida

**MINIMALISMO EDITORIAL** (Abordagem 1)

### Justificativa
- Livros merecem destaque, não competição visual
- Sebos tradicionais valorizam clareza e confiança
- Tipografia forte comunica qualidade
- Espaço em branco reduz "poluição visual"
- Fácil de evoluir e manter
- Navy + Coral funcionam bem em contexto editorial

### Implementação
- **Tipografia:** Outfit (display) + Inter (body)
- **Cores:** Navy (#262969) estrutural, Coral (#da4653) accent
- **Layout:** Grid 2-3 colunas, sidebar filtros, header clean
- **Interações:** Suaves, discretas, nunca distrai
- **Espaçamento:** Generoso, respira
