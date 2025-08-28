const sendCredentialsTemplate = (exhibitorData) => {

    const { email, companyName, password } = exhibitorData;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Exhibitor Account Details</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
                background-color: #f7fafc; 
            }
            .container { 
                max-width: 600px; 
                margin: 20px auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
            }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 30px 20px; 
                text-align: center; 
            }
            .header h1 { 
                margin: 0; 
                font-size: 28px; 
                font-weight: 600; 
            }
            .header p { 
                margin: 8px 0 0 0; 
                opacity: 0.9; 
                font-size: 16px; 
            }
            .content { 
                padding: 30px; 
            }
            .greeting { 
                font-size: 20px; 
                font-weight: 600; 
                color: #2d3748; 
                margin-bottom: 16px; 
            }
            .credentials-box { 
                background: #f8fafc; 
                border: 2px solid #e2e8f0; 
                border-radius: 8px; 
                padding: 24px; 
                margin: 24px 0; 
                border-left: 4px solid #667eea; 
            }
            .credentials-box h3 { 
                margin: 0 0 16px 0; 
                color: #2d3748; 
                font-size: 18px; 
            }
            .credential-item { 
                margin: 12px 0; 
                font-size: 16px; 
            }
            .credential-label { 
                font-weight: 600; 
                color: #4a5568; 
            }
            .credential-value { 
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
                background: #edf2f7; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 14px; 
                color: #2d3748; 
            }
            .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 14px 28px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px; 
                margin: 16px 0; 
                transition: transform 0.2s; 
            }
            .button:hover { 
                transform: translateY(-2px); 
            }
            .warning { 
                background: #fef5e7; 
                border: 1px solid #f6ad55; 
                color: #c05621; 
                padding: 16px; 
                border-radius: 8px; 
                margin: 20px 0; 
                font-weight: 500; 
            }
            .steps { 
                background: #f0fff4; 
                border: 1px solid #9ae6b4; 
                border-radius: 8px; 
                padding: 20px; 
                margin: 20px 0; 
            }
            .steps h3 { 
                color: #22543d; 
                margin: 0 0 16px 0; 
            }
            .steps ol { 
                margin: 0; 
                padding-left: 20px; 
            }
            .steps li { 
                margin: 8px 0; 
                color: #2f855a; 
            }
            .footer { 
                background: #f7fafc; 
                padding: 20px; 
                text-align: center; 
                color: #718096; 
                font-size: 14px; 
                border-top: 1px solid #e2e8f0; 
            }
            .footer p { 
                margin: 8px 0; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Event Networking!</h1>
                <p>Your exhibitor account is ready</p>
            </div>
            
            <div class="content">
                <div class="greeting">Hello ${companyName}! 👋</div>
                <p>Your exhibitor account has been successfully created for the upcoming event. Below are your login credentials:</p>
                
                <div class="credentials-box">
                    <h3>🔐 Your Login Credentials</h3>
                    <div class="credential-item">
                        <span class="credential-label">Email:</span>
                        <span class="credential-value">${email}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">Password:</span>
                        <span class="credential-value">${password}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">Login URL:</span>
                        <a href="${process.env.FRONTEND_URL}/login" style="color: #667eea; text-decoration: none;">${process.env.FRONTEND_URL}/login</a>
                    </div>
                </div>

                <div class="warning">
                    <strong>⚠️ Important Security Notice:</strong> Please change your password after your first login for enhanced security. This auto-generated password is temporary.
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/login" class="button">🚀 Access Your Dashboard</a>
                </div>

                <div class="steps">
                    <h3>🚀 Quick Setup Guide</h3>
                    <ol>
                        <li>Login using the credentials above</li>
                        <li>Update your password for security</li>
                        <li>Complete your exhibitor profile</li>
                        <li>Start networking with visitors</li>
                    </ol>
                </div>
            </div>

            <div class="footer">
                <p><strong>Need Help?</strong> Contact our support team for assistance with setup or questions.</p>
                <p>This email was sent automatically. Please do not reply to this message.</p>
                <p style="margin-top: 16px; opacity: 0.7;">© ${new Date().getFullYear()} Event Networking Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    return htmlContent;
}

module.exports = {sendCredentialsTemplate};
