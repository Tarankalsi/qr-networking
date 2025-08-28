const prisma = require("../db");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/response");
const { loginSchema ,changePasswordSchema } = require("../validations/exhibitorValidation");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


class AuthController {
  async refreshToken(req, res) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return sendErrorResponse(res, 'No refresh token provided', 401, 'No refresh token provided');
      }
      if (!process.env.JWT_REFRESH_SECRET || !process.env.JWT_SECRET) {
        return sendErrorResponse(res, 'Server error', 500, 'JWT secret is not configured');
      }
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return sendErrorResponse(res, 'Invalid refresh token', 401, 'Invalid or expired refresh token');
      }
      // Optionally, check user existence and status
      const auth = await prisma.exhibitorAuth.findUnique({ where: { id: payload.exhibitorId } });
      if (!auth) {
        return sendErrorResponse(res, 'Unauthorized', 401, 'User not found');
      }
      // Generate new access token
      const accessToken = jwt.sign(
        {
          exhibitorId: auth.id,
          email: auth.email,
          eventId: auth.event_id
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return sendSuccessResponse(res, 'Access token refreshed', { accessToken });
    } catch (error) {
      console.error('Refresh token error:', error);
      return sendErrorResponse(res, 'Failed to refresh token', 500, error.message);
    }
  }

  async login(req, res) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return sendErrorResponse(res, 'Validation failed', 400, error.details[0].message);
      }

      const { email, password } = value;

      // Find exhibitor auth with profile
      const auth = await prisma.exhibitorAuth.findUnique({
        where: { email },
        include: {
          profile: true,
          event: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!auth) {
        return sendErrorResponse(res, 'Unauthorized', 401, 'Invalid credentials');
      }

      // Verify password
      const isValid = await bcrypt.compare(password, auth.password_hash);
      if (!isValid) {
        return sendErrorResponse(res, 'Unauthorized', 401, 'Invalid credentials');
      }

      // Update last login
      await prisma.exhibitorAuth.update({
        where: { id: auth.id },
        data: { last_login: new Date() }
      });

      // Check JWT secrets
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        return sendErrorResponse(res, 'Server error', 500, 'JWT secret is not configured');
      }

      // Generate JWT token
      const accessToken = jwt.sign(
        {
          exhibitorId: auth.id,
          email: auth.email,
          eventId: auth.event_id
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        {
          exhibitorId: auth.id,
          email: auth.email,
          eventId: auth.event_id
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      return sendSuccessResponse(res, 'Login successful', {
        accessToken
      });

    } catch (error) {
      console.error('Login error:', error);
  return sendErrorResponse(res, 'Login failed', 500, error.message);
    }
  }

  async getExhibitorDetails(req, res) {
    try {
      const exhibitor = await req.getExhibitorDetails();
      return sendSuccessResponse(res, 'Exhibitor details retrieved successfully', exhibitor);
    } catch (error) {
      console.error('Get me error:', error);
  return sendErrorResponse(res, 'Failed to get exhibitor info', 500, error.message);
    }
  }

  async changePassword(req, res) {
    try {
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details[0].message
        });
      }

      const { currentPassword, newPassword } = value;

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, req.exhibitorAuth.password_hash);
      if (!isValid) {
        return sendErrorResponse(res, 'Current password is incorrect', 400, 'Please provide the correct current password');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.exhibitorAuth.update({
        where: { id: req.exhibitorId },
        data: {
          password_hash: newPasswordHash,
          updated_at: new Date()
        }
      });

      return sendSuccessResponse(res, 'Password changed successfully', {
        message: 'Your password has been updated successfully'
      });


    } catch (error) {
      console.error('Change password error:', error);
  return sendErrorResponse(res, 'Failed to change password', 500, error.message);
    }
  }

  async getQrAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const exhibitor = await req.getExhibitorDetails();
      const exhibitorProfile = exhibitor.profile;

      if (!exhibitorProfile) {
        return sendErrorResponse(res, 'Profile not found', 404, 'You must create a profile to access QR analytics');
      }

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          viewed_at: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        };
      }

      // Get all QR scans
      const qrScans = await prisma.profileView.findMany({
        where: {
          profile_id: exhibitorProfile.id,
          ...dateFilter
        },
        include: {
          visitor: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
              created_at: true
            }
          }
        },
        orderBy: { viewed_at: 'desc' }
      }); 

      // Group by time period
      const formatDate = (date, group) => {
        const d = new Date(date);
        switch (group) {
          case 'hour':
            return d.toISOString().substring(0, 13) + ':00:00.000Z';
          case 'day':
            return d.toISOString().split('T')[0];
          case 'week':
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - d.getDay());
            return startOfWeek.toISOString().split('T')[0];
          case 'month':
            return d.toISOString().substring(0, 7);
          default:
            return d.toISOString().split('T')[0];
        }
      };

      const groupedScans = qrScans.reduce((acc, scan) => {
        const key = formatDate(scan.viewed_at, groupBy);
        if (!acc[key]) {
          acc[key] = {
            period: key,
            totalScans: 0,
            uniqueVisitors: new Set(),
            registeredScans: 0,
            anonymousScans: 0
          };
        }

        acc[key].totalScans++;
        if (scan.visitor_id) {
          acc[key].uniqueVisitors.add(scan.visitor_id);
          acc[key].registeredScans++;
        } else {
          acc[key].uniqueVisitors.add(scan.ip_address);
          acc[key].anonymousScans++;
        }

        return acc;
      }, {});

      // Convert to array and calculate unique visitors count
      const timeSeriesData = Object.values(groupedScans).map(group => ({
        period: group.period,
        totalScans: group.totalScans,
        uniqueVisitors: group.uniqueVisitors.size,
        registeredScans: group.registeredScans,
        anonymousScans: group.anonymousScans
      })).sort((a, b) => new Date(a.period) - new Date(b.period));

      // Calculate scan patterns
      const hourlyPattern = Array.from({ length: 24 }, (_, hour) => {
        const scansInHour = qrScans.filter(scan =>
          new Date(scan.viewed_at).getHours() === hour
        ).length;
        return { hour, scans: scansInHour };
      });

      const dailyPattern = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
        const scansOnDay = qrScans.filter(scan =>
          new Date(scan.viewed_at).getDay() === index
        ).length;
        return { day, scans: scansOnDay };
      });

      // Top referrers
      const referrerCounts = qrScans.reduce((acc, scan) => {
        const referrer = scan.referrer || 'Direct/QR Code';
        acc[referrer] = (acc[referrer] || 0) + 1;
        return acc;
      }, {});

      const topReferrers = Object.entries(referrerCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

  return sendSuccessResponse(res, 'QR analytics retrieved successfully', {
        summary: {
          totalScans: qrScans.length,
          uniqueVisitors: new Set(qrScans.map(s => s.visitor_id || s.ip_address)).size,
          registeredVisitorScans: qrScans.filter(s => s.visitor_id).length,
          anonymousScans: qrScans.filter(s => !s.visitor_id).length,
          avgScansPerDay: timeSeriesData.length > 0 ?
            (qrScans.length / timeSeriesData.length).toFixed(1) : 0
        },
        timeSeriesData,
        patterns: {
          hourly: hourlyPattern,
          daily: dailyPattern
        },
        topReferrers,
        recentScans: qrScans.slice(0, 20).map(scan => ({
          id: scan.id,
          viewedAt: scan.viewed_at,
          visitor: scan.visitor,
          isRegistered: !!scan.visitor_id,
          referrer: scan.referrer,
          userAgent: scan.user_agent
        }))
      });

    } catch (error) {
      console.error('QR Analytics error:', error);
  return sendErrorResponse(res, 'Failed to get QR analytics', 500, error.message);
    }
  }
}

module.exports = new AuthController();