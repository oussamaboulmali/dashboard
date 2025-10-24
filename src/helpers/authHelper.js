import nodemailer from "nodemailer";

export const sendEmail = async (message) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "mail.aps.dz",
      port: 25,
      auth: {
        user: process.env.ADMIN_MAIL,
        pass: process.env.ADMIN_MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Ignore certificate validation
      },
    });

    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: process.env.RECEPTION_MAIL,
      subject: `🚨 Alerte de compte bloqué - ${process.env.PROJECT_NAME}`,
      html: `
        <h2>Alerte de compte bloqué</h2>
        <p><strong>Temps:</strong> ${new Date().toISOString()}</p>
        <h3>${message}</h3>
      `,
    };

    // Send email asynchronously
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return { message: "Email sent successfully", info };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email: " + error.message);
  }
};
