import { createTransport } from "nodemailer";

const sendMail = async (email, subject, data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .container {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        h1 {
            color: red;
        }
        p {
            margin-bottom: 20px;
            color: #666;
        }
        .otp {
            font-size: 36px;
            color: #7b68ee; /* Purple text */
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>OTP Verification</h1>
        <p>Hello ${data.name} your (One-Time Password) for your account verification is.</p>
        <p class="otp">${data.otp}</p> 
    </div>
</body>
</html>
`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: email,
    subject,
    html,
  });
};

export default sendMail;

export const sendForgotMail = async (subject, data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f3f3f3;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      padding: 20px;
      margin: 20px auto;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      max-width: 600px;
    }
    h1 {
      color: #5a2d82;
    }
    p {
      color: #666666;
    }
    .button {
      display: inline-block;
      padding: 15px 25px;
      margin: 20px 0;
      background-color: #5a2d82;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 16px;
    }
    .footer {
      margin-top: 20px;
      color: #999999;
      text-align: center;
    }
    .footer a {
      color: #5a2d82;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset Your Password</h1>
    <p>Hello,</p>
    <p>You have requested to reset your password. Please click the button below to reset your password.</p>
    <a href="${process.env.frontendurl}/reset-password/${data.token}" class="button">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
    <div class="footer">
      <p>Thank you,<br>Your EduTech Team</p>
      <p><a href="${process.env.frontendurl}">${process.env.frontendurl}</a></p>
    </div>
  </div>
</body>
</html>
`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: data.email,
    subject,
    html,
  });
};

export const sendCallbackRequestMail = async (data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL || process.env.Gmail;
  const safeMessage = data.message || "No additional details";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Call Back Request</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f4f7fb; padding:20px;">
  <div style="max-width:620px; margin:0 auto; background:white; border-radius:10px; padding:20px; border:1px solid #dbe7ff;">
    <h2 style="margin-top:0; color:#1e3a8a;">New Call Back Request</h2>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email || "Not provided"}</p>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>Message:</strong> ${safeMessage}</p>
    <p style="margin-top:20px; color:#6b7280;">Submitted from SmartLearn AI chatbot.</p>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: adminEmail,
    subject: "SmartLearn AI - Call Back Request",
    html,
  });
};

export const sendRoleUpdateMail = async (data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const role = String(data?.role || "user").toLowerCase();
  const isAdmin = role === "admin";
  const userName = data?.name || "Learner";

  const subject = isAdmin
    ? "Congratulations! You are now an Admin"
    : "Your SmartLearn role has been updated";

  const title = isAdmin ? "Congratulations, Admin Access Granted" : "Role Updated";
  const subtitle = isAdmin
    ? "You have been promoted to Admin on SmartLearn AI."
    : "Your account role was updated by platform superadmin.";
  const nextSteps = isAdmin
    ? "<li>Log in again to refresh role permissions.</li><li>Access Admin panel to manage courses and users.</li>"
    : "<li>If this change is unexpected, contact support.</li>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Role Update</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f4f7fb; padding:20px;">
  <div style="max-width:620px; margin:0 auto; background:white; border-radius:10px; padding:20px; border:1px solid #dbe7ff;">
    <h2 style="margin-top:0; color:#1e3a8a;">${title}</h2>
    <p>Hello ${userName},</p>
    <p>${subtitle}</p>
    <p><strong>New Role:</strong> ${role}</p>
    <ul>${nextSteps}</ul>
    <p style="margin-top:20px; color:#6b7280;">SmartLearn AI Team</p>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: data.email,
    subject,
    html,
  });
};

export const sendContactMail = async (data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const adminEmail = process.env.ADMIN_EMAIL || process.env.Gmail;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Message</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f4f7fb; padding:20px;">
  <div style="max-width:620px; margin:0 auto; background:white; border-radius:10px; padding:20px; border:1px solid #dbe7ff;">
    <h2 style="margin-top:0; color:#1e3a8a;">New Contact Message</h2>
    <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap; margin-top:0;">${escapeHtml(data.message)}</p>
    <p style="margin-top:20px; color:#6b7280;">Submitted from SmartLearn AI contact form.</p>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: adminEmail,
    subject: "SmartLearn AI - New Contact Message",
    html,
  });
};

export const sendContactReplyMail = async (data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const subject = data.subject || "SmartLearn AI Support Reply";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Support Reply</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f4f7fb; padding:20px;">
  <div style="max-width:620px; margin:0 auto; background:white; border-radius:10px; padding:20px; border:1px solid #dbe7ff;">
    <h2 style="margin-top:0; color:#1e3a8a;">SmartLearn AI Support</h2>
    <p>Hello ${escapeHtml(data.name)},</p>
    <p style="white-space:pre-wrap; margin-top:0;">${escapeHtml(data.message)}</p>
    <hr style="margin:20px 0; border:none; border-top:1px solid #e5e7eb;" />
    <p style="color:#6b7280; font-size:0.9rem;">If you have more questions, reply to this email.</p>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: data.email,
    subject,
    html,
  });
};

export const sendNewsletterCampaignMail = async (data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const subject = String(data.subject || "SmartLearn AI Newsletter").trim();
  const bodyText = String(data.body || "").trim();
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const htmlBody = paragraphs
    .map((paragraph) => `<p style="margin:0 0 12px; line-height:1.6;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:20px; background:#f4f7fb; font-family:Arial, sans-serif; color:#111827;">
  <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dbe7ff; border-radius:10px; padding:20px;">
    <h2 style="margin:0 0 14px; color:#1d4ed8;">SmartLearn AI</h2>
    ${htmlBody || "<p>No content provided.</p>"}
    <hr style="margin:20px 0; border:none; border-top:1px solid #e5e7eb;" />
    <p style="margin:0; font-size:12px; color:#6b7280;">You are receiving this because you subscribed to SmartLearn AI updates.</p>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: process.env.Gmail,
    to: data.to,
    subject,
    html,
  });
};
