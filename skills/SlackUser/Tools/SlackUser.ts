#!/usr/bin/env bun
/**
 * SlackUser — read Slack with a personal user token (xoxp-), send only behind
 * an explicit, persistent on/off switch.
 *
 * The sending gate is deterministic and lives on disk, not in model judgment:
 * `send` refuses unless the mode file says `on`.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_CONFIG_FILE = path.join(SKILL_DIRECTORY, ".env.local");
const HOME_CONFIG_FILE = path.join(process.env.HOME || "", ".claude", ".env");
const DEFAULT_MODE_FILE = path.join(SKILL_DIRECTORY, ".sending-mode");
const DEFAULT_DIRECTORY_FILE = path.join(SKILL_DIRECTORY, "data", "directory.json");
const CONTACTS_SEED_FILE = path.join(process.env.HOME || "", ".claude", "skills", "slack-file-sender", "data", "contacts.json");
const SLACK_API_URL = "https://slack.com/api";
const MAX_PULL_LIMIT = 100;
const MAX_LIST_LIMIT = 1000;
const MAX_HYDRATE_LOOKUPS = 30;
const LOOKUP_RETRY_MS = 7 * 24 * 60 * 60 * 1000;
const DIRECTORY_VERSION = 1;

type Command = "help" | "auth" | "sending" | "list" | "pull" | "thread" | "send" | "who";

export interface Options {
    command: Command;
    mode?: "status" | "on" | "off";
    channel?: string;
    text?: string;
    thread?: string;
    ts?: string;
    limit?: number;
    oldest?: string;
    latest?: string;
    inclusive?: boolean;
    types?: string;
    query?: string;
    refresh?: boolean;
}

if (import.meta.main) {
    main().catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "Could not complete the Slack request");
        process.exitCode = 1;
    });
}

async function main(): Promise<void> {
    const options = parseOptions(process.argv.slice(2));

    if (options.command === "help") {
        console.log(usageText());
        return;
    }

    if (options.command === "sending") {
        if (options.mode === "status") {
            console.log(`Slack sending is ${await readSendingMode()}.`);
            return;
        }
        await writeSendingMode(options.mode as "on" | "off");
        console.log(`Slack sending is now ${options.mode}.`);
        return;
    }

    const directory = await readDirectory();

    if (options.command === "who" && !options.refresh) {
        console.log(JSON.stringify(describeDirectory(directory, options.query), null, 2));
        return;
    }

    const token = await readSlackUserToken();

    if (options.command === "auth") {
        const result = await callSlack(token, "auth.test");
        console.log(
            `Slack user token authenticated as ${result.user_id || result.user || "unknown user"} in ${result.team_id || result.team || "unknown workspace"}. Sending is ${await readSendingMode()}. ${Object.keys(directory.people).length} people and ${Object.keys(directory.channels).length} conversations remembered.`,
        );
        return;
    }

    if (options.command === "who") {
        await refreshDirectory(token, directory);
        await writeDirectory(directory);
        console.log(JSON.stringify(describeDirectory(directory, options.query), null, 2));
        return;
    }

    if (options.command === "list") {
        const conversations = await listConversations(token, options.types as string, options.limit as number);
        rememberConversations(directory, conversations);
        await hydrateUnknownPeople(token, directory);
        await writeDirectory(directory);
        const query = options.query?.toLowerCase();
        const matched = query
            ? conversations.filter((entry) => describeConversation(directory, entry).toLowerCase().includes(query))
            : conversations;
        console.log(
            JSON.stringify(
                matched.map((entry) => ({
                    id: entry.id,
                    name: describeConversation(directory, entry),
                    isChannel: Boolean(entry.is_channel),
                    isPrivate: Boolean(entry.is_private),
                    isIm: Boolean(entry.is_im),
                    isMember: entry.is_member,
                })),
                null,
                2,
            ),
        );
        return;
    }

    const channel = await resolveChannel(token, directory, options.channel as string);

    if (options.command === "send") {
        const mode = await readSendingMode();
        if (mode !== "on") {
            throw new Error(
                "Slack sending is off. Ask the user first; only they can authorize `sending on`. Nothing was sent.",
            );
        }
        const result = await callSlack(token, "chat.postMessage", {
            channel,
            text: options.text,
            ...(options.thread ? { thread_ts: options.thread } : {}),
        });
        touchConversation(directory, channel, "last_sent");
        await writeDirectory(directory);
        console.log(
            `Slack message sent to ${describeChannelId(directory, channel)} (${channel})${result.ts ? ` at ${result.ts}` : ""}.`,
        );
        return;
    }

    const method = options.command === "thread" ? "conversations.replies" : "conversations.history";
    const result = await callSlack(token, method, {
        channel,
        limit: options.limit,
        ...(options.command === "thread" ? { ts: options.ts } : {}),
        ...(options.oldest ? { oldest: options.oldest } : {}),
        ...(options.latest ? { latest: options.latest } : {}),
        ...(options.inclusive ? { inclusive: true } : {}),
    });
    const messages = Array.isArray(result.messages) ? result.messages : [];
    touchConversation(directory, channel, "last_pulled");
    rememberMessageAuthors(directory, messages);
    await hydrateUnknownPeople(token, directory);
    await writeDirectory(directory);
    console.log(
        JSON.stringify(
            {
                channel,
                channelName: describeChannelId(directory, channel),
                hasMore: Boolean(result.has_more),
                people: namesForMessages(directory, messages),
                messages,
            },
            null,
            2,
        ),
    );
}

export function parseOptions(args: string[]): Options {
    const [command, ...rest] = args;
    if (!command || command === "--help" || command === "-h") return { command: "help" };
    if (rest.includes("--help") || rest.includes("-h")) return { command: "help" };
    if (!["auth", "sending", "list", "pull", "thread", "send", "who"].includes(command)) {
        throw new Error(`Unknown Slack command: ${command}\n\n${usageText()}`);
    }

    if (command === "auth") {
        if (rest.length > 0) throw new Error(`auth does not accept options.\n\n${usageText()}`);
        return { command: "auth" };
    }
    if (command === "sending") return parseSendingMode(rest);

    const values = parseFlags(rest);

    if (command === "who") {
        if (values.channel || values.text || values.thread || values.ts || values.oldest || values.latest || values.types || values.limit) {
            throw new Error(`who only accepts --query and --refresh.\n\n${usageText()}`);
        }
        return { command: "who", query: optionalOption(values.query), refresh: Boolean(values.refresh) };
    }

    if (values.refresh) throw new Error(`--refresh is only valid on who.\n\n${usageText()}`);

    if (command === "list") {
        if (values.text || values.thread || values.channel || values.ts || values.oldest || values.latest) {
            throw new Error(`list only accepts --types, --query, and --limit.\n\n${usageText()}`);
        }
        return {
            command: "list",
            types: optionalOption(values.types) || "public_channel,private_channel,mpim,im",
            query: optionalOption(values.query),
            limit: parseLimit(values.limit, MAX_LIST_LIMIT, 200),
        };
    }

    const channel = requiredOption(values.channel, "--channel");

    if (command === "send") {
        if (values.inclusive || values.limit || values.oldest || values.latest || values.ts || values.types || values.query) {
            throw new Error(`send only accepts --channel, --text, and --thread.\n\n${usageText()}`);
        }
        return {
            command: "send",
            channel,
            text: requiredOption(values.text, "--text"),
            thread: optionalOption(values.thread),
        };
    }

    if (values.text || values.types || values.query) {
        throw new Error(`${command} does not accept --text, --types, or --query.\n\n${usageText()}`);
    }
    if (command === "pull" && values.ts) throw new Error(`pull does not accept --ts; use thread --ts.\n\n${usageText()}`);
    if (command === "thread" && values.thread) throw new Error(`thread uses --ts, not --thread.\n\n${usageText()}`);

    return {
        command: command as "pull" | "thread",
        channel,
        ...(command === "thread" ? { ts: requiredOption(values.ts, "--ts") } : {}),
        limit: parseLimit(values.limit, MAX_PULL_LIMIT, MAX_PULL_LIMIT),
        oldest: optionalOption(values.oldest),
        latest: optionalOption(values.latest),
        inclusive: Boolean(values.inclusive),
    };
}

function parseSendingMode(args: string[]): Options {
    if (args.length === 0 || args[0] === "status") {
        if (args.length > 1) throw new Error(`sending status does not accept options.\n\n${usageText()}`);
        return { command: "sending", mode: "status" };
    }
    if (args.length !== 1 || !["on", "off"].includes(args[0])) {
        throw new Error(`Use sending on, sending off, or sending status.\n\n${usageText()}`);
    }
    return { command: "sending", mode: args[0] as "on" | "off" };
}

function parseFlags(args: string[]): Record<string, string | boolean> {
    const values: Record<string, string | boolean> = {};
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === "--inclusive") {
            values.inclusive = true;
            continue;
        }
        if (argument === "--refresh") {
            values.refresh = true;
            continue;
        }
        const key = {
            "--channel": "channel",
            "--text": "text",
            "--thread": "thread",
            "--ts": "ts",
            "--limit": "limit",
            "--oldest": "oldest",
            "--latest": "latest",
            "--types": "types",
            "--query": "query",
        }[argument];
        if (!key) throw new Error(`Unknown option: ${argument}\n\n${usageText()}`);
        const value = args[index + 1];
        if (value === undefined || value.startsWith("--")) {
            throw new Error(`Missing value for ${argument}\n\n${usageText()}`);
        }
        values[key] = value;
        index += 1;
    }
    return values;
}

function requiredOption(value: string | boolean | undefined, name: string): string {
    const normalized = optionalOption(value);
    if (!normalized) throw new Error(`${name} is required.\n\n${usageText()}`);
    return normalized;
}

function optionalOption(value: string | boolean | undefined): string | undefined {
    const normalized = String(value ?? "").trim();
    return normalized && normalized !== "true" ? normalized : undefined;
}

function parseLimit(value: string | boolean | undefined, max: number, fallback: number): number {
    const raw = optionalOption(value);
    if (!raw) return fallback;
    if (!/^\d+$/.test(raw)) throw new Error("--limit must be a whole number.");
    const limit = Number(raw);
    if (limit < 1 || limit > max) throw new Error(`--limit must be between 1 and ${max}.`);
    return limit;
}

export function validateUserToken(value: unknown): string {
    const token = String(value ?? "").trim();
    if (!token) {
        throw new Error(
            "Slack user token is missing. Set SLACK_USER_TOKEN in ~/.claude/.env or this skill's .env.local (mode 600).",
        );
    }
    if (!token.startsWith("xoxp-")) {
        throw new Error("Slack credentials must use a personal user token that starts with xoxp-.");
    }
    return token;
}

export function extractUserToken(configText: unknown): string | undefined {
    for (const line of String(configText ?? "").split(/\r?\n/)) {
        const match = line.match(/^\s*(?:export\s+)?SLACK_USER_TOKEN\s*=\s*(.*?)\s*$/);
        if (!match) continue;
        const value = match[1].replace(/^(["'])(.*)\1$/, "$2").trim();
        if (value) return value;
    }
    return undefined;
}

async function readSlackUserToken(): Promise<string> {
    if (process.env.SLACK_USER_TOKEN) return validateUserToken(process.env.SLACK_USER_TOKEN);

    const explicit = process.env.SLACK_USER_CONFIG_FILE;
    const candidates = explicit ? [explicit] : [HOME_CONFIG_FILE, SKILL_CONFIG_FILE];
    for (const candidate of candidates) {
        const file = await fs.stat(candidate).catch(() => null);
        if (!file) continue;
        if ((file.mode & 0o077) !== 0) throw new Error(`Slack token file must use mode 600: ${candidate}`);
        const token = extractUserToken(await fs.readFile(candidate, "utf8"));
        if (token) return validateUserToken(token);
    }
    throw new Error(
        `Slack user token is missing. Add SLACK_USER_TOKEN=xoxp-... to ${candidates[0]} (mode 600), or export SLACK_USER_TOKEN.`,
    );
}

async function readSendingMode(): Promise<"on" | "off"> {
    const modeFile = process.env.SLACK_USER_MODE_FILE || DEFAULT_MODE_FILE;
    const mode = await fs
        .readFile(modeFile, "utf8")
        .then((value: string) => value.trim())
        .catch((error: { code?: string }) => (error?.code === "ENOENT" ? "off" : Promise.reject(error)));
    if (mode === "on" || mode === "off") return mode;
    throw new Error(`Slack sending mode must be on or off: ${modeFile}`);
}

async function writeSendingMode(mode: "on" | "off"): Promise<void> {
    const modeFile = process.env.SLACK_USER_MODE_FILE || DEFAULT_MODE_FILE;
    await fs.mkdir(path.dirname(modeFile), { recursive: true, mode: 0o700 });
    await fs.writeFile(modeFile, `${mode}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.chmod(modeFile, 0o600);
}

interface Conversation {
    id: string;
    name?: string;
    user?: string;
    is_channel?: boolean;
    is_private?: boolean;
    is_im?: boolean;
    is_member?: boolean;
    [key: string]: unknown;
}

export function conversationLabel(entry: Conversation): string {
    if (entry.is_im) return `@${entry.user || entry.id}`;
    return entry.name ? `#${entry.name}` : entry.id;
}

export function isConversationId(value: string): boolean {
    return /^[CDGV][A-Z0-9]{6,}$/.test(value);
}

async function listConversations(token: string, types: string, limit: number): Promise<Conversation[]> {
    const collected: Conversation[] = [];
    let cursor: string | undefined;
    do {
        const result = await callSlack(token, "users.conversations", {
            types,
            limit: Math.min(limit, 200),
            exclude_archived: true,
            ...(cursor ? { cursor } : {}),
        });
        collected.push(...((result.channels as Conversation[]) || []));
        cursor = (result.response_metadata as { next_cursor?: string } | undefined)?.next_cursor || undefined;
    } while (cursor && collected.length < limit);
    return collected.slice(0, limit);
}

/**
 * Accepts a raw ID, `#channel-name`, `@person`, a remembered name, or an email.
 * Cache first: anything pulled, sent to, or listed before resolves with no API call.
 * A miss costs one conversation list, and what it learns is written back so the
 * same name is free next time.
 */
