const os = require('os')

// Функция для получения публичного IP или использования домена
const getAnnouncedIp = () => {
  // Для продакшена используем домен
  if (process.env.NODE_ENV === 'production') {
    return process.env.DOMAIN || 'rifelli.ru'
  }
  
  // Для разработки получаем локальный IP
  const ifaces = os.networkInterfaces()
  let localIp = '127.0.0.1'
  Object.keys(ifaces).forEach((ifname) => {
    for (const iface of ifaces[ifname]) {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        continue
      }
      localIp = iface.address
      return
    }
  })
  return localIp
}

module.exports = {
  listenIp: '0.0.0.0',
  listenPort: process.env.PORT || 3016,
  sslCrt: process.env.SSL_CERT || '../ssl/cert.pem',
  sslKey: process.env.SSL_KEY || '../ssl/key.pem',

  mediasoup: {
    // Worker settings
    numWorkers: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp'
      ]
    },
    // Router settings
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        }
      ]
    },
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: getAnnouncedIp()
        }
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000
    }
  }
} 