const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.bucket = process.env.AWS_BUCKET_NAME;
    this.qrFolder = process.env.AWS_S3_QR_FOLDER || 'qr-codes';
    this.logoFolder = process.env.AWS_S3_LOGO_FOLDER || 'logos';
    this.bannerFolder = process.env.AWS_S3_BANNER_FOLDER || 'banners';
  }

  async uploadQRCode(qrBuffer, filename) {
    const key = `${this.qrFolder}/${filename}`;
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: qrBuffer,
        ContentType: 'image/png',
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);
      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 QR upload error:', error);
      throw new Error('Failed to upload QR code to S3');
    }
  }

  async uploadLogo(logoBuffer, filename, contentType = 'image/jpeg') {
    const key = `${this.logoFolder}/${filename}`;
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: logoBuffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);
      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 logo upload error:', error);
      throw new Error('Failed to upload logo to S3');
    }
  }

  async uploadBanner(bannerBuffer, filename, contentType = 'image/jpeg') {
    const key = `${this.bannerFolder}/${filename}`;
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bannerBuffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);
      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 banner upload error:', error);
      throw new Error('Failed to upload banner to S3');
    }
  }

  async deleteFile(fileUrl) {
    try {
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1);
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      return false;
    }
  }

  generateQRFilename(profileSlug) {
    return `qr_${profileSlug}_${Date.now()}.png`;
  }

  generateLogoFilename(authId, originalName) {
    const extension = originalName.split('.').pop();
    return `logo_${authId}_${Date.now()}.${extension}`;
  }
}

module.exports = new S3Service();