async function resolveChannel(token: string, directory: Directory, value: string): Promise<string> {
    if (isConversationId(value)) {
        rememberChannel(directory, { id: value, kind: kindFromId(value) });
        return value;
    }

    const cached = lookupTarget(directory, value);
    if (cached.people.length > 1) throw ambiguousPersonError(value, cached.people);
    if (cached.channel) return cached.channel.id;
    if (cached.people[0]?.dm_channel) return cached.people[0].dm_channel as string;
    if (cached.people[0]) return await openDirectMessage(token, directory, cached.people[0]);

    const conversations = await listConversations(token, "public_channel,private_channel,mpim,im", MAX_LIST_LIMIT);
    rememberConversations(directory, conversations);
    await hydrateUnknownPeople(token, directory);
    await lookupByEmail(token, directory, value);
    await writeDirectory(directory);

    const learned = lookupTarget(directory, value);
    if (learned.people.length > 1) throw ambiguousPersonError(value, learned.people);
    if (learned.channel) return learned.channel.id;
    if (learned.people[0]?.dm_channel) return learned.people[0].dm_channel as string;
    if (learned.people[0]) return await openDirectMessage(token, directory, learned.people[0]);

    throw new Error(
        `Could not resolve "${value}" to a conversation or person you know. Run \`who --refresh\` to re-read the workspace, or \`list --query ${value.replace(/^[#@]/, "")}\` to find the ID.`,
    );
}

