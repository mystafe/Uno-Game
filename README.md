# Uno Game

Basit kurallarla UNO oyunu. Oyuncular aynı odada toplanıp Socket.IO ile gerçek zamanlı oynayabilir.
İsteğe bağlı olarak bilgisayar (AI) oyuncusu eklenebilir.

## Özellikler
- Birden fazla oyuncu aynı anda oynayabilir.
- Bilgisayara karşı oynama seçeneği.
- Sayı, renk, atla, ters çevir, +2, joker ve +4 kartları.

## Yerelde Çalıştırma
```bash
# Sunucu
cd server
npm install
npm start

# İstemci
cd ../client
npm install
npm run dev
```
İstemci varsayılan olarak `http://localhost:3001` adresine bağlanır.

## Vercel'de Deploy
1. `client` klasörünü Vercel üzerinde yayınlayın.
   - Build komutu: `npm run build`
   - Yayın klasörü: `dist`
2. Vercel ortam değişkenlerine `VITE_SERVER_URL` olarak Socket.IO sunucunuzun URL'sini ekleyin (örneğin `https://uno-game-backend-bco7.onrender.com`).
3. `server` klasörünü kalıcı bir Node.js barındırma servisine (Render, Heroku vb.) ayrı olarak deploy edin.

Güle güle UNO oynayın!
