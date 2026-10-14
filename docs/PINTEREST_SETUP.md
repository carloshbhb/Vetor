# Pinterest publishing integration

## Production environment variables

Configure these variables in **Vercel → project vetor-blog → Settings → Environment Variables → Production**:

- \`PINTEREST_CLIENT_ID\`: App ID from the Pinterest Developers portal.
- \`PINTEREST_CLIENT_SECRET\`: Client secret from the same app.
- \`PINTEREST_REDIRECT_URI\`: \`https://www.vetor.blog/api/pinterest/callback\` (optional because this is the default).

Do not use a \`NEXT_PUBLIC_\` prefix for either credential. Never paste tokens into GitHub, client-side code, or issue descriptions.

## Pinterest Developers app

1. Register or open the Pinterest app in the Developers portal.
2. Add the callback URI exactly as shown above.
3. Enable organic Pins/Boards permissions. The application requests \`boards:read\`, \`boards:write\`, \`pins:read\`, and \`pins:write\`.
4. Ensure the app has access to create organic Pins. Pinterest may require the app to be approved or moved beyond trial access.
5. After the Vercel variables are set in Production, open \`https://www.vetor.blog/admin/pinterest/\`, sign in to the admin panel, click **Conectar Pinterest**, approve the scopes, and return to the panel.
6. Click **Testar conexão**, select the destination board, and save it by selecting it from the board list.
7. Click **Adicionar publicados à fila** to enqueue eligible published reviews and landing pages. The daily worker publishes one due Pin per run and records its result in Supabase.

## Operations and safety

- The OAuth access token and refresh token are stored only in \`public.pinterest_config\`; API responses never include token values.
- Access tokens are refreshed server-side before expiry when a refresh token is available.
- The legacy token originally stored by the prototype has no refresh token. Reconnect once after setting the app credentials.
- Only public content with a valid HTTPS image URL is eligible for the queue. Pins link to the corresponding \`/reviews/{slug}/\` page.
- The worker route is \`/api/cron/pinterest\`, protected by the existing \`CRON_SECRET\`, and scheduled daily in \`vercel.json\`.
- Failed items stay in the queue with an error. Use **Reagendar falhas** after fixing the cause; do not blindly repeat errors from missing scopes, inaccessible images, or invalid board permissions.
