/**
 * Decodes a JWT and checks if it is expired or will expire within 5 minutes.
 * @param token The JWT string
 * @returns true if expired, invalid, or expiring soon
 */
export const isTokenExpired = (token: string | null | undefined): boolean => {
  if (!token || typeof token !== "string") return true;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    // Decode the payload (base64url to string)
    // Handle standard base64 as well by replacing -_ with +/
    const base64Url = parts[1]!;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    const payload = JSON.parse(jsonPayload) as { exp?: number };

    if (!payload.exp) return true; // Treat tokens without expiry as invalid for safety

    // Calculate time left in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = payload.exp - currentTime;

    // Buffer of 5 minutes (300 seconds) to prevent edge cases during requests
    return timeLeft <= 300;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return true; // If anything fails, assume it's invalid/expired
  }
};