// ---------------------------------------------------------------------------
// Directory — remembered people and conversations, so names never need guessing
// ---------------------------------------------------------------------------

export interface Person {
    id: string;
    handle?: string;
    display_name?: string;
    real_name?: string;
    email?: string;
    dm_channel?: string;
    is_bot?: boolean;
    first_seen: string;
    last_seen: string;
    last_pulled?: string;
    last_sent?: string;
    /** Set when users.info could not name this ID — stops a deleted user or a missing
     *  `users:read` scope from re-firing a failing lookup on every future pull. */
    lookup_failed_at?: string;
}

export interface ChannelRecord {
    id: string;
    name?: string;
    kind: "channel" | "private" | "group" | "im" | "unknown";
    user?: string;
    first_seen: string;
    last_seen: string;
    last_pulled?: string;
    last_sent?: string;
}

export interface Directory {
    version: number;
    updated_at: string;
    people: Record<string, Person>;
    channels: Record<string, ChannelRecord>;
}

export function emptyDirectory(): Directory {
    return { version: DIRECTORY_VERSION, updated_at: new Date().toISOString(), people: {}, channels: {} };
}

export function isUserId(value: string): boolean {
    return /^[UW][A-Z0-9]{6,}$/.test(value);
}

function kindFromId(id: string): ChannelRecord["kind"] {
    if (id.startsWith("D")) return "im";
    if (id.startsWith("G")) return "group";
    if (id.startsWith("C")) return "channel";
    return "unknown";
}

