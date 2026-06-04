# Guia de Configuração - Analytics & Tracking

## 1. Microsoft Clarity (Grátis)

### Passo a passo:
1. Acesse [clarity.microsoft.com](https://clarity.microsoft.com)
2. clique em "Add new project"
3. Insira o nome: `Vetor Blog`
4. Insira o URL: `https://www.vetor.blog`
5. Escolha a opção de instalação "Copy script" (não precisa, já está no código)
6. Copie o **Project ID** (ex: `abc123def4`)
7. Adicione no `.env.local`:
   ```
   NEXT_PUBLIC_CLARITY_ID=abc123def4
   ```

### O que você terá:
- **Heatmaps**: Veja onde os usuários clicam
- **Session Recordings**: Grave e assista sessões reais
- **Dead Clicks**: Identifique cliques que não funcionam
- **Rage Clicks**: Detecte frustração dos usuários
- **Insights automáticos**: Análises de comportamento

---

## 2. Google Analytics 4 (Grátis)

### Passo a passo:
1. Acesse [analytics.google.com](https://analytics.google.com)
2. Clique em "Admin" (engrenagem)
3. Clique em "Create Property"
4. Preencha:
   - Nome: `Vetor Blog`
   - Fuso horário: `(GMT-03:00) Brasília`
   - Moeda: `Brazilian Real`
5. Em "Data streams", clique em "Web"
6. Insira:
   - URL: `www.vetor.blog`
   - Nome: `Vetor Blog Web`
7. Clique em "Create stream"
8. Copie o **Measurement ID** (ex: `G-XXXXXXXXXX`)
9. Adicione no `.env.local`:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

### Configurações recomendadas:
- Ative "Enhanced measurement" para rastrear cliques automaticamente
- Configure "Conversion events" para:
  - `affiliate_click` (cliques em links de afiliado)
  - `purchase` (compras no ML)
- Crie "Audiences" para segmentar visitantes

### O que você terá:
- **Fontes de tráfego**: De onde vêm os visitantes
- **Comportamento**: Quais páginas mais visitam
- **Conversões**: Quanto compra pelos links
- **Audiência**: Perfil dos visitantes
- **Real-time**: Visitantes online agora

---

## 3. Sentry (Free Tier)

### Passo a passo:
1. Acesse [sentry.io](https://sentry.io)
2. Clique em "Sign Up"
3. Crie uma conta ou faça login com GitHub
4. Clique em "Create Project"
5. Escolha: `Next.js`
6. Preencha:
   - Team: `Vetor Blog`
   - Project name: `vetor-blog-frontend`
7. Clique em "Create Project"
8. Na tela de setup, copie o **DSN** (ex: `https://xxx@sentry.io/xxx`)
9. Adicione no `.env.local`:
   ```
   SENTRY_DSN=https://xxx@sentry.io/xxx
   SENTRY_ORG=vetor-blog
   SENTRY_PROJECT=vetor-blog-frontend
   ```

### Instale o Sentry:
```bash
npx @sentry/wizard@latest -i nextjs
```

### O que você terá:
- **Erros em tempo real**: Alertas instantâneos
- **Stack traces**: Localização exata do erro
- **Performance monitoring**: Lentidão detectada
- **User feedback**: Saiba quando algo quebrou
- **Release tracking**: Compare versões

---

## 4. Facebook Pixel (Opcional)

### Passo a passo:
1. Acesse [business.facebook.com](https://business.facebook.com)
2. Vá para "Events Manager"
3. Clique em "Connect Data Sources" → "Web" → "Facebook Pixel"
4. Insira o nome: `Vetor Blog Pixel`
5. Insira o URL do site: `https://www.vetor.blog`
6. Escolha "Use aPartner Integration" → "Manually install pixel code"
7. Copie o **Pixel ID** (ex: `123456789012345`)
8. Adicione no `.env.local`:
   ```
   NEXT_PUBLIC_FB_PIXEL_ID=123456789012345
   ```

### O que você terá:
- **Remarketing**: Anuncie para quem visitou o site
- **Conversões**: Rastreie compras e leads
- **Audiências similares**: Encontre pessoas parecidas
- **Otimização**: Otimize campanhas automaticamente

---

## Resumo das Variáveis

```env
# Microsoft Clarity
NEXT_PUBLIC_CLARITY_ID=seu-id

# Google Analytics 4
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# Facebook Pixel (opcional)
NEXT_PUBLIC_FB_PIXEL_ID=seu-pixel-id
```

## Verificação

Após configurar, acesse o site e verifique:

1. **Clarity**: Aguarde 24h para ver dados em clarity.microsoft.com
2. **GA4**: Verifique em Analytics → Tempo Real
3. **Sentry**: Envie um erro de teste com `window.undefined()`
4. **Facebook Pixel**: Use o "Facebook Pixel Helper" (extensão Chrome)

---

## Dicas Importantes

### Privacidade (LGPD)
- Adicione um banner de cookies no site
- Permita que usuários optem por não serem rastreados
- Documente quais dados coleta e como usa

### Performance
- Todos os scripts usam `strategy="afterInteractive"` para não bloquear a renderização
- O Clarity e GA4 são carregados de forma assíncrona
- O Sentry captura erros sem afetar performance

### Debug
- No desenvolvimento, os eventos são logados no console
- Use o debug do GA4 para verificar eventos
- O Sentry tem ambiente de staging para testes