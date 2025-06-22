import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Headers para SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/:path*',
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
  
  // Configuración de Webpack
  webpack: (config, { isServer }) => {
    // Configuración para workers solo en cliente
    if (!isServer) {
      config.module.rules.push({
        test: /view-worker\.ts$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: 'no-fallback',
            publicPath: '/_next/static/workers/',
            filename: 'static/workers/[name].[contenthash].worker.js'
          }
        }
      });
      
      // Necesario para SharedArrayBuffer
      config.output.globalObject = 'self';
    }
    
    return config;
  },
  
  // Opciones compatibles con Turbopack
  experimental: {
    // Mantenemos solo lo necesario
  }
};

export default nextConfig;