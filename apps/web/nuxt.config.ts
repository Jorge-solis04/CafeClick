export default defineNuxtConfig({
  compatibilityDate: '2026-11-14',
  ssr: false,
  app: {
    head: {
      title: 'CaféClick',
      htmlAttrs: { lang: 'es' },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001',
    },
  },
})
