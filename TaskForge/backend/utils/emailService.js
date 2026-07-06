const { Resend } = require("resend");

//@desc: Email transport via official Resend Node.js SDK.
//No SMTP ports required — fully cloud-compatible.

//  BASE TEMPLATE
//  Shared HTML wrapper for all emails.


function baseTemplate({ headerColor = "#6C63FF", headerText, body }) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${headerText}</title>

    <style>
        body,
        table,
        td,
        p,
        a,
        h1,
        h2,
        h3 {
            font-family: "Segoe UI", Roboto, Arial, sans-serif;
        }

        body {
            margin: 0;
            padding: 0;
            background: #f4f7fb;
            color: #1e293b;
        }

        img {
            border: 0;
            display: block;
            max-width: 100%;
            height: auto;
        }

        @media only screen and (max-width: 600px) {

            body {
                margin: 0 !important;
                padding: 0 !important;
            }

            .outer-wrapper {
                padding: 0.5px !important;
            }

            .container {
                width: 109% !important;
                max-width: 100% !important;
                border-radius: 20px !important;
            }

            .header {
                padding: 20px 9px !important;
            }

            .content {
                padding: 20px 15px !important;
                font-size: 15px !important;
                line-height: 1.7 !important;
            }

            .footer {
                padding: 18px !important;
            }

            .heading {
                font-size: 22px !important;
                line-height: 1.3 !important;
            }

            .subheading {
                font-size: 14px !important;
                line-height: 1.6 !important;
            }

            .divider-padding {
                padding: 0 18px !important;
            }
        }
    </style>
</head>

