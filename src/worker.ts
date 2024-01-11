/*
Date Time Tool Functions
*/
function padTwoDigits(num) {
	return num.toString().padStart(2, "0");
}

function dateInYyyyMmDdHhMmSs(date, dateDiveder = "-") {
	return (
		[
			date.getFullYear(),
			padTwoDigits(date.getMonth() + 1),
			padTwoDigits(date.getDate()),
		].join(dateDiveder) +
		" " +
		[
			padTwoDigits(date.getHours()),
			padTwoDigits(date.getMinutes()),
			'00',
		].join(":")
	);
}

async function triggerEvent(event, kv, emailworker, sender, recipient) {
	// Handling JST
	const jstNow = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000))//.toLocaleString({ timeZone: 'Asia/Tokyo' });
	console.log(`cron processed: event scheduledTime date jst = ${dateInYyyyMmDdHhMmSs(jstNow)}`)

	// Define App Center URL to get release info
	const MACOS_BETA_RELEASE_URL = 'https://install.appcenter.ms/api/v0.1/apps/cloudflare/1.1.1.1-macos/distribution_groups/beta'
	//const MACOS_STABLE_RELEASE_URL = 'https://install.appcenter.ms/orgs/cloudflare/apps/1.1.1.1-macos-1/distribution_groups/release'
	//const WINDOWS_BETA_RELEASE_URL = 'https://install.appcenter.ms/orgs/cloudflare/apps/1.1.1.1-windows/distribution_groups/beta'
	//const WINDOWS_STABLE_RELEASE_URL = 'https://install.appcenter.ms/orgs/cloudflare/apps/1.1.1.1-windows-1/distribution_groups/release'

	const response = await fetch(`${MACOS_BETA_RELEASE_URL}/public_releases`)
	//console.log(await response.json())
	const release: Array = await response.json();

	// KV.put with key = yyyy-mm-dd, value = ####
	console.log(`Current Release ID = ${release[0].id}, Type = ${typeof (release[0].id)}`)
	await kv.put(dateInYyyyMmDdHhMmSs(jstNow).slice(0, 10), release[0].id);

	// KV.get with key = yesterday
	const yesterday = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate() - 1);
	const previousReleaseId = await kv.get(dateInYyyyMmDdHhMmSs(yesterday).slice(0, 10))
	console.log(`Previous Release ID = ${previousReleaseId}, Type = ${typeof (previousReleaseId)}`)

	// if current release id correnpond to the previous one, do nothing
	if (release[0].id == previousReleaseId) {
		console.log("No New Version is released")
		return new Response("No New Version is released");
	}

	// if current release id is different from the previous one, send email notification
	const response2 = await fetch(`${MACOS_BETA_RELEASE_URL}/releases/${release[0].id}`)
	const detail = await response2.json() as Object;
	//console.log(detail)
	const uploadedAt: Date = new Date(detail.uploaded_at)
	const uploadedAtJst: String = uploadedAt.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
	const subject = `Latest Release: ${detail.app_display_name} ${detail.short_version} (${uploadedAtJst})`
	console.log("New version release is detected", subject)

	const msg = createMimeMessage();
	// wrangler secret put SENDER
	msg.setSender({ name: "WARP Release Worker", addr: sender });
	// wrangler secret put RECIPIENT 
	msg.setRecipient(recipient);
	msg.setSubject(subject);
	msg.addMessage({
		contentType: 'text/plain',
		data: detail.release_notes
	});

	var message = new EmailMessage(
		sender,
		recipient,
		msg.asRaw()
	);
	try {
		await emailworker.send(message);
	} catch (e) {
		return new Response(e.message);
	}
}

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export interface Env {
	WARP_RELEASE_KV: KVNamespace;
	EMAIL_WORKER: SendEmail
}

export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(triggerEvent(event, env.WARP_RELEASE_KV, env.EMAIL_WORKER, env.SENDER, env.RECIPIENT));
	}
};