/** Every string this person can be called by, lowercased. */
export function personAliases(person: Partial<Person>): string[] {
    const aliases = new Set<string>();
    for (const candidate of [person.id, person.handle, person.display_name, person.real_name, person.email]) {
        const value = String(candidate ?? "").trim().toLowerCase();
        if (value) aliases.add(value);
    }
    const email = String(person.email ?? "").trim().toLowerCase();
    if (email.includes("@")) aliases.add(email.split("@")[0]);
    return [...aliases];
}

export function personName(person: Partial<Person> | undefined): string {
    if (!person) return "unknown";
    return person.display_name || person.real_name || person.handle || person.email || person.id || "unknown";
}

/** Merge what we just learned about someone into the directory. Never forgets a known field. */
export function rememberPerson(directory: Directory, patch: Partial<Person> & { id?: string }): Person | undefined {
    const id = String(patch.id ?? "").trim();
    if (!isUserId(id)) return undefined;
    const now = new Date().toISOString();
    const existing = directory.people[id];
    const person: Person = {
        ...(existing || { id, first_seen: now }),
        ...pruneEmpty(patch),
        id,
        last_seen: now,
    };
    directory.people[id] = person;
    return person;
}

export function rememberChannel(directory: Directory, patch: Partial<ChannelRecord> & { id: string }): ChannelRecord {
    const now = new Date().toISOString();
    const existing = directory.channels[patch.id];
    const record: ChannelRecord = {
        ...(existing || { id: patch.id, kind: kindFromId(patch.id), first_seen: now }),
        ...pruneEmpty(patch),
        id: patch.id,
        last_seen: now,
    };
    directory.channels[patch.id] = record;
    return record;
}

