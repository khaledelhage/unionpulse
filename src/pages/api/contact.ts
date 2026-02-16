import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Anti-spam : honeypot
  if (data.website) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Anti-spam : délai minimum (3 secondes)
  const loaded = parseInt(data._loaded || '0', 10);
  if (!loaded || Date.now() - loaded < 3000) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { prenom, nom, organisation, telephone, email, message, moment } = data;

  if (!organisation || !email) {
    return new Response(
      JSON.stringify({ error: 'Please fill in all required fields.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const formatMoment = (raw: string) => {
    const date = new Date(raw);
    return date.toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const momentFormate = moment ? formatMoment(moment) : null;

  const htmlBody = `
    <h2>New inquiry from UnionPulse.com</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">First name</td><td style="padding:8px 0;">${prenom || '—'}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">Last name</td><td style="padding:8px 0;">${nom || '—'}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">Organization</td><td style="padding:8px 0;">${organisation}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">Phone</td><td style="padding:8px 0;">${telephone || '—'}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">Questions or needs</td><td style="padding:8px 0;">${message || '—'}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;font-weight:bold;vertical-align:top;">Preferred time</td><td style="padding:8px 0;">${momentFormate || '—'}</td></tr>
    </table>
  `;

  const textBody = [
    'NEW INQUIRY FROM UNIONPULSE.COM',
    '',
    `First name: ${prenom || '—'}`,
    `Last name: ${nom || '—'}`,
    `Organization: ${organisation}`,
    `Phone: ${telephone || '—'}`,
    `Email: ${email}`,
    `Questions or needs: ${message || '—'}`,
    `Preferred time: ${momentFormate || '—'}`,
  ].join('\n');

  try {
    await resend.emails.send({
      from: 'UnionPulse.com <noreply@unionpulse.com>',
      to: 'info@neosapiens.com',
      replyTo: email,
      subject: `New inquiry from ${organisation}`,
      html: htmlBody,
      text: textBody,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Resend error:', err);
    return new Response(
      JSON.stringify({ error: 'An error occurred while sending the message.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