<body>

    <table
        class="outer-wrapper"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
            background:#f4f7fb;
            padding:12px;
        "
    >
        <tr>
            <td align="center">

                <!-- MAIN CONTAINER -->
                <table
                    class="container"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="
                        width:100%;
                        max-width:720px;
                        background:#ffffff;
                        border-radius:16px;
                        overflow:hidden;
                        border:1px solid #e5e7eb;
                        box-shadow:0 12px 40px rgba(15,23,42,0.08);
                    "
                >

                    <!-- HERO IMAGE -->
                    <tr>
                        <td>
                            <img
                                src="https://res.cloudinary.com/dsrtgoxkj/image/upload/v1780455463/Gemini_Generated_Image_tb9bktb9bktb9bkt_bdfgoy.png"
                                alt="TaskForge"
                                width="720"
                                style="
                                    width:100%;
                                    display:block;
                                "
                            />
                        </td>
                    </tr>

                    <!-- HEADER -->
                    <tr>
                        <td
                            class="header"
                            style="
                                background:linear-gradient(135deg, ${headerColor} 0%, #3b82f6 100%);
                                padding:40px 32px;
                                text-align:center;
                            "
                        >

                            <h1
                                class="heading"
                                style="
                                    margin:0;
                                    color:#ffffff;
                                    font-size:25px;
                                    font-weight:700;
                                    line-height:1.2;
                                    letter-spacing:-0.5px;
                                "
                            >
                                ${headerText}
                            </h1>

                            <p
                                class="subheading"
                                style="
                                    margin:14px auto 0;
                                    max-width:500px;
                                    color:rgba(255,255,255,0.92);
                                    font-size:15px;
                                    line-height:1.7;
                                "
                            >
                               A project update requires your attention. Review the details below.
                            </p>

                        </td>
                    </tr>

                    <!-- BODY -->
                    <tr>
                        <td
                            class="content"
                            style="
                                padding:8px 1px;
                                font-size:14px;
                                line-height:1.8;
                                color:#334155;
                            "
                        >
                            ${body}
                        </td>
                    </tr>

                    <!-- DIVIDER -->
                    <tr>
                        <td
                            class="divider-padding"
                            style="
                                padding:0 36px;
                            "
                        >
                            <div
                                style="
                                    height:1px;
                                    background:#e2e8f0;
                                "
                            ></div>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td
                            class="footer"
                            style="
                                background:#f8fafc;
                                padding:24px;
                                text-align:center;
                            "
                        >
                            <p
                                style="
                                    margin:0;
                                    font-size:12px;
                                    line-height:1.7;
                                    color:#64748b;
                                "
                            >
                                This email was sent because you are a registered
                                member of
                                <a
                                    href="${appUrl}"
                                    style="
                                        color:${headerColor};
                                        text-decoration:none;
                                        font-weight:600;
                                    "
                                >
                                    TaskForge
                                </a>.
                            </p>

                            <p
                                style="
                                    margin:10px 0 0;
                                    font-size:12px;
                                    color:#94a3b8;
                                "
                            >
                                © ${new Date().getFullYear()} TaskForge. All rights
                                reserved.
                            </p>

                        </td>
                    </tr>

                </table>
                <!-- END CONTAINER -->

            </td>
        </tr>
    </table>

</body>
</html>
    `;
}

//  PRIORITY BADGE
function priorityBadge(priority = "Medium") {
    const colors = {
        High: { bg: "#fee2e2", text: "#dc2626" },
        Medium: { bg: "#fef9c3", text: "#ca8a04" },
        Low: { bg: "#dcfce7", text: "#16a34a" },
    };
    const c = colors[priority] || colors.Medium;
    return `<span style="display:inline-block;padding:3px 12px;border-radius:20px;background:${c.bg};color:${c.text};font-size:12px;font-weight:600;">${priority}</span>`;
}


//  CTA BUTTON
function ctaButton(label, url, color = "#6C63FF") {
    return `
    <div style="text-align:center;margin-top:28px;">
        <a href="${url}" style="display:inline-block;padding:13px 32px;background:${color};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
            ${label}
        </a>
    </div>`;
}


//  CORE SEND FUNCTION  (Resend SDK)
async function sendEmail({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn("[Email] RESEND_API_KEY not set — email notifications disabled.");
        return;
    }

    const resend = new Resend(apiKey);
    const from = process.env.EMAIL_FROM || "TaskForge <noreply@mmsingh.me>";

    try {
        const response = await resend.emails.send({
            from,
            to,
            subject,
            html,
        });

        if (response.error) {
            console.error(`[Email] Resend API error sending to ${to}:`, response.error);
            return;
        }

        console.log(`[Email] Sent "${subject}" → ${to} (id: ${response.data?.id})`);
    } catch (err) {
        console.error(`[Email] Request failed to ${to}:`, err.message);
    }
}

//  TASK ASSIGNED EMAIL
//  Trigger: createTask — fires for each assigned user

async function sendTaskAssignedEmail(user, task) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const taskUrl = `${appUrl}/user/task-details/${task._id}`;
    const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "Not set";

    const body = `
        <h2 style="margin:0 0 6px;font-size:20px;color:#1a1a2e;">Hey ${user.name}</h2>
        <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
            A new task has been assigned to you. Here are the details:
        </p>

        <div style="background:#f9f9fb;border-left:4px solid #6C63FF;border-radius:8px;padding:20px 18px;margin-bottom:20px;">
            <h3 style="margin:0 0 10px;font-size:16px;color:#1a1a2e;">${task.title}</h3>
            <p style="margin:0 0 14px;color:#555;font-size:14px;line-height:1.6;">
                ${task.description ? task.description.substring(0, 200) + (task.description.length > 200 ? "…" : "") : "No description provided."}
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;width:100px;">Priority</td>
                    <td style="padding:4px 0;">${priorityBadge(task.priority)}</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;">Due Date</td>
                    <td style="padding:4px 0;font-size:13px;color:#333;font-weight:500;">${dueDate}</td>
                </tr>
            </table>
        </div>

        ${ctaButton("View Task", taskUrl)}
    `;

    await sendEmail({
        to: user.email,
        subject: `New Task Assigned: ${task.title}`,
        html: baseTemplate({ headerColor: "#030d3d", headerText: "New Task Assigned", body }),
    });
}

//  TASK UPDATED EMAIL
//  Trigger: updateTask — fires for each assigned user

async function sendTaskUpdatedEmail(user, task) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const taskUrl = `${appUrl}/user/task-details/${task._id}`;
    const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "Not set";

    const body = `
        <h2 style="margin:0 0 6px;font-size:20px;color:#1a1a2e;">Hi ${user.name},</h2>
        <p style="margin:0 0 18px;color:#666;font-size:13px;line-height:1.6;">
            A task assigned to you has been updated.
        </p>

        <div style="background:#f9f9fb;border-left:4px solid #f59e0b;border-radius:8px;padding:20px 18px;margin-bottom:20px;">
            <h3 style="margin:0 0 10px;font-size:16px;color:#1a1a2e;">${task.title}</h3>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;width:100px;">Priority</td>
                    <td style="padding:4px 0;">${priorityBadge(task.priority)}</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;">Due Date</td>
                    <td style="padding:4px 0;font-size:13px;color:#333;font-weight:500;">${dueDate}</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;">Status</td>
                    <td style="padding:4px 0;font-size:13px;color:#333;font-weight:500;">${task.status || "—"}</td>
                </tr>
            </table>
        </div>

        ${ctaButton("Review Task", taskUrl, "#f59e0b")}
    `;

    await sendEmail({
        to: user.email,
        subject: `Task Updated: ${task.title}`,
        html: baseTemplate({ headerColor: "#e9c484d3", headerText: "Task Updated", body }),
    });
}

//  DEADLINE REMINDER EMAIL
//  Trigger: server.js cron (every minute)
//  type: "1H" | "1D"


async function sendDeadlineReminderEmail(user, task, type) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const taskUrl = `${appUrl}/user/task-details/${task._id}`;

    const is1H = type === "1H";
    const urgencyColor = is1H ? "#e45c5cff" : "#e99e69ff";
    const urgencyLabel = is1H ? "Due in 1 Hour" : "Due Tomorrow";
    const subject = is1H
        ? `URGENT: Task Due in 1 Hour — ${task.title}`
        : `Task Due Tomorrow: ${task.title}`;

    const dueTime = task.dueDate
        ? new Date(task.dueDate).toLocaleString("en-US", {
            weekday: "short", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        })
        : "Soon";

    const body = `
        <!-- Urgency Banner -->
        <div style="background:${urgencyColor};border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">${urgencyLabel}</p>
        </div>

        <h2 style="margin:0 0 6px;font-size:20px;color:#1a1a2e;">Hi ${user.name},</h2>
        <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
            ${is1H
            ? "You have <strong>1 hour</strong> left to complete the following task. Don't miss the deadline!"
            : "This task is <strong>due tomorrow</strong>. Make sure you're on track to finish it in time."
        }
        </p>

        <div style="background:#f9f9fb;border-left:4px solid ${urgencyColor};border-radius:8px;padding:20px 18px;margin-bottom:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;color:#1a1a2e;">${task.title}</h3>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;width:100px;">Priority</td>
                    <td style="padding:4px 0;">${priorityBadge(task.priority)}</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;font-size:13px;color:#888;">Deadline</td>
                    <td style="padding:4px 0;font-size:13px;color:${urgencyColor};font-weight:700;">${dueTime}</td>
                </tr>
            </table>
        </div>

        ${ctaButton(is1H ? "Complete Task Now" : "View Task", taskUrl, urgencyColor)}
    `;

    await sendEmail({
        to: user.email,
        subject,
        html: baseTemplate({ headerColor: urgencyColor, headerText: urgencyLabel, body }),
    });
}


//  EXPORTS

module.exports = {
    sendTaskAssignedEmail,
    sendTaskUpdatedEmail,
    sendDeadlineReminderEmail,
};
