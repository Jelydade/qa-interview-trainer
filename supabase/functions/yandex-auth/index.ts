const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YANDEX_CLIENT_ID = Deno.env.get('YANDEX_CLIENT_ID')!;
const YANDEX_CLIENT_SECRET = Deno.env.get('YANDEX_CLIENT_SECRET')!;

const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/yandex-auth/callback`;
const APP_ORIGIN = 'https://jelydade.github.io';
const APP_PATH = '/qa-interview-trainer/';

const readCookie = (request: Request, name: string) => request.headers
  .get('cookie')
  ?.split(';')
  .map((item) => item.trim().split('='))
  .find(([key]) => key === name)
  ?.slice(1)
  .join('=');

const isAllowedRedirect = (value: string) => {
  try {
    const url = new URL(value);
    return url.origin === APP_ORIGIN && url.pathname === APP_PATH;
  } catch {
    return false;
  }
};

const errorResponse = (message: string, status = 400) => new Response(message, { status });

Deno.serve(async (request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith('/start')) {
    const redirectTo = url.searchParams.get('redirect_to') ?? `${APP_ORIGIN}${APP_PATH}`;
    if (!isAllowedRedirect(redirectTo)) return errorResponse('Invalid redirect URL');

    const state = crypto.randomUUID();
    const authorizeUrl = new URL('https://oauth.yandex.ru/authorize');
    authorizeUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: YANDEX_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      scope: 'login:info login:email',
      state,
    }).toString();

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizeUrl.toString(),
        'Set-Cookie': `yandex_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/functions/v1/yandex-auth; Max-Age=600`,
      },
    });
  }

  if (!url.pathname.endsWith('/callback')) return errorResponse('Not found', 404);

  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, 'yandex_oauth_state');
  const code = url.searchParams.get('code');
  if (!code || !state || state !== expectedState) return errorResponse('Invalid authorization state', 403);

  const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: YANDEX_CLIENT_ID,
      client_secret: YANDEX_CLIENT_SECRET,
      redirect_uri: CALLBACK_URL,
    }),
  });
  if (!tokenResponse.ok) return errorResponse('Could not exchange Yandex authorization code', 502);
  const token = await tokenResponse.json();

  const profileResponse = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${token.access_token}` },
  });
  if (!profileResponse.ok) return errorResponse('Could not read Yandex profile', 502);
  const profile = await profileResponse.json();
  if (!profile.id) return errorResponse('Yandex profile has no stable identifier', 502);

  // This is only a stable internal identifier. The trainer does not need to
  // store or use a person's real Yandex email address.
  const internalEmail = `yandex-${profile.id}@users.qa-interview-trainer.example`;
  const linkResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: internalEmail,
      redirect_to: `${APP_ORIGIN}${APP_PATH}`,
      data: { provider: 'yandex', yandex_id: String(profile.id), name: profile.real_name ?? profile.display_name ?? null },
    }),
  });
  if (!linkResponse.ok) return errorResponse('Could not create Supabase session', 502);
  const link = await linkResponse.json();

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.action_link,
      'Set-Cookie': 'yandex_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/functions/v1/yandex-auth; Max-Age=0',
    },
  });
});
