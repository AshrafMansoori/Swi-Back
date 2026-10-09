import jwt from "jsonwebtoken";

export const authenticateSocket = (request) => {
    const cookies = Object.fromEntries(
        (request.headers.cookie || "")
            .split(";")
            .map((cookie) => cookie.trim())
            .filter(Boolean)
            .map((cookie) => {
                const separator = cookie.indexOf("=");
                return separator < 0
                    ? [cookie, ""]
                    : [
                          cookie.slice(0, separator),
                          decodeURIComponent(cookie.slice(separator + 1)),
                      ];
            })
    );
    const authorization = request.headers.authorization || "";
    const token =
        cookies.accessToken ||
        (authorization.startsWith("Bearer ")
            ? authorization.slice("Bearer ".length)
            : "");

    if (!token) {
        throw new Error("Authentication required");
    }

    const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
    );

    if (!decodedToken?._id) {
        throw new Error("Invalid access token");
    }

    return decodedToken._id.toString();
};