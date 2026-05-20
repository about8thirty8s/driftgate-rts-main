Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Proxy the game JS bundle ──────────────────────────────────────────────
  if (url.pathname.endsWith('/game/bundle.js')) {
    const upstream = await fetch(
      'https://base44.app/api/apps/6a052e31974cfce1b2882157/files/mp/public/6a052e31974cfce1b2882157/dcebc0fa0_driftgate_game.js'
    );
    const js = await upstream.text();
    return new Response(js, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // ── Proxy individual sprites from GitHub raw ──────────────────────────────
  if (url.pathname.includes('/game/sprites/')) {
    const spritePath = url.pathname.replace(/.*\/game\/sprites\//, '');
    const ghUrl = `https://raw.githubusercontent.com/about8thirty8s/driftgate-rts-main/main/public/sprites/${spritePath}`;
    try {
      const upstream = await fetch(ghUrl);
      if (!upstream.ok) {
        return new Response('Not found', { status: 404 });
      }
      const buf = await upstream.arrayBuffer();
      return new Response(buf, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response('Sprite fetch failed', { status: 502 });
    }
  }

  // ── Main HTML page ─────────────────────────────────────────────────────────
  // Determine base URL for self-referencing asset paths
  const base = `${url.protocol}//${url.host}${url.pathname.replace(/\/?$/, '')}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Driftgate RTS — Playtest v0.3.1</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src * data: blob:; connect-src *;">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; font-family: 'Courier New', monospace; }
    canvas { display: block; }
    #loading-screen {
      position: fixed; inset: 0; background: #000;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #4a7c3f; font-family: monospace; z-index: 9999;
    }
    #loading-screen.hidden { display: none; }
    .load-title { font-size: 28px; letter-spacing: 6px; margin-bottom: 16px; }
    .load-sub { font-size: 12px; color: #444; letter-spacing: 3px; }
  </style>
</head>
<body>
  <div id="loading-screen">
    <div class="load-title">DRIFTGATE RTS</div>
    <div class="load-sub">LOADING ENGINE...</div>
  </div>
  <div id="root"></div>

  <script>
    // Patch Image to rewrite /sprites/ → proxied through this same origin
    const SPRITE_BASE = "${base}/sprites";
    const _NativeImage = window.Image;
    class PatchedImage extends _NativeImage {
      set src(val) {
        if (val && typeof val === 'string' && val.startsWith('/sprites/')) {
          const path = val.replace('/sprites/', '/');
          super.src = SPRITE_BASE + path;
        } else {
          super.src = val;
        }
      }
      get src() { return super.src; }
    }
    window.Image = PatchedImage;

    // Hide loading screen once React mounts
    const observer = new MutationObserver(() => {
      const root = document.getElementById('root');
      if (root && root.children.length > 0) {
        document.getElementById('loading-screen').classList.add('hidden');
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
  </script>

  <script type="module" src="${base}/bundle.js"></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
});
