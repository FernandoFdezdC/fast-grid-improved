// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Headers para SharedArrayBuffer (requerido para Chrome)
  async headers() {
    return [
      {
        source: '/:path*', // Aplica a todas las rutas
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  },

  eslint: {
    ignoreDuringBuilds: true, // <--- Ignora errores de ESLint en build
  },

  // Transpilar paquetes específicos
  transpilePackages: ['fast-grid'],

  distDir: 'dist',

};

module.exports = nextConfig;