const nodemailer = require('nodemailer');

const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('EMAIL_USER or EMAIL_PASS missing in environment variables');
        throw new Error('Email configuration is incomplete. Please check server environment variables.');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const sendEmail = async (options) => {
    console.log(`Attempting to send email to: ${options.email}`);
    
    const transporter = createTransporter();

    // Verify connection configuration
    try {
        await transporter.verify();
        console.log('SMTP server is ready to take our messages');
    } catch (error) {
        console.error('SMTP Verification Error:', error);
        throw new Error(`Email service connection failed: ${error.message}`);
    }

    const mailOptions = {
        from: `"Mullenghal Furniture" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        console.log('Accepted recipients:', info.accepted);
        console.log('Response from server:', info.response);
        return info;
    } catch (error) {
        console.error('Nodemailer Send Error:', error);
        throw new Error(`Failed to deliver email: ${error.message}`);
    }
};

const sendOTPEmail = async (email, otp) => {
    const subject = 'Password Reset OTP';
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1e293b; margin-bottom: 10px; font-size: 28px; font-weight: 800;">MULLENGHAL</h1>
                <p style="color: #64748b; font-size: 16px;">Premium Furniture & Interiors</p>
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid #f1f5f9;">
                <h2 style="color: #334155; margin-bottom: 20px; font-size: 20px; font-weight: 600;">Password Reset OTP</h2>
                <p style="color: #64748b; margin-bottom: 30px; line-height: 1.6;">You have requested to reset your password. Use the following OTP code to proceed. This code is valid for <strong>5 minutes</strong>.</p>
                <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 2px dashed #cbd5e1; display: inline-block; margin-bottom: 30px;">
                    <span style="font-size: 42px; font-weight: 800; color: #0f172a; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 14px;">If you did not request this, please ignore this email or contact support.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <p style="color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Mullenghal Furniture. All rights reserved.</p>
            </div>
        </div>
    `;

    await sendEmail({ email, subject, html });
};

module.exports = { sendOTPEmail, sendEmail };

