const webpush = require('web-push');

const SUPABASE_URL = 'https://vezwkmucythpldeltzvd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // zelfde anon key als in de tool, als env var op Vercel

webpush.setVapidDetails(
  'mailto:sofie@carmi.be', // pas dit gerust aan naar het juiste contact-mailadres
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
    },
    method: opts.method || 'GET',
    body: opts.body || undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${path} -> ${res.status}`);
  return res.status === 204 ? null : res.json();
}

module.exports = async (req, res) => {
  // Beveiliging: enkel Vercel Cron (of iemand met de juiste sleutel) mag dit aanroepen
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Morgen berekenen (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const deadlines = await sb(
      `todo_items?type=eq.deadline&done=eq.false&reminder_sent=eq.false&datum=eq.${tomorrowStr}`
    );

    let verstuurd = 0;
    for (const dl of deadlines) {
      const subs = await sb(`push_subscriptions?persoon=eq.${dl.persoon}`);
      const payload = JSON.stringify({
        title: 'Deadline morgen',
        body: dl.titel,
        url: '/',
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          verstuurd++;
        } catch (e) {
          // Verlopen abonnement (toestel niet meer bereikbaar) -> opruimen
          if (e.statusCode === 404 || e.statusCode === 410) {
            await sb(`push_subscriptions?id=eq.${sub.id}`, { method: 'DELETE', prefer: '' });
          }
        }
      }

      await sb(`todo_items?id=eq.${dl.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ reminder_sent: true }),
      });
    }

    return res.status(200).json({ ok: true, deadlines: deadlines.length, verstuurd });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
