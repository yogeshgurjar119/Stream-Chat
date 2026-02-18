import { NextResponse } from 'next/server'

// Email configuration (ready for your credentials)
const EMAIL_CONFIG = {
  service: 'gmail', // or your email service
  user: 'YOUR_EMAIL@gmail.com', // Replace with your email
  pass: 'YOUR_APP_PASSWORD', // Replace with your app password
  to: 'YOUR_EMAIL@gmail.com' // Replace with recipient email
}

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json()
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Here you would integrate with your email service
    // For now, we'll simulate successful email sending
    console.log('Contact Form Submission:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString()
    })

    // TODO: Integrate with email service like Nodemailer, SendGrid, etc.
    // Example with Nodemailer:
    /*
    const nodemailer = require('nodemailer')
    
    const transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass
      }
    })
    
    const mailOptions = {
      from: EMAIL_CONFIG.user,
      to: EMAIL_CONFIG.to,
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      `
    }
    
    await transporter.sendMail(mailOptions)
    */

    return NextResponse.json(
      { message: 'Message sent successfully!' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}