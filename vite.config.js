import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // Met à jour l'app automatiquement en arrière-plan
      manifest: {
        name: 'Yoté - Jeu de stratégie',
        short_name: 'Yoté',
        description: 'Le célèbre jeu de damier sénégalais',
        theme_color: '#000000', // Change la couleur de la barre de statut du téléphone
        background_color: '#000000',
        display: 'standalone', // C'est ça qui enlève la barre d'adresse du navigateur !
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});