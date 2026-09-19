import { describe, expect, test } from "bun:test";

import {
    conversationLabel,
    describeChannelId,
    describeDirectory,
    emptyDirectory,
    extractUserToken,
    isConversationId,
    lookupTarget,
    namesForMessages,
    needsLookup,
    normalizeDirectory,
    parseOptions,
    personAliases,
    personName,
    rememberConversations,
    rememberMessageAuthors,
    rememberPerson,
    seedFromContacts,
    touchConversation,
    validateUserToken,
} from "./SlackUser";

describe("token handling", () => {
    test("reads and validates a personal Slack token", () => {
        expect(extractUserToken("SLACK_USER_TOKEN='xoxp-example'\n")).toBe("xoxp-example");
        expect(extractUserToken("export SLACK_USER_TOKEN=xoxp-example")).toBe("xoxp-example");
        expect(extractUserToken("OTHER_KEY=value\n")).toBeUndefined();
        expect(validateUserToken("  xoxp-example  ")).toBe("xoxp-example");
    });

    test("rejects bot tokens and empty values", () => {
        expect(() => validateUserToken("xoxb-example")).toThrow(/user token/);
        expect(() => validateUserToken("")).toThrow(/missing/);
    });
});

describe("sending gate", () => {
    test("parses guarded sending mode commands", () => {
        expect(parseOptions(["sending"])).toEqual({ command: "sending", mode: "status" });
        expect(parseOptions(["sending", "on"])).toEqual({ command: "sending", mode: "on" });
        expect(parseOptions(["sending", "off"])).toEqual({ command: "sending", mode: "off" });
        expect(() => parseOptions(["sending", "enable"])).toThrow(/sending on/);
    });
});

describe("command parsing", () => {
    test("parses message pulls", () => {
        expect(parseOptions(["pull", "--channel", "D123", "--limit", "3", "--inclusive"])).toEqual({
            command: "pull",
            channel: "D123",
            limit: 3,
            oldest: undefined,
            latest: undefined,
            inclusive: true,
        });
    });

    test("rejects pull flags on sends and send flags on pulls", () => {
        expect(() => parseOptions(["send", "--channel", "D123", "--text", "Hello", "--limit", "3"])).toThrow(/only accepts/);
        expect(() => parseOptions(["pull", "--channel", "D123", "--text", "Hello"])).toThrow(/does not accept/);
    });

    test("thread requires --ts and rejects --thread", () => {
        expect(parseOptions(["thread", "--channel", "C123456", "--ts", "1712345678.000100"])).toMatchObject({
            command: "thread",
            ts: "1712345678.000100",
        });
        expect(() => parseOptions(["thread", "--channel", "C123456"])).toThrow(/--ts is required/);
        expect(() => parseOptions(["thread", "--channel", "C123456", "--thread", "1.1"])).toThrow(/uses --ts/);
    });

    test("help short-circuits any command", () => {
        expect(parseOptions(["pull", "--help"])).toEqual({ command: "help" });
        expect(parseOptions([])).toEqual({ command: "help" });
        expect(() => parseOptions(["nuke"])).toThrow(/Unknown Slack command/);
    });

    test("list defaults to all conversation types", () => {
        expect(parseOptions(["list"])).toEqual({
            command: "list",
            types: "public_channel,private_channel,mpim,im",
            query: undefined,
            limit: 200,
        });
    });

    test("rejects unknown flags and missing values", () => {
        expect(() => parseOptions(["pull", "--channel"])).toThrow(/Missing value/);
        expect(() => parseOptions(["pull", "--bogus", "x"])).toThrow(/Unknown option/);
        expect(() => parseOptions(["pull", "--channel", "C1", "--limit", "0"])).toThrow(/between 1 and 100/);
    });
});

