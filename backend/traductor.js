const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

async function initI18n() {
  await i18next.use(Backend).init({
    lng: 'en',
    fallbackLng: 'en',
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/translation.json')
    },
    initImmediate: false // necesario para uso síncrono
  });
}

async function traducirTexto(nombre) {
  
  await initI18n();
  const traduccion = i18next.t(nombre.toLowerCase());
  
  return traduccion === nombre.toLowerCase() ? '' : traduccion;
}

module.exports = traducirTexto;
