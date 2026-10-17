
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..", "..");

function loadPage(fileName) {
    const filePath = path.resolve(root, fileName);

    if (!fs.existsSync(filePath)) {
        throw new Error(`HTML file not found: ${filePath}`);
    }

    const html = fs.readFileSync(filePath, "utf8");
    return new JSDOM(html).window.document;
}

const pages = [
    { name: "index.html", filePath: path.join(root, "index.html") },
    { name: "watch.html", filePath: path.join(root, "watch.html") },
];

function isExternalURL(url) {
    return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url);
}

function resolveLocalPath(baseFile, url) {
    const pathname = decodeURIComponent(new URL(url, `file://${baseFile}`).pathname);
    return path.resolve(path.dirname(baseFile), pathname.replace(/^\/[A-Za-z]:/, ""));
}

function getResourcePath(baseFile, url) {
    const parsed = new URL(url, `file://${baseFile}`);

    if (parsed.protocol !== "file:") {
        return null;
    }

    return path.resolve(
        path.dirname(baseFile),
        decodeURIComponent(parsed.pathname.replace(/^\/([A-Za-z]:)/, "$1"))
    );
}

describe("HTML Bug Detection Tests", () => {
    let documents;

    beforeAll(() => {
        documents = pages.map(({ name, filePath }) => ({
            name,
            filePath,
            doc: loadPage(name),
        }));
    });

    // 1. Check basic document structure
    test.each([
        { name: "index.html" },
        { name: "watch.html" },
    ])("$name should have valid basic document structure", ({ name }) => {
        const doc = loadPage(name);

        expect(doc.documentElement.tagName).toBe("HTML");
        expect(doc.head).not.toBeNull();
        expect(doc.body).not.toBeNull();
        expect(doc.title.trim()).not.toBe("");
        expect(doc.querySelector("meta[charset]")).not.toBeNull();
    });

    // 2. Detect duplicate IDs
    test.each(pages)("$name should not contain duplicate IDs", ({ name }) => {
        const doc = loadPage(name);
        const ids = [...doc.querySelectorAll("[id]")].map(
            (element) => element.id
        );

        const duplicates = ids.filter(
            (id, index) => id && ids.indexOf(id) !== index
        );

        expect([...new Set(duplicates)]).toEqual([]);
    });

    // 3. Detect missing local CSS and JavaScript resources
    test.each(pages)(
        "$name should reference existing local CSS and JavaScript files",
        ({ name, filePath }) => {
            const doc = loadPage(name);

            const resources = [
                ...doc.querySelectorAll(
                    'link[rel~="stylesheet"][href], script[src]'
                ),
            ];

            const missingResources = resources
                .map((element) => ({
                    url:
                        element.getAttribute("href") ||
                        element.getAttribute("src"),
                }))
                .filter(({ url }) => {
                    if (!url || isExternalURL(url)) {
                        return false;
                    }

                    try {
                        const resourcePath = getResourcePath(filePath, url);
                        return resourcePath !== null && !fs.existsSync(resourcePath);
                    } catch {
                        return true;
                    }
                })
                .map(({ url }) => url);

            expect(missingResources).toEqual([]);
        }
    );

    // 4. Detect broken local page links and section anchors
    test.each(pages)(
        "$name should not contain broken local links or anchors",
        ({ name, filePath }) => {
            const doc = loadPage(name);
            const brokenLinks = [];

            for (const link of doc.querySelectorAll("a[href]")) {
                const href = link.getAttribute("href").trim();

                if (
                    !href ||
                    href === "#" ||
                    isExternalURL(href)
                ) {
                    continue;
                }

                try {
                    const currentURL = new URL(`file://${filePath}`);
                    const targetURL = new URL(href, currentURL);

                    if (targetURL.protocol !== "file:") {
                        continue;
                    }

                    const targetPath = path.resolve(
                        path.dirname(filePath),
                        decodeURIComponent(targetURL.pathname.replace(/^\/([A-Za-z]:)/, "$1"))
                    );

                    if (
                        targetPath !== root &&
                        !targetPath.startsWith(root + path.sep)
                    ) {
                        brokenLinks.push(href);
                        continue;
                    }

                    if (!fs.existsSync(targetPath)) {
                        brokenLinks.push(href);
                        continue;
                    }

                    if (targetURL.hash) {
                        const targetId = decodeURIComponent(
                            targetURL.hash.slice(1)
                        );

                        if (targetPath.endsWith(".html")) {
                            const targetDoc =
                                path.resolve(targetPath) === path.resolve(filePath)
                                    ? doc
                                    : loadPage(path.relative(root, targetPath));

                            const hasId = targetDoc.getElementById(targetId);
                            const hasNamedAnchor = [
                                ...targetDoc.querySelectorAll("a[name]"),
                            ].some((anchor) => anchor.name === targetId);

                            if (!hasId && !hasNamedAnchor) {
                                brokenLinks.push(href);
                            }
                        }
                    }
                } catch {
                    brokenLinks.push(href);
                }
            }

            expect(brokenLinks).toEqual([]);
        }
    );

    // 5. Detect empty links
    test.each(pages)("$name should not contain empty links", ({ name }) => {
        const doc = loadPage(name);

        const emptyLinks = [...doc.querySelectorAll("a")].filter((link) => {
            const href = link.getAttribute("href");

            if (href === null || href.trim() === "") {
                return true;
            }

            const hasText = link.textContent.trim().length > 0;
            const hasAccessibleImage = [
                ...link.querySelectorAll("img"),
            ].some((img) => img.getAttribute("alt")?.trim());

            const hasAccessibleLabel =
                Boolean(link.getAttribute("aria-label")?.trim()) ||
                Boolean(link.getAttribute("title")?.trim());

            const hasSVGTitle = [
                ...link.querySelectorAll("svg title"),
            ].some((title) => title.textContent.trim());

            return !(
                hasText ||
                hasAccessibleImage ||
                hasAccessibleLabel ||
                hasSVGTitle
            );
        });

        expect(emptyLinks.map((link) => link.outerHTML)).toEqual([]);
    });

    // 6. Check same-page section anchors
    test.each(pages)(
        "$name should not reference missing same-page sections",
        ({ name }) => {
            const doc = loadPage(name);
            const brokenAnchors = [];

            for (const link of doc.querySelectorAll('a[href^="#"]')) {
                const href = link.getAttribute("href");

                if (href === "#") continue;

                let id;

                try {
                    id = decodeURIComponent(href.slice(1));
                } catch {
                    brokenAnchors.push(href);
                    continue;
                }

                const hasId = doc.getElementById(id);
                const hasNamedAnchor = [
                    ...doc.querySelectorAll("a[name]"),
                ].some((anchor) => anchor.name === id);

                if (!hasId && !hasNamedAnchor) {
                    brokenAnchors.push(href);
                }
            }

            expect(brokenAnchors).toEqual([]);
        }
    );

    // 7. Check image alt attributes
    test.each(pages)(
        "$name should provide alt attributes for images",
        ({ name }) => {
            const doc = loadPage(name);

            const imagesWithoutAlt = [
                ...doc.querySelectorAll("img:not([alt])"),
            ];

            expect(imagesWithoutAlt.map((img) => img.outerHTML)).toEqual([]);
        }
    );

    // 8. Check main page sections
    test("index.html should contain its main sections", () => {
        const doc = loadPage("index.html");

        for (const id of [
            "hero",
            "cont",
            "newGrid",
            "collection",
            "world",
            "worldGrid",
        ]) {
            expect(doc.getElementById(id)).not.toBeNull();
        }
    });

    // 9. Check watch page player and movie information
    test("watch.html should contain its player and movie information", () => {
        const doc = loadPage("watch.html");

        for (const id of [
            "player",
            "servers",
            "fTitle",
            "fYear",
            "fGenre",
            "fSyn",
        ]) {
            expect(doc.getElementById(id)).not.toBeNull();
        }
    });

    // 10. Check navigation between pages
    test("index.html should link to watch.html", () => {
        const doc = loadPage("index.html");

        const hasWatchLink = [...doc.querySelectorAll("a[href]")].some(
            (link) => {
                const href = link.getAttribute("href");
                if (!href || isExternalURL(href)) return false;

                try {
                    return path.basename(new URL(href, `file://${pages[0].filePath}`).pathname) === "watch.html";
                } catch {
                    return false;
                }
            }
        );

        expect(hasWatchLink).toBe(true);
    });

    test("watch.html should link back to index.html", () => {
        const doc = loadPage("watch.html");

        const hasHomeLink = [...doc.querySelectorAll("a[href]")].some(
            (link) => {
                const href = link.getAttribute("href");
                if (!href || isExternalURL(href)) return false;

                try {
                    return path.basename(new URL(href, `file://${pages[1].filePath}`).pathname) === "index.html";
                } catch {
                    return false;
                }
            }
        );

        expect(hasHomeLink).toBe(true);
    });
});
