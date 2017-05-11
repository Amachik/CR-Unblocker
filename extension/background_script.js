/* global fetch, chrome */

var browser = browser || chrome;

const mainServer = 'https://cr.onestay.moe/getid';
const backupServer = 'https://crunchy.rubbix.net/';

function setUsCookie(tld) {
	console.log('Setting cookie...');
	console.log('Trying to fetch main server...');

	fetchServer(tld, mainServer)
	.then(sessId => setCookie(sessId, tld))
	.catch((e) => {
		console.log(`Got error ${e}. Trying backup server...`);
		fetchServer(tld, backupServer)
		.then(sessId => setCookie(sessId, tld))
		.catch((_e) => {
			createError(`Main server and backup server couldn't get an session id`);
			console.log(_e);
		});
	});
}

function fetchServer(tld, uri) {
	return new Promise((resolve, reject) => {
		fetch(uri)
		.then((res) => {
			return res.json();
		})
		.then((res) => {
			if (!res.ok) {
				reject(res.error);
			}

			resolve(res.sessionId);
		})
		.catch((e) => {
			reject(e);
		});
	});
}

function setCookie(id, tld) {
	console.log('got session id. Setting cookie.');
	// deleting the cookie sess_id
	browser.cookies.remove({ url: `http://crunchyroll${tld}/`, name: 'sess_id' }, () => {
		browser.cookies.remove({ url: `http://crunchyroll${tld}/`, name: 'c_locale' }, () => {
			// setting the cookie and reloading the page when it's done
			browser.cookies.set({ url: `http://crunchyroll${tld}/`, name: 'sess_id', value: id, domain: `crunchyroll${tld}`, httpOnly: true }, () => {
				browser.cookies.set({ url: `http://crunchyroll${tld}/`, name: 'c_locale', value: 'enUS', domain: `crunchyroll${tld}`, httpOnly: true }, () => {
					console.log('done: ' + id);
					if (typeof browser.tabs.reload === 'function') {
						browser.tabs.reload();
					}
					else {
						browser.tabs.query({ currentWindow: true, active: true }, tabs => {
							tabs.forEach(tab => {
								console.log('reload tab via content script');
								browser.tabs.sendMessage(tab.id, { msg: 'reload' });
							});
						});
					}
				});
			});
		});
	});
}

function createError(e) {
	browser.notifications.create({
		type: 'basic',
		iconUrl: 'icons/Crunchyroll-128.png',
		title: 'CR-Unblocker has encountered an error',
		message: e
	});
}

// when the icon in the taskbar is clicked it will open the cr site and start the function
browser.browserAction.onClicked.addListener(() => {
	setUsCookie('.com');
	browser.tabs.create({ url: 'http://crunchyroll.com/videos/anime/' });
});

// when it recives the message from the content script this will execute and call the function with the correct tld
browser.runtime.onMessage.addListener((message) => {
	setUsCookie(message.msg);
});

browser.runtime.onStartup.addListener(() => {
	setTimeout(() => { setUsCookie('.com'); }, 3000);
});

// removing this because of https://github.com/Onestay/CR-Unblocker/issues/7
