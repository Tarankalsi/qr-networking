const QRCode = require('qrcode');
const S3Service = require('./S3Service');

class QrService {
  async generateQRCodeForProfile(profileSlug) {
    try {
      const profileUrl = `${process.env.FRONTEND_URL}/profile/${profileSlug}`;
      
      const qrBuffer = await QRCode.toBuffer(profileUrl, {
        type: 'png',
        quality: parseFloat(process.env.QR_CODE_QUALITY) || 0.9,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: parseInt(process.env.QR_CODE_SIZE) || 300,
        errorCorrectionLevel: 'M'
      });

      const filename = S3Service.generateQRFilename(profileSlug);
      const s3Url = await S3Service.uploadQRCode(qrBuffer, filename);
      
      return {
        qrCodeUrl: s3Url,
        profileUrl,
        filename
      };
    } catch (error) {
      console.error('QR generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }
}

module.exports = new QrService();