import { describe, expect, it } from "vitest";
import { assertPublicUrl, isBlockedIpv4, isBlockedIpv6 } from "./private-address";

describe("isBlockedIpv4", () => {
  it("blocks the cloud metadata endpoint", () => {
    // The single most important entry: reaching this hands over instance credentials.
    expect(isBlockedIpv4("169.254.169.254")).toBe(true);
  });

  it.each([
    ["loopback", "127.0.0.1"],
    ["this network", "0.0.0.0"],
    ["private class A", "10.1.2.3"],
    ["private class B, low", "172.16.0.1"],
    ["private class B, high", "172.31.255.254"],
    ["private class C", "192.168.1.1"],
    ["protocol assignments", "192.0.0.8"],
    ["carrier-grade NAT", "100.64.0.1"],
    ["benchmarking", "198.18.0.1"],
    ["multicast", "224.0.0.1"],
    ["reserved", "255.255.255.255"],
  ])("blocks %s", (_label, address) => {
    expect(isBlockedIpv4(address)).toBe(true);
  });

  it.each([["1.1.1.1"], ["8.8.8.8"], ["172.15.0.1"], ["172.32.0.1"], ["192.167.0.1"]])(
    "allows the public address %s",
    (address) => {
      expect(isBlockedIpv4(address)).toBe(false);
    },
  );

  it("treats anything that is not four octets as blocked", () => {
    // Failing closed: an address this cannot parse is one it cannot vouch for.
    expect(isBlockedIpv4("not-an-ip")).toBe(true);
    expect(isBlockedIpv4("1.2.3")).toBe(true);
    expect(isBlockedIpv4("1.2.3.999")).toBe(true);
  });
});

describe("isBlockedIpv6", () => {
  it.each([["::1"], ["::"], ["fc00::1"], ["fd12:3456::1"], ["fe80::1"], ["feb0::1"]])(
    "blocks %s",
    (address) => {
      expect(isBlockedIpv6(address)).toBe(true);
    },
  );

  it("sees through IPv4-mapped addresses", () => {
    // ::ffff:169.254.169.254 is the metadata endpoint wearing a v6 hat.
    expect(isBlockedIpv6("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedIpv6("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIpv6("::ffff:8.8.8.8")).toBe(false);
  });

  it("ignores a zone index", () => {
    expect(isBlockedIpv6("fe80::1%eth0")).toBe(true);
  });

  it("allows a public address", () => {
    expect(isBlockedIpv6("2606:4700:4700::1111")).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("refuses a non-http scheme", async () => {
    for (const raw of ["file:///etc/passwd", "gopher://example.com", "ftp://example.com"]) {
      expect(await assertPublicUrl(raw)).toEqual({
        reason: "Only http and https addresses can be checked.",
      });
    }
  });

  it("refuses something that is not a URL at all", async () => {
    expect(await assertPublicUrl("just some text")).toEqual({ reason: "That is not a valid URL." });
  });

  it("refuses a private literal address without resolving anything", async () => {
    expect(await assertPublicUrl("http://169.254.169.254/latest/meta-data/")).toEqual({
      reason: "That address is not reachable.",
    });
    expect(await assertPublicUrl("http://127.0.0.1:54321/rest/v1/")).toEqual({
      reason: "That address is not reachable.",
    });
    expect(await assertPublicUrl("http://[::1]:8080/")).toEqual({
      reason: "That address is not reachable.",
    });
  });

  it("refuses a hostname that does not resolve", async () => {
    const result = await assertPublicUrl("https://this-host-does-not-exist.invalid/");
    expect(result).toEqual({ reason: "That hostname does not resolve." });
  });

  it("allows a public literal address", async () => {
    const result = await assertPublicUrl("https://1.1.1.1/");
    expect("url" in result && result.url.hostname).toBe("1.1.1.1");
  });
});
