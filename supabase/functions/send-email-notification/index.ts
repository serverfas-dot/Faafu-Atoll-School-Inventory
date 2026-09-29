import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  to: string;
  subject: string;
  message: string;
  requesterName?: string;
  approverName?: string;
  approverSignature?: string;
  items?: Array<{ name: string; quantity: number }>;
  status?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, message, requesterName, approverName, approverSignature, items, status }: EmailPayload = await req.json();

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    console.log("Email service check:", {
      resend: RESEND_API_KEY ? "Present" : "Missing",
      gmail: (GMAIL_USER && GMAIL_APP_PASSWORD) ? "Present" : "Missing"
    });

    if (!RESEND_API_KEY && !GMAIL_USER) {
      console.error("No email service configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          details: "Please configure either RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let itemsHtml = "";
    if (items && items.length > 0) {
      itemsHtml = `
        <div style="margin-top: 25px;">
          <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Requested Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #dbeafe;">
            <thead>
              <tr style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                <th style="padding: 14px; text-align: left; color: #ffffff; font-weight: 600; font-size: 15px;">Item Name</th>
                <th style="padding: 14px; text-align: center; color: #ffffff; font-weight: 600; font-size: 15px; width: 120px;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#eff6ff' : '#ffffff'};">
                  <td style="padding: 12px; border: 1px solid #dbeafe; color: #1e40af; font-size: 14px;">${item.name}</td>
                  <td style="padding: 12px; border: 1px solid #dbeafe; text-align: center; color: #1e40af; font-weight: 600; font-size: 14px;">${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const statusColor = status === "approved" ? "#10b981" : status === "rejected" ? "#ef4444" : "#3b82f6";
    const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
    const statusIcon = status === "approved" ? "✓" : status === "rejected" ? "✗" : "ℹ";

    // School logo URL from Supabase Storage
    const schoolLogoUrl = "https://puymnmmvgvypqgbhgtww.supabase.co/storage/v1/object/public/assets/school-logo.png";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f9ff;">
          <div style="max-width: 600px; margin: 0 auto; padding: 30px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1); overflow: hidden; border: 1px solid #dbeafe;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
                <img src="${schoolLogoUrl}?t=${Date.now()}" alt="Faafu Atoll School" style="width: 80px; height: 80px; margin: 0 auto 20px; display: block; border: 0; outline: none;" width="80" height="80" />
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Stock Request ${statusText}</h1>
              </div>

              <div style="padding: 35px 30px;">
                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin-bottom: 25px; border-radius: 4px;">
                  <p style="color: #1e40af; font-size: 15px; margin: 0; line-height: 1.6;">${message}</p>
                </div>

                ${requesterName ? `
                  <div style="margin-bottom: 15px;">
                    <span style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Requested By:</span>
                    <p style="color: #1e293b; font-size: 16px; margin: 5px 0 0 0; font-weight: 600;">${requesterName}</p>
                  </div>
                ` : ''}

                ${approverName ? `
                  <div style="margin-bottom: 20px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${status === 'approved' ? 'Approved By:' : status === 'rejected' ? 'Rejected By:' : 'Reviewed By:'}</span>
                    <p style="color: #1e293b; font-size: 16px; margin: 5px 0 10px 0; font-weight: 600;">${approverName}</p>
                    ${approverSignature ? `
                      <div style="margin-top: 15px;">
                        <span style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Digital Signature:</span>
                        <div style="background-color: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; display: inline-block; max-width: 250px;">
                          <img src="${approverSignature}" alt="Digital Signature of ${approverName}" style="display: block; max-width: 100%; height: auto; max-height: 100px;" />
                        </div>
                        <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0; font-style: italic;">Electronically signed by ${approverName}</p>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                ${itemsHtml}
              </div>

              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; text-align: center; border-top: 1px solid #bfdbfe;">
                <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 500;">Inventory Management System</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Automated notification - Do not reply to this email</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    let emailResult;

    // Try Gmail first if configured
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      console.log("Attempting to send via Gmail SMTP...");
      try {
        // Connect to Gmail SMTP server
        const conn = await Deno.connect({
          hostname: "smtp.gmail.com",
          port: 587,
          transport: "tcp",
        });

        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        async function readLine(conn: Deno.Conn): Promise<string> {
          const buffer = new Uint8Array(1024);
          const n = await conn.read(buffer);
          if (n === null) throw new Error("Connection closed");
          return textDecoder.decode(buffer.subarray(0, n));
        }

        async function sendCommand(conn: Deno.Conn, command: string): Promise<string> {
          await conn.write(textEncoder.encode(command + "\r\n"));
          return await readLine(conn);
        }

        // SMTP handshake
        await readLine(conn); // Welcome message
        await sendCommand(conn, "EHLO smtp.gmail.com");
        await sendCommand(conn, "STARTTLS");

        // Upgrade to TLS
        const tlsConn = await Deno.startTls(conn, { hostname: "smtp.gmail.com" });

        await sendCommand(tlsConn, "EHLO smtp.gmail.com");
        await sendCommand(tlsConn, "AUTH LOGIN");
        await sendCommand(tlsConn, btoa(GMAIL_USER));
        await sendCommand(tlsConn, btoa(GMAIL_APP_PASSWORD));
        await sendCommand(tlsConn, `MAIL FROM:<${GMAIL_USER}>`);
        await sendCommand(tlsConn, `RCPT TO:<${to}>`);
        await sendCommand(tlsConn, "DATA");

        const emailMessage = [
          `From: ${GMAIL_USER}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          htmlContent,
          `.`,
        ].join("\r\n");

        await tlsConn.write(textEncoder.encode(emailMessage + "\r\n"));
        const dataResponse = await readLine(tlsConn);

        await sendCommand(tlsConn, "QUIT");
        tlsConn.close();

        console.log("Email sent successfully via Gmail SMTP");
        emailResult = { success: true, service: 'gmail', message: 'Email sent via Gmail' };
      } catch (gmailError) {
        console.error("Gmail SMTP error, falling back to Resend:", gmailError);

        // Fall back to Resend if Gmail fails
        if (RESEND_API_KEY) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Inventory System <onboarding@resend.dev>",
              to: [to],
              subject: subject,
              html: htmlContent,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Both services failed. Resend: ${errorText}`);
          }

          const data = await res.json();
          console.log("Email sent successfully via Resend (fallback):", data);
          emailResult = { success: true, service: 'resend', data };
        } else {
          throw gmailError;
        }
      }
    } else if (RESEND_API_KEY) {
      // Use Resend if Gmail not configured
      console.log("Attempting to send via Resend...");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Inventory System <onboarding@resend.dev>",
          to: [to],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend API error:", errorText);

        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorText;
        } catch (e) {
          // If not JSON, use raw text
        }

        return new Response(
          JSON.stringify({
            error: "Failed to send email via Resend",
            details: errorDetails,
            status: res.status
          }),
          {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const data = await res.json();
      console.log("Email sent successfully via Resend:", data);
      emailResult = { success: true, service: 'resend', data };
    }

    return new Response(
      JSON.stringify(emailResult),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
