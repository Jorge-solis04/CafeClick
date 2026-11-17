import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-14',
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: 'CaféClick',
      htmlAttrs: { lang: 'es' },
      meta: [{ name: 'theme-color', content: '#f3f4ef' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..700&family=Public+Sans:wght@400..700&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '',
    },
  },
  nitro: {
    devProxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3001/api', changeOrigin: true },
    },
  },
})
