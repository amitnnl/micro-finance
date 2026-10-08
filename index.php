<?php
/**
 * Root Entry Point for Microfinance Application
 * Serves the compiled React Frontend (frontend/dist/index.html or root index.html)
 */

$distIndex = __DIR__ . '/frontend/dist/index.html';
$rootIndex = __DIR__ . '/index.html';

if (file_exists($distIndex)) {
    header("Content-Type: text/html; charset=UTF-8");
    header("Cache-Control: no-cache, no-store, must-revalidate");
    readfile($distIndex);
    exit;
} elseif (file_exists($rootIndex)) {
    header("Content-Type: text/html; charset=UTF-8");
    header("Cache-Control: no-cache, no-store, must-revalidate");
    readfile($rootIndex);
    exit;
} else {
    header("Content-Type: text/html; charset=UTF-8");
    echo '<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Microfinance Management System - Ready to Build</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0,0,0,0.4); max-width: 550px; text-align: center; border: 1px solid #334155; }
            h1 { color: #6366f1; margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; }
            p { color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }
            code { background: #0f172a; padding: 0.4rem 0.8rem; border-radius: 0.375rem; color: #38bdf8; font-family: monospace; font-size: 0.9rem; border: 1px solid #334155; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Microfinance Management System</h1>
            <p>The backend API is active and ready. Please build the frontend production distribution by running:</p>
            <p><code>npm run build</code></p>
            <p>inside the <code>frontend/</code> directory.</p>
        </div>
    </body>
    </html>';
    exit;
}