export function rememberConversations(directory: Directory, conversations: Conversation[]): void {
    for (const entry of conversations) {
        if (!entry?.id) continue;
        rememberChannel(directory, {
            id: entry.id,
            name: entry.name,
            kind: entry.is_im ? "im" : entry.is_private ? "private" : kindFromId(entry.id),
            user: entry.is_im ? entry.user : undefined,
        });
        if (entry.is_im && entry.user) rememberPerson(directory, { id: entry.user, dm_channel: entry.id });
    }
}

export function rememberMessageAuthors(directory: Directory, messages: Array<Record<string, unknown>>): void {
    for (const message of messages) {
        const user = String(message?.user ?? "").trim();
        if (isUserId(user)) rememberPerson(directory, { id: user });
    }
}

/** Records a pull/send against the conversation and, for a DM, against the person too. */
export function touchConversation(directory: Directory, channelId: string, field: "last_pulled" | "last_sent"): void {
    const now = new Date().toISOString();
    rememberChannel(directory, { id: channelId, [field]: now } as Partial<ChannelRecord> & { id: string });
    for (const person of Object.values(directory.people)) {
        if (person.dm_channel === channelId) rememberPerson(directory, { id: person.id, [field]: now });
    }
}

/** Resolve a human-typed name against memory. Scans records, so nothing goes stale. */
export function lookupTarget(directory: Directory, value: string): { channel?: ChannelRecord; people: Person[] } {
    const raw = value.trim().toLowerCase();
    const wanted = raw.replace(/^[#@]/, "");
    if (!wanted) return { people: [] };

    const channels = Object.values(directory.channels);
    const channel =
        channels.find((entry) => entry.id.toLowerCase() === wanted) ||
        (raw.startsWith("@") ? undefined : channels.find((entry) => (entry.name || "").toLowerCase() === wanted));

    const exact = Object.values(directory.people).filter((person) => personAliases(person).includes(wanted));
    const people = exact.length
        ? exact
        : Object.values(directory.people).filter((person) =>
              personAliases(person).some((alias) => alias.includes(wanted)),
          );

    return { channel, people };
}

function ambiguousPersonError(value: string, people: Person[]): Error {
    const candidates = people
        .slice(0, 8)
        .map((person) => `${personName(person)} (${person.id})`)
        .join(", ");
    return new Error(
        `"${value}" matches ${people.length} people: ${candidates}. Nothing was pulled or sent — re-run with the user ID or a more specific name.`,
    );
}

export function describeConversation(directory: Directory, entry: Conversation): string {
    if (entry.is_im) {
        const person = entry.user ? directory.people[entry.user] : undefined;
        return `@${person ? personName(person) : entry.user || entry.id}`;
    }
    return entry.name ? `#${entry.name}` : entry.id;
}

export function describeChannelId(directory: Directory, channelId: string): string {
    const record = directory.channels[channelId];
    if (!record) return channelId;
    if (record.kind === "im") {
        const person = record.user ? directory.people[record.user] : Object.values(directory.people).find((p) => p.dm_channel === channelId);
        return `@${person ? personName(person) : record.user || channelId}`;
    }
    return record.name ? `#${record.name}` : channelId;
}

export function namesForMessages(directory: Directory, messages: Array<Record<string, unknown>>): Record<string, string> {
    const names: Record<string, string> = {};
    for (const message of messages) {
        const user = String(message?.user ?? "").trim();
        if (!isUserId(user)) continue;
        const person = directory.people[user];
        const known = person?.display_name || person?.real_name || person?.handle || person?.email;
        names[user] = known ? personName(person) : "unresolved";
    }
    return names;
}

export function describeDirectory(directory: Directory, query?: string): Record<string, unknown> {
    const wanted = query?.trim().toLowerCase();
    const matches = (haystack: string[]) => !wanted || haystack.some((value) => value.toLowerCase().includes(wanted));
    return {
        updatedAt: directory.updated_at,
        people: Object.values(directory.people)
            .filter((person) => matches(personAliases(person)))
            .sort((a, b) => (b.last_sent || b.last_pulled || b.last_seen).localeCompare(a.last_sent || a.last_pulled || a.last_seen))
            .map((person) => ({
                id: person.id,
                name: personName(person),
                handle: person.handle,
                email: person.email,
                dm: person.dm_channel,
                lastPulled: person.last_pulled,
                lastSent: person.last_sent,
            })),
        channels: Object.values(directory.channels)
            .filter((entry) => entry.kind !== "im" && matches([entry.name || "", entry.id]))
            .sort((a, b) => (b.last_pulled || b.last_seen).localeCompare(a.last_pulled || a.last_seen))
            .map((entry) => ({
                id: entry.id,
                name: entry.name ? `#${entry.name}` : entry.id,
                kind: entry.kind,
                lastPulled: entry.last_pulled,
                lastSent: entry.last_sent,
            })),
    };
}

/** Seeds from slack-file-sender's contact cache so known people carry over on first run. */
export function seedFromContacts(directory: Directory, contacts: unknown): void {
    const entries = (contacts as { contacts?: Record<string, Record<string, string>> })?.contacts;
    if (!entries || typeof entries !== "object") return;
    for (const contact of Object.values(entries)) {
        rememberPerson(directory, {
            id: contact?.user_id,
            handle: contact?.slack_name,
            display_name: contact?.display_name,
            real_name: contact?.real_name,
            email: contact?.email,
        });
    }
}

export function normalizeDirectory(value: unknown): Directory {
    const parsed = value as Partial<Directory> | null;
    const directory = emptyDirectory();
    if (!parsed || typeof parsed !== "object") return directory;
    if (parsed.people && typeof parsed.people === "object") {
        for (const [id, person] of Object.entries(parsed.people)) {
            if (isUserId(id) && person && typeof person === "object") directory.people[id] = { ...(person as Person), id };
        }
    }
    if (parsed.channels && typeof parsed.channels === "object") {
        for (const [id, channel] of Object.entries(parsed.channels)) {
            if (channel && typeof channel === "object") directory.channels[id] = { ...(channel as ChannelRecord), id };
        }
    }
    return directory;
}

function pruneEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""),
    ) as Partial<T>;
}

