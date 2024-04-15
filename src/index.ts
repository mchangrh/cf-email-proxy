import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext/browser";
export interface Env {
  PSK_VALUE: string;
  SENDER_EMAIL: string;
  SENDER_NAME: string;
  SUBJECT_PREFIX: string;
  EMAIL: SendEmail;
}

function validatePSK(request: Request, env: Env): boolean {
  const encoder = new TextEncoder();
  const pskAttempt = request.headers.get("X-Authentication");
  // check lengths
  if (pskAttempt?.length !== env.PSK_VALUE.length) return false;
  // check encoded
  const pskAttemptByte = encoder.encode(pskAttempt);
  const pskValueByte = encoder.encode(env.PSK_VALUE);
  if (pskAttemptByte.length !== pskValueByte.length) return false;
  // isequal check
  return crypto.subtle.timingSafeEqual(pskAttemptByte, pskValueByte);
}

async function sendEmail(env: Env, recipient: string, subject: string, body: string) {
  const msg = createMimeMessage();
   msg.setSender({ name: env.SENDER_NAME, addr: env.SENDER_EMAIL });
   msg.setRecipient(recipient);
   msg.setSubject(`${env.SUBJECT_PREFIX}: ${subject}`);
   msg.addMessage({contentType: 'text/plain', data: body});

   var message = new EmailMessage(
     env.SENDER_EMAIL, recipient, msg.asRaw()
   );
   await env.EMAIL.send(message);
}

export default {
	async fetch(request: Request, env: Env) {
    // pre-validation
    const passValidation = validatePSK(request, env)
	  if (!passValidation) {
      return new Response("Sorry, you have supplied an invalid key.", { status: 403 });
    }
    // parse body for email
    const body = await request.json();
    const {
      recipient,
      subject,
      message
    } = body as Record<string, string>;
    try {
      await sendEmail(env, recipient, subject, message);
    } catch(err) {
      console.error(err);
      return new Response("Sorry, something went wrong.", { status: 500 });
    }
    return new Response("", { status: 200 });
	},
} satisfies ExportedHandler;