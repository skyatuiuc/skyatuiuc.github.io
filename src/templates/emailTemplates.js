// Modern, responsive HTML email templates for SKY at UIUC
// Designed to render cleanly across Gmail, Apple Mail, Outlook, and mobile email clients

export const EMAIL_TEMPLATES = {
  application_received: {
    id: 'application_received',
    name: 'Application Received',
    subject: 'Application Received - SKY Happiness Retreat',
    description: 'Sent to acknowledge receipt of an application and inform them of officer review.',
    renderHtml: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">Application Received</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${data.firstName || 'Participant'}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Thank you for applying for the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${data.dates || 'the upcoming retreat dates'}</strong>! We are very excited to review your application.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Our club officers have begun the review process. We will reach out for a brief confirmation or orientation phone call within the next few days to confirm your details.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Warm regards,<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC Team</strong><br>
      <span style="font-size: 14px; color: #718096;">Email: <a href="mailto:${data.clubEmail || 'skyatuiuc@gmail.com'}" style="color: #1F74F1;">${data.clubEmail || 'skyatuiuc@gmail.com'}</a></span>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`
  },

  application_accepted_standard: {
    id: 'application_accepted_standard',
    name: 'Application Accepted (Fully Funded / $0)',
    subject: 'Application Accepted! - SKY Happiness Retreat',
    description: 'Sent to accepted student applicants with fully funded $0 tuition.',
    renderHtml: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Accepted! - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">🎉 Application Accepted!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${data.firstName || 'Participant'}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Thank you for your application to the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${data.dates || 'the upcoming retreat dates'}</strong>. We have reviewed your application and it is our pleasure to inform you that you have been <strong>accepted</strong>! We look forward to having you join us for this transformative retreat.
    </p>
    
    <div style="background-color: #F0F7FF; border-left: 4px solid #1F74F1; padding: 15px 20px; border-radius: 4px; margin: 25px 0;">
      <h3 style="color: #1F74F1; margin-top: 0; margin-bottom: 8px; font-size: 17px;">📌 Next Steps (Action Required within 24 Hours)</h3>
      <p style="line-height: 1.5; font-size: 15px; margin: 0 0 12px 0; color: #23275F;">
        Please complete the official SKY registration to secure your fully funded spot. If you have a university email, be sure to use your <strong style="color: #1F74F1;">.edu email address</strong> to claim your club funding.
      </p>
      ${data.registrationLink ? `
      <div style="text-align: center; margin-top: 15px;">
        <a href="${data.registrationLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(31, 116, 241, 0.3);">
          Complete Official Registration Here &rarr;
        </a>
      </div>` : ''}
    </div>

    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      🕒 In-Person Retreat Schedule & Location
    </h3>
    <ul style="padding-left: 20px; line-height: 1.6; font-size: 15px; color: #23275F;">
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${data.day1Label || 'Friday'}:</strong> ${data.day1Time}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${data.day2Label || 'Saturday'}:</strong> ${data.day2Time}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${data.day3Label || 'Sunday'}:</strong> ${data.day3Time}</li>
      <li style="color: #23275F; margin-top: 8px;">
        <strong>Location:</strong> ${data.location}
        ${data.address ? `<br><span style="color: #718096; font-size: 14px;"><strong>Address:</strong> ${data.address}</span>` : ''}
      </li>
    </ul>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
      <strong style="color: #B45309; font-size: 14px;">⚠️ Important Commitment Note:</strong>
      <p style="font-size: 14px; line-height: 1.5; color: #92400E; margin: 4px 0 0 0;">
        Space and club funding are limited. Please ensure you are available for <strong>all 3 days</strong>. If your availability changes, kindly email <a href="mailto:${data.clubEmail || 'skyatuiuc@gmail.com'}" style="color: #B45309; font-weight: bold;">${data.clubEmail || 'skyatuiuc@gmail.com'}</a> immediately so your spot can be offered to another applicant on the waitlist.
      </p>
    </div>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Looking forward to seeing you soon!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`
  },

  application_accepted_paypal: {
    id: 'application_accepted_paypal',
    name: 'Application Accepted (With PayPal Payment Link)',
    subject: 'Application Accepted & Payment Instructions - SKY Happiness Retreat',
    description: 'Sent to accepted faculty, staff, postdoc, or non-student applicants requiring payment.',
    renderHtml: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Accepted & Payment Instructions - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #DB6937; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #DB6937; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">🎉 Application Accepted!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${data.firstName || 'Participant'}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Thank you for your application to the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${data.dates || 'the upcoming retreat dates'}</strong>. We have reviewed your application and it is our pleasure to inform you that you have been <strong>accepted</strong>!
    </p>
    
    <!-- STEP 1: REGISTRATION -->
    <div style="background-color: #F0F7FF; border-left: 4px solid #1F74F1; padding: 15px 20px; border-radius: 4px; margin: 20px 0;">
      <h3 style="color: #1F74F1; margin-top: 0; margin-bottom: 8px; font-size: 16px;">Step 1: Complete Official Registration (Within 24h)</h3>
      <p style="line-height: 1.5; font-size: 15px; margin: 0 0 10px 0; color: #23275F;">
        Please complete the official SKY registration to secure your spot. Use your university or primary email address.
      </p>
      ${data.registrationLink ? `
      <div>
        <a href="${data.registrationLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
          Complete Official Registration &rarr;
        </a>
      </div>` : ''}
    </div>

    <!-- STEP 2: PAYPAL PAYMENT -->
    <div style="background-color: #FFF7ED; border-left: 4px solid #DB6937; padding: 15px 20px; border-radius: 4px; margin: 20px 0;">
      <h3 style="color: #DB6937; margin-top: 0; margin-bottom: 8px; font-size: 16px;">Step 2: Complete Course Fee Payment (${data.feeTier || 'Partial Funding Fee'})</h3>
      <p style="line-height: 1.5; font-size: 15px; margin: 0 0 10px 0; color: #23275F;">
        As a faculty, staff, postdoc, or non-student participant, this program is partially funded by the club. Please complete your registration payment using your personalized PayPal link below:
      </p>
      ${data.paypalLink ? `
      <div>
        <a href="${data.paypalLink}" style="display: inline-block; background-color: #DB6937; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(219, 105, 55, 0.35);">
          💳 Pay via PayPal (${data.feeTier || 'Course Fee'}) &rarr;
        </a>
      </div>` : `
      <div style="color: #DC2626; font-size: 14px; font-weight: bold;">
        ⚠️ Payment link pending. Please contact the club at <a href="mailto:${data.clubEmail || 'skyatuiuc@gmail.com'}">${data.clubEmail || 'skyatuiuc@gmail.com'}</a>.
      </div>`}
    </div>

    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      🕒 In-Person Retreat Schedule & Location
    </h3>
    <ul style="padding-left: 20px; line-height: 1.6; font-size: 15px; color: #23275F;">
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${data.day1Label || 'Friday'}:</strong> ${data.day1Time}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${data.day2Label || 'Saturday'}:</strong> ${data.day2Time}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${data.day3Label || 'Sunday'}:</strong> ${data.day3Time}</li>
      <li style="color: #23275F; margin-top: 8px;">
        <strong>Location:</strong> ${data.location}
        ${data.address ? `<br><span style="color: #718096; font-size: 14px;"><strong>Address:</strong> ${data.address}</span>` : ''}
      </li>
    </ul>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
      <strong style="color: #B45309; font-size: 14px;">⚠️ Important Attendance Note:</strong>
      <p style="font-size: 14px; line-height: 1.5; color: #92400E; margin: 4px 0 0 0;">
        Space is limited. Please ensure you are available for <strong>all 3 days</strong>. If your schedule changes, kindly notify <a href="mailto:${data.clubEmail || 'skyatuiuc@gmail.com'}" style="color: #B45309; font-weight: bold;">${data.clubEmail || 'skyatuiuc@gmail.com'}</a> promptly.
      </p>
    </div>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Looking forward to having you join us!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`
  },

  reminder: {
    id: 'reminder',
    name: 'Registration Reminder',
    subject: 'Action Required: Registration Reminder - SKY Happiness Retreat',
    description: 'Sent to remind accepted applicants to complete their official IAHV registration.',
    renderHtml: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required: Registration Reminder - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 22px; text-align: center; margin-top: 0; margin-bottom: 20px;">Action Required: Registration Reminder</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${data.firstName || 'Participant'}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      This is a quick reminder to complete your official registration for the upcoming <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${data.dates || 'the upcoming retreat dates'}</strong>. Official registration is required to attend.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Be sure to use your <strong style="color: #1F74F1;">.edu email address</strong> if applicable to avail of club funding.
    </p>
    
    ${data.registrationLink ? `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${data.registrationLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(31, 116, 241, 0.3);">
        Complete Registration Here &rarr;
      </a>
    </div>` : ''}
    
    <p style="line-height: 1.6; font-size: 15px; color: #4A5568;">
      If you are no longer able to attend, please reply to this email or reach out to <a href="mailto:${data.clubEmail || 'skyatuiuc@gmail.com'}" style="color: #1F74F1;">${data.clubEmail || 'skyatuiuc@gmail.com'}</a> as soon as possible so your spot can be offered to another applicant.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Looking forward to seeing you soon!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`
  },

  welcome: {
    id: 'welcome',
    name: 'Welcome & Preparation Email',
    subject: 'Welcome to the SKY Happiness Retreat! (Schedule, Location & Details)',
    description: 'Sent 1-2 days before the retreat with location details, parking, what to bring, and schedule.',
    renderHtml: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the SKY Happiness Retreat!</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">🌿 Welcome to the SKY Happiness Retreat!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${data.firstName || 'Participant'}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Welcome to the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${data.dates || 'this weekend'}</strong>! Get ready for an incredible and rejuvenating experience.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 20px; color: #23275F;">
      Please review the following essential information carefully to make the most out of your weekend.
    </p>

    <!-- SCHEDULE -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      🕒 Retreat Schedule
    </h3>
    <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #23275F;">
        <strong style="color: #DB6937;">${data.day1Label || 'Friday'}:</strong> ${data.day1Time}
      </p>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5;">
        <li style="color: #4A5568;">Please arrive early between <strong>15–20 minutes before</strong> for check-in.</li>
        <li style="color: #4A5568;">Have a light dinner beforehand; light snacks will be provided.</li>
      </ul>
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #23275F;">
        <strong style="color: #DB6937;">${data.day2Label || 'Saturday'}:</strong> ${data.day2Time}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #23275F;">
        <strong style="color: #DB6937;">${data.day3Label || 'Sunday'}:</strong> ${data.day3Time}
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5;">
        <li style="color: #4A5568;">Please have lunch beforehand (vegetarian meals recommended).</li>
      </ul>
    </div>

    <!-- VENUE & PARKING -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      📍 Venue & Parking
    </h3>
    <p style="line-height: 1.5; font-size: 15px; margin: 8px 0; color: #23275F;">
      <strong>Location:</strong> ${data.location}
      ${data.address ? `<br><span style="color: #718096; font-size: 14px;"><strong>Address:</strong> ${data.address}</span>` : ''}
    </p>
    <ul style="padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5; margin-bottom: 15px;">
      <li style="color: #4A5568;">Metered street parking is free after 6 PM on weekdays.</li>
      <li style="color: #4A5568;">Campus Lot B1 is free after 6 PM and on weekends.</li>
      <li style="color: #4A5568;"><em>Note: Building doors lock on weekends; a volunteer will be stationed at the entrance to welcome you in.</em></li>
    </ul>

    <!-- WHAT TO BRING -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      🎒 What to Bring
    </h3>
    <ul style="padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.6; margin-bottom: 15px;">
      <li style="color: #4A5568;">Reusable water bottle</li>
      <li style="color: #4A5568;">Your own yoga mat (if you have one; limited mats available on site)</li>
      <li style="color: #4A5568;">Comfortable clothes / gym wear</li>
      <li style="color: #4A5568;">A sweater, jacket, or shawl to stay warm during meditations</li>
    </ul>

    <!-- CONTACT -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      📞 On-Site Contact
    </h3>
    <p style="line-height: 1.5; font-size: 14px; color: #4A5568; margin: 8px 0;">
      If you have questions or trouble accessing the building: <br>
      <strong style="color: #23275F;">${data.contactName}:</strong> ${data.contactPhone} | <a href="mailto:${data.contactEmail || data.clubEmail || 'skyatuiuc@gmail.com'}" style="color: #1F74F1;">${data.contactEmail || data.clubEmail || 'skyatuiuc@gmail.com'}</a>
    </p>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      We can't wait to host you on Friday!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC Team</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`
  },

  completion: {
    id: 'completion',
    name: 'Retreat Completion & Follow-Up',
    subject: 'SKY Happiness Retreat | Congratulations and Next Steps!',
    description: 'Sent after retreat completion with home practice app, Sunday reunions, WhatsApp group, and survey.',
    renderHtml: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations on completing the SKY Happiness Retreat!</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 22px; text-align: center; margin-top: 0; margin-bottom: 20px;">✨ Congratulations on completing the SKY Retreat!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${data.firstName || 'Participant'}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      What an incredible 3 days it's been! We hope the breathwork, meditation, and learnings from this weekend continue to bring peace, focus, and energy into your everyday life.
    </p>

    <!-- HOME PRACTICE -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      🧘 SKY Home Practice & Sattva App
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0;">
      You can practice daily with the guided audio in the <strong>Sattva Meditation App</strong> (under Meditations &rarr; Advanced &rarr; <em>Daily SKY</em>).
    </p>
    <p style="margin: 10px 0 15px 0;">
      <a href="${data.sattvaLink || 'https://www.sattva.life/'}" style="color: #1F74F1; font-weight: bold; text-decoration: none;">Download Sattva App &rarr;</a> (Join our UIUC Circle with code: <strong>KPN8RG</strong>)
    </p>

    <!-- WEEKLY REUNIONS -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      ☀️ Weekly Sunday SKY Reunions
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0;">
      Every Sunday, our club meets to practice together, explore ancient wisdom, and grab lunch together!
    </p>
    <ul style="padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5; margin-bottom: 15px;">
      <li style="color: #4A5568;"><strong>When:</strong> Sundays, 11:00 AM – 12:30 PM CST</li>
      <li style="color: #4A5568;"><strong>Where:</strong> Illini Union (Room announced weekly in WhatsApp)</li>
    </ul>

    <!-- STAY CONNECTED -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      💬 Stay Connected on WhatsApp
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0 15px 0;">
      Join our WhatsApp community group chat to stay updated on morning Zoom practices, workshops, and social hangouts:
    </p>
    <div style="margin: 15px 0;">
      <a href="${data.whatsAppLink}" style="display: inline-block; background-color: #25D366; color: #ffffff !important; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
        Join SKY at UIUC WhatsApp Group &rarr;
      </a>
    </div>

    <!-- SURVEY -->
    ${data.surveyLink ? `
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      📝 Post-Retreat Feedback Survey
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0 12px 0;">
      Your feedback is immensely valuable to us and essential for securing campus funding for future students:
    </p>
    <div style="margin: 12px 0 20px 0;">
      <a href="${data.surveyLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
        Fill Out 2-Minute Survey &rarr;
      </a>
    </div>` : ''}

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      With love and gratitude,<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC Team</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`
  }
};
