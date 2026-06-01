import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

const vercelEmulatorPlugin = () => {
  return {
    name: 'vercel-emulator',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/api/')) {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const apiPath = urlObj.pathname;

          const tsFile = path.resolve(__dirname, `.${apiPath}.ts`);
          if (fs.existsSync(tsFile)) {
            try {
              let body = {};
              if (req.method === 'POST') {
                body = await new Promise((resolve) => {
                  let data = '';
                  req.on('data', (chunk: any) => { data += chunk; });
                  req.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
                  });
                });
              }

              const mockReq = {
                method: req.method,
                headers: req.headers,
                query: Object.fromEntries(urlObj.searchParams),
                body,
              };

              const mockRes = {
                status(statusCode: number) {
                  res.statusCode = statusCode;
                  return this;
                },
                json(jsonData: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(jsonData));
                  return this;
                },
                send(textData: string) {
                  res.end(textData);
                  return this;
                },
                setHeader(name: string, value: string) {
                  res.setHeader(name, value);
                  return this;
                },
                end() {
                  res.end();
                  return this;
                }
              };

              const module = await server.ssrLoadModule(tsFile);
              const handler = module.default;
              if (typeof handler === 'function') {
                await handler(mockReq, mockRes);
                return;
              }
            } catch (err: any) {
              console.error(`Error in Vercel emulator for ${apiPath}:`, err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              return;
            }
          }
        }
        next();
      });
    }
  };
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), vercelEmulatorPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
