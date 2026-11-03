<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authorize ChatGPT access · Linket</title>
    <style>
        :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        body { min-height: 100vh; display: grid; place-items: center; margin: 0; background: #f8fafc; color: #18212f; }
        main { width: min(420px, calc(100vw - 44px)); padding: 28px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 36px #0f172a0a; }
        h1 { font-size: 22px; letter-spacing: -.035em; margin: 0 0 10px; }
        p { font-size: 14px; line-height: 1.6; color: #536477; }
        label { display: block; font-size: 13px; font-weight: 650; margin: 22px 0 8px; }
        select { box-sizing: border-box; width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; min-height: 44px; font: inherit; padding: 8px 12px; }
        button { min-height: 44px; font-size: 14px; font-weight: 650; border-radius: 8px; cursor: pointer; }
        .primary { background: #182a4a; color: #fff; border: 1px solid #182a4a; width: 100%; margin-top: 20px; }
        .secondary { width: 100%; border: 1px solid #cbd5e1; background: #fff; color: #18212f; margin-top: 10px; }
        :focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
    </style>
</head>
<body>
<main>
    <h1>Connect your Linket workspace</h1>
    <p><strong>{{ $clientName }}</strong> requests read-only access to reporting for one workspace. You can disconnect this connection at any time. Payments and private receiving account numbers are not shared.</p>
    <form method="POST" action="{{ route('creator-ai.oauth.approve') }}">
        @csrf
        <input type="hidden" name="nonce" value="{{ $nonce }}">
        <label for="workspace_id">Choose a workspace</label>
        <select id="workspace_id" name="workspace_id" required>
            @foreach ($workspaces as $workspace)
                <option value="{{ $workspace->id }}">{{ $workspace->name }}</option>
            @endforeach
        </select>
        <button class="primary" type="submit">Approve connection</button>
    </form>
    <form method="POST" action="{{ route('creator-ai.oauth.deny') }}">
        @csrf
        <input type="hidden" name="nonce" value="{{ $nonce }}">
        <button class="secondary" type="submit">Deny request</button>
    </form>
</main>
</body>
</html>
