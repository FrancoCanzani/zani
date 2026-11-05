type WaitUntilCtx = {
  waitUntil: (promise: Promise<unknown>) => void
}

export async function sendAppEmail(
  env: Env,
  ctx: WaitUntilCtx | undefined,
  message: {
    to: string
    subject: string
    text: string
    html: string
    devLine: string
    replyTo?: string
    fromName?: string
    attachments?: EmailAttachment[]
  }
) {
  if (env.ENVIRONMENT !== "production") {
    console.log(message.devLine)
    return { delivered: false }
  }

  const sending = env.EMAIL.send({
    from: message.fromName
      ? { email: env.EMAIL_FROM, name: message.fromName }
      : env.EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.attachments?.length
      ? { attachments: message.attachments }
      : {}),
  }).then(() => undefined)

  if (ctx) {
    ctx.waitUntil(sending)
    return { delivered: true }
  }

  await sending
  return { delivered: true }
}
