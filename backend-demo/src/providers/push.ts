import { cfg, has } from '../config.js'

export type SendResult = { ok: boolean; provider: string; id?: string; error?: string }

export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<{ ok: boolean; provider: string; delivered: number; error?: string }> {
  if (tokens.length === 0) return { ok: true, provider: 'expo-push', delivered: 0 }
  try {
    const messages = tokens.slice(0, 100).map((to) => ({
      to,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      channelId: 'default',
    }))
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        host: 'exp.host',
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(messages),
    })
    const json: any = await res.json()
    if (!res.ok) {
      return { ok: false, provider: 'expo-push', delivered: 0, error: json?.errors?.[0]?.message ?? `HTTP ${res.status}` }
    }
    const tickets: any[] = json.data ?? []
    const errored = tickets.filter((t) => t.status === 'error')
    return {
      ok: errored.length < tickets.length,
      provider: 'expo-push',
      delivered: tickets.filter((t) => t.status === 'ok').length,
      error: errored[0]?.message,
    }
  } catch (e: any) {
    void cfg
    void has
    return { ok: false, provider: 'expo-push', delivered: 0, error: e?.message }
  }
}
