# email_templates.py
# Separate, customizable email templates for SkillForge LMS communications.

PORTAL_DEFAULT_URL = "http://localhost:3000"

def get_onboarding_template(name: str, email: str, temp_password: str, portal_url: str = PORTAL_DEFAULT_URL) -> dict:
    """
    Returns subject, text body, and HTML body for student onboarding.
    """
    subject = "Welcome to SkillForge LMS - Your Temporary Credentials"
    
    text_body = f"""Welcome to SkillForge LMS!

Hello {name},

Your learner account has been created. Below are your temporary credentials to access the learning portal:

Portal Link: {portal_url}
Email/Login ID: {email}
Temporary Password: {temp_password}

FIRST LOGIN INSTRUCTIONS:
For security reasons, you will be required to change your temporary password immediately upon logging in for the first time.

Best regards,
The SkillForge Team
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Welcome to SkillForge LMS!</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Your learner account has been created. Below are your temporary credentials to access the learning portal:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="{portal_url}">{portal_url}</a></p>
          <p style="margin: 5px 0;"><strong>Email / Username:</strong> {email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code>{temp_password}</code></p>
        </div>
        <p><strong>First Login Instructions:</strong><br/>
        For security reasons, you will be required to choose a new password immediately upon logging in for the first time.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from SkillForge LMS.</p>
      </div>
    </body>
    </html>
    """

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "template_type": "onboarding"
    }


def get_announcement_template(name: str, title: str, content: str, portal_url: str = PORTAL_DEFAULT_URL) -> dict:
    """
    Returns subject, text body, and HTML body for targeted announcements.
    """
    subject = f"[SkillForge Announcement] {title}"
    
    text_body = f"""Hello {name},

New Announcement on SkillForge LMS:

{title}
--------------------------------------------------
{content}

View in portal: {portal_url}

Best regards,
The SkillForge Team
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">{title}</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p>{content}</p>
        </div>
        <p><a href="{portal_url}" style="background: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 5px; display: inline-block;">View in Portal</a></p>
      </div>
    </body>
    </html>
    """

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "template_type": "announcement"
    }


def get_ticket_update_template(name: str, ticket_number: str, subject_text: str, update_body: str, portal_url: str = PORTAL_DEFAULT_URL) -> dict:
    subject = f"[Support Update] {ticket_number} - {subject_text}"
    
    text_body = f"""Hello {name},

Your support ticket ({ticket_number}: {subject_text}) has been updated:

"{update_body}"

Log in to SkillForge Support Center to view details or respond: {portal_url}
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #2563eb;">Support Ticket Updated: {ticket_number}</h3>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Your support ticket (<strong>{subject_text}</strong>) has a new update:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p>{update_body}</p>
        </div>
        <p><a href="{portal_url}/support" style="background: #2563eb; color: white; padding: 10px 18px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>
      </div>
    </body>
    </html>
    """

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "template_type": "support_ticket"
    }

def get_subadmin_onboarding_template(name: str, email: str, temp_password: str, assigned_institutions_text: str, privileges_text: str, portal_url: str = PORTAL_DEFAULT_URL) -> dict:
    """
    Returns subject, text body, and HTML body for sub-admin onboarding.
    """
    subject = "SkillForge LMS - Sub-Admin Account Created"
    
    text_body = f"""Welcome to SkillForge LMS!

Hello {name},

Your Sub-Admin account has been created. Below are your credentials to access the admin portal:

Portal Link: {portal_url}
Email/Login ID: {email}
Temporary Password: {temp_password}

Assigned Access Scope:
{assigned_institutions_text}

Granted Privileges:
{privileges_text}

Best regards,
The SkillForge Team
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">SkillForge LMS Sub-Admin Account</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Your sub-admin account has been created. Below are your credentials to access the admin portal:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="{portal_url}">{portal_url}</a></p>
          <p style="margin: 5px 0;"><strong>Email / Username:</strong> {email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code>{temp_password}</code></p>
        </div>
        <h4 style="color: #475569;">Assigned Access Scope:</h4>
        <p>{assigned_institutions_text.replace(chr(10), '<br>')}</p>
        <h4 style="color: #475569;">Granted Privileges:</h4>
        <ul style="padding-left: 20px; margin-top: 5px;">
            {''.join(f'<li>{p.strip()}</li>' for p in privileges_text.split(chr(10)) if p.strip())}
        </ul>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from SkillForge LMS.</p>
      </div>
    </body>
    </html>
    """

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "template_type": "subadmin_onboarding"
    }