function directoryFile(): string {
    return process.env.SLACK_USER_DIRECTORY_FILE || DEFAULT_DIRECTORY_FILE;
}

async function readDirectory(): Promise<Directory> {
    const file = directoryFile();
    const raw = await fs
        .readFile(file, "utf8")
        .catch((error: { code?: string }) => (error?.code === "ENOENT" ? null : Promise.reject(error)));
    if (raw) return normalizeDirectory(parseJson(raw));

    const directory = emptyDirectory();
    const seed = await fs.readFile(CONTACTS_SEED_FILE, "utf8").catch(() => null);
    if (seed) seedFromContacts(directory, parseJson(seed));
    return directory;
}

async function writeDirectory(directory: Directory): Promise<void> {
    const file = directoryFile();
    directory.version = DIRECTORY_VERSION;
    directory.updated_at = new Date().toISOString();
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await fs.writeFile(file, `${JSON.stringify(directory, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.chmod(file, 0o600);
}

function parseJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/** Fills in names for user IDs we have only ever seen as IDs. Best-effort — never fatal. */
export function needsLookup(person: Person, now: number = Date.now()): boolean {
    if (person.display_name || person.real_name || person.handle) return false;
    if (!person.lookup_failed_at) return true;
    return now - Date.parse(person.lookup_failed_at) > LOOKUP_RETRY_MS;
}

async function hydrateUnknownPeople(token: string, directory: Directory): Promise<void> {
    const unknown = Object.values(directory.people).filter((person) => needsLookup(person)).slice(0, MAX_HYDRATE_LOOKUPS);
    for (const person of unknown) {
        const result = await callSlack(token, "users.info", { user: person.id }).catch(() => null);
        const user = result?.user as Record<string, any> | undefined;
        if (!user) {
            rememberPerson(directory, { id: person.id, lookup_failed_at: new Date().toISOString() });
            continue;
        }
        rememberPerson(directory, {
            id: person.id,
            handle: user.name,
            display_name: user.profile?.display_name || user.profile?.display_name_normalized,
            real_name: user.profile?.real_name || user.real_name,
            email: user.profile?.email,
            is_bot: Boolean(user.is_bot),
        });
    }
}

/** Last resort before failing: an email can be resolved directly if the token has users:read.email. */
async function lookupByEmail(token: string, directory: Directory, value: string): Promise<void> {
    if (!value.includes("@") || !value.includes(".")) return;
    const result = await callSlack(token, "users.lookupByEmail", { email: value.replace(/^@/, "") }).catch(() => null);
    const user = result?.user as Record<string, any> | undefined;
    if (!user?.id) return;
    rememberPerson(directory, {
        id: user.id,
        handle: user.name,
        display_name: user.profile?.display_name,
        real_name: user.profile?.real_name || user.real_name,
        email: user.profile?.email || value,
    });
}

/** Opens (or re-opens) the DM channel for someone we know. Opening notifies nobody. */
async function openDirectMessage(token: string, directory: Directory, person: Person): Promise<string> {
    const result = await callSlack(token, "conversations.open", { users: person.id, return_im: true });
    const channelId = String((result.channel as { id?: string } | undefined)?.id ?? "");
    if (!channelId) throw new Error(`Could not open a DM with ${personName(person)} (${person.id}).`);
    rememberPerson(directory, { id: person.id, dm_channel: channelId });
    rememberChannel(directory, { id: channelId, kind: "im", user: person.id });
    await writeDirectory(directory);
    return channelId;
}

/** Full re-read of the workspace: every conversation, every non-deleted human. */
async function refreshDirectory(token: string, directory: Directory): Promise<void> {
    rememberConversations(directory, await listConversations(token, "public_channel,private_channel,mpim,im", MAX_LIST_LIMIT));

    let cursor: string | undefined;
    let scanned = 0;
    do {
        const result = await callSlack(token, "users.list", { limit: 200, ...(cursor ? { cursor } : {}) });
        for (const user of (result.members as Array<Record<string, any>>) || []) {
            if (user.deleted) continue;
            rememberPerson(directory, {
                id: user.id,
                handle: user.name,
                display_name: user.profile?.display_name,
                real_name: user.profile?.real_name || user.real_name,
                email: user.profile?.email,
                is_bot: Boolean(user.is_bot),
            });
            scanned += 1;
        }
        cursor = (result.response_metadata as { next_cursor?: string } | undefined)?.next_cursor || undefined;
    } while (cursor && scanned < 5000);
}

async function callSlack(token: string, method: string, body?: Record<string, unknown>): Promise<Record<string, any>> {
    const response = await fetch(`${SLACK_API_URL}/${method}`, {
        method: body ? "POST" : "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15_000),
    });
    const result = (await response.json().catch(() => null)) as Record<string, any> | null;
    if (!response.ok) throw new Error(`Slack ${method} failed with HTTP ${response.status}`);
    if (!result?.ok) {
        const scope = result?.needed ? ` (needs scope: ${result.needed})` : "";
        throw new Error(`Slack ${method} failed: ${result?.error || "unknown_error"}${scope}`);
    }
    return result;
}

function usageText(): string {
    return [
        "Read Slack with a personal user token. Sending requires sending mode to be on.",
        "",
        "Usage:",
        "  SlackUser.ts auth",
        "  SlackUser.ts sending [status|on|off]",
        '  SlackUser.ts list [--types "public_channel,im"] [--query "eng"] [--limit 200]',
        '  SlackUser.ts pull --channel "#general" [--limit 100] [--oldest ts] [--latest ts] [--inclusive]',
        '  SlackUser.ts thread --channel "#general" --ts "1712345678.000100" [--limit 100]',
        '  SlackUser.ts send --channel "#general" --text "..." [--thread "1712345678.000100"]',
        '  SlackUser.ts who [--query "kenny"] [--refresh]',
        "",
        "--channel accepts a conversation ID (C…/D…/G…), a #name, an @person, a remembered name, or an email.",
        "People and conversations are remembered on every list/pull/send, so a name resolves without an API call next time.",
    ].join("\n");
}
