import {
	CookieOptions,
	SessionData,
	createCookieSessionStorage,
} from "@remix-run/cloudflare";
import { Context, Hono, MiddlewareHandler } from "hono";

import { session } from "./session";

type GetSecretsFunction<Secret extends string> = (
	context: Context<{ Bindings: BindingsObject<Secret> }>,
) => string[];

type BindingsObject<Secret extends string> = {
	[K in Secret]: string;
};

export function kvSession<
	SecretBinding extends string,
	Data = SessionData,
	FlashData = Data,
>(options: {
	autoCommit?: boolean;
	cookie: Omit<CookieOptions, "secrets"> & {
		name: string;
		secrets: GetSecretsFunction<SecretBinding>;
	};
}): MiddlewareHandler {
	return session<
		{ Bindings: BindingsObject<SecretBinding> },
		"",
		Record<string, unknown>,
		Data,
		FlashData
	>({
		autoCommit: options.autoCommit,
		createSessionStorage(context) {
			let secrets = options.cookie.secrets(context);

			if (secrets.length === 0) {
				throw new ReferenceError("The secrets for the kvSession are not set.");
			}

			return createCookieSessionStorage<Data, FlashData>({
				cookie: { ...options.cookie, secrets },
			});
		},
	});
}

new Hono().use(
	"*",
	kvSession({
		autoCommit: true,
		cookie: {
			name: "__session",
			httpOnly: true,
			secrets(context) {
				return [context.env.SECRET];
			},
		},
	}),
);