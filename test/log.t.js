import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log as Log, name } from "@wiajs/log";

const url = import.meta.url;
const __filename = fileURLToPath(import.meta.url);
// 不带 /
const __dirname = path.dirname(__filename);
// 带 /
const __dirname2 = fileURLToPath(new URL(".", import.meta.url));

const log = Log({ env: `wia:${name(__filename)}` });

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

async function main() {
	console.log({ url, __filename, __dirname, __dirname2, pathname, filename });

	log("hello");
	log.info("info");
	log.warn("warn");
	log.error("error");
	log.err("err");

	log({ a: 1, b: { c: 2, d: { e: 3 } } }, "main");
	log.error({ a: 1, b: { c: 2, d: { e: 3 } } }, "main");
	log.info({ a: 1, b: { c: 2, d: { e: 3 } } }, "main");
	log.warn(
		{
			a: "asdfadfasdfasdfaf",
			b: {
				c: "sdfdfadfasdfasdfasdfaf",
				d: { e: "fadfasdfasdfa asdfa sdf asdfa sdfasfasdfaf" },
			},
		},
		"main",
	);

	delay(1000);
}