describe("channel resolution helpers", () => {
    test("recognizes raw conversation IDs", () => {
        expect(isConversationId("C0123456789")).toBe(true);
        expect(isConversationId("D0123456789")).toBe(true);
        expect(isConversationId("#general")).toBe(false);
        expect(isConversationId("general")).toBe(false);
    });

    test("labels channels and DMs distinctly", () => {
        expect(conversationLabel({ id: "C1", name: "general" })).toBe("#general");
        expect(conversationLabel({ id: "D1", is_im: true, user: "U9" })).toBe("@U9");
        expect(conversationLabel({ id: "C2" })).toBe("C2");
    });
});

describe("directory memory", () => {
    test("who is parsed with its own flags", () => {
        expect(parseOptions(["who"])).toEqual({ command: "who", query: undefined, refresh: false });
        expect(parseOptions(["who", "--query", "kenny", "--refresh"])).toEqual({
            command: "who",
            query: "kenny",
            refresh: true,
        });
        expect(() => parseOptions(["who", "--channel", "C1"])).toThrow(/only accepts/);
        expect(() => parseOptions(["pull", "--channel", "C1", "--refresh"])).toThrow(/only valid on who/);
    });

    test("remembers a person and merges later facts without losing earlier ones", () => {
        const directory = emptyDirectory();
        rememberPerson(directory, { id: "U0123456", email: "sam@example.com" });
        rememberPerson(directory, { id: "U0123456", handle: "sam", display_name: "Sam R" });
        expect(directory.people.U0123456).toMatchObject({
            id: "U0123456",
            email: "sam@example.com",
            handle: "sam",
            display_name: "Sam R",
        });
        expect(personName(directory.people.U0123456)).toBe("Sam R");
    });

    test("ignores values that are not user IDs", () => {
        const directory = emptyDirectory();
        expect(rememberPerson(directory, { id: "C0123456" })).toBeUndefined();
        expect(rememberPerson(directory, { id: "" })).toBeUndefined();
        expect(Object.keys(directory.people)).toHaveLength(0);
    });

    test("learns DM channels from a conversation list", () => {
        const directory = emptyDirectory();
        rememberConversations(directory, [
            { id: "C0000001", name: "product-eng", is_channel: true },
            { id: "D0000001", is_im: true, user: "U0123456" },
        ]);
        expect(directory.people.U0123456.dm_channel).toBe("D0000001");
        expect(directory.channels.C0000001.name).toBe("product-eng");
        expect(directory.channels.D0000001.kind).toBe("im");
    });

    test("resolves a remembered name, handle, email, and email local-part to the same person", () => {
        const directory = emptyDirectory();
        rememberPerson(directory, {
            id: "U0123456",
            handle: "sam",
            display_name: "Sam R",
            email: "sam.rivera@example.com",
            dm_channel: "D0000001",
        });
        for (const value of ["sam", "@sam", "Sam R", "sam.rivera@example.com", "sam.rivera", "U0123456"]) {
            expect(lookupTarget(directory, value).people[0]?.id).toBe("U0123456");
        }
    });

    test("reports ambiguity instead of picking a person", () => {
        const directory = emptyDirectory();
        rememberPerson(directory, { id: "U0000001", display_name: "Dylan Ngo" });
        rememberPerson(directory, { id: "U0000002", display_name: "Dylan Tran" });
        expect(lookupTarget(directory, "dylan").people).toHaveLength(2);
        rememberPerson(directory, { id: "U0000003", handle: "dylan" });
        expect(lookupTarget(directory, "dylan").people.map((person) => person.id)).toEqual(["U0000003"]);
    });

    test("prefers a channel for #name and a person for @name", () => {
        const directory = emptyDirectory();
        rememberConversations(directory, [{ id: "C0000001", name: "dylan", is_channel: true }]);
        rememberPerson(directory, { id: "U0000001", handle: "dylan", dm_channel: "D0000001" });
        expect(lookupTarget(directory, "#dylan").channel?.id).toBe("C0000001");
        expect(lookupTarget(directory, "@dylan").channel).toBeUndefined();
        expect(lookupTarget(directory, "@dylan").people[0]?.dm_channel).toBe("D0000001");
    });

    test("records pulls and sends against both the conversation and the DM partner", () => {
        const directory = emptyDirectory();
        rememberConversations(directory, [{ id: "D0000001", is_im: true, user: "U0123456" }]);
        touchConversation(directory, "D0000001", "last_sent");
        expect(directory.channels.D0000001.last_sent).toBeTruthy();
        expect(directory.people.U0123456.last_sent).toBeTruthy();
        expect(directory.people.U0123456.last_pulled).toBeUndefined();
    });

    test("names message authors and flags the ones it does not know", () => {
        const directory = emptyDirectory();
        rememberPerson(directory, { id: "U0000001", display_name: "Sam R" });
        const messages = [{ user: "U0000001", text: "hi" }, { user: "U0000009", text: "who am i" }, { text: "join" }];
        rememberMessageAuthors(directory, messages);
        expect(namesForMessages(directory, messages)).toEqual({ U0000001: "Sam R", U0000009: "unresolved" });
        expect(directory.people.U0000009).toBeDefined();
    });

    test("describes a channel ID as a name once it is known", () => {
        const directory = emptyDirectory();
        rememberConversations(directory, [
            { id: "C0000001", name: "product-eng", is_channel: true },
            { id: "D0000001", is_im: true, user: "U0000001" },
        ]);
        rememberPerson(directory, { id: "U0000001", display_name: "Sam R" });
        expect(describeChannelId(directory, "C0000001")).toBe("#product-eng");
        expect(describeChannelId(directory, "D0000001")).toBe("@Sam R");
        expect(describeChannelId(directory, "C9999999")).toBe("C9999999");
    });

    test("seeds from the slack-file-sender contact cache", () => {
        const directory = emptyDirectory();
        seedFromContacts(directory, {
            contacts: {
                "kenny@avada.io": { email: "kenny@avada.io", user_id: "U01NCB7NX6F", slack_name: "kenny" },
                broken: { email: "nobody@example.com" },
            },
        });
        expect(lookupTarget(directory, "kenny").people[0]?.id).toBe("U01NCB7NX6F");
        expect(Object.keys(directory.people)).toHaveLength(1);
    });

    test("stops re-looking-up an ID Slack could not name, until the retry window passes", () => {
        const directory = emptyDirectory();
        const unnamed = rememberPerson(directory, { id: "U0000009" })!;
        expect(needsLookup(unnamed)).toBe(true);

        const failed = rememberPerson(directory, { id: "U0000009", lookup_failed_at: new Date().toISOString() })!;
        expect(needsLookup(failed)).toBe(false);
        expect(needsLookup(failed, Date.now() + 8 * 24 * 60 * 60 * 1000)).toBe(true);

        const named = rememberPerson(directory, { id: "U0000009", display_name: "Sam R" })!;
        expect(needsLookup(named)).toBe(false);
    });

    test("survives a corrupt or empty directory file", () => {
        expect(normalizeDirectory(null).people).toEqual({});
        expect(normalizeDirectory("nonsense").channels).toEqual({});
        expect(normalizeDirectory({ people: { notauser: { id: "notauser" } } }).people).toEqual({});
    });

    test("filters the directory listing by query", () => {
        const directory = emptyDirectory();
        rememberPerson(directory, { id: "U0000001", display_name: "Sam R", handle: "sam" });
        rememberPerson(directory, { id: "U0000002", display_name: "Kenny", handle: "kenny" });
        rememberConversations(directory, [{ id: "C0000001", name: "product-eng", is_channel: true }]);
        const filtered = describeDirectory(directory, "kenny") as { people: unknown[]; channels: unknown[] };
        expect(filtered.people).toHaveLength(1);
        expect(filtered.channels).toHaveLength(0);
        expect(personAliases({ id: "U1", email: "a.b@example.com" })).toContain("a.b");
    });
});